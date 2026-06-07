<?php
/**
 * POS/payment route dependency factory tests.
 *
 * @package TCGStorePlatform
 */

namespace TCGStorePlatform\Tests\Unit;

use TCGStorePlatform\Api\V1\OfflineRestRequestData;
use TCGStorePlatform\Api\V1\PosPaymentCapabilityPermissionCallbackAdapter;
use TCGStorePlatform\Api\V1\PosPaymentRouteDependencyFactory;
use TCGStorePlatform\Api\V1\PosPaymentWebhookPermissionCallbackAdapter;
use TCGStorePlatform\Tests\TestCase;

final class PosPaymentRouteDependencyFactoryTest extends TestCase {
	public function test_default_factory_reports_blocked_dependency_state_without_live_routes(): void {
		$summary = ( new PosPaymentRouteDependencyFactory() )->readiness_summary();

		$this->assert_false( $summary['configured'] );
		$this->assert_true( $summary['route_dependency_factory_ready'] );
		$this->assert_same( 8, $summary['route_contract_count'] );
		$this->assert_same( 8, $summary['controller_handler_count'] );
		$this->assert_true( $summary['controller_handlers_configured'] );
		$this->assert_same( 0, $summary['permission_callback_count'] );
		$this->assert_same( 7, $summary['capability_permission_route_count'] );
		$this->assert_false( $summary['capability_permission_callbacks_configured'] );
		$this->assert_same( 1, $summary['webhook_route_count'] );
		$this->assert_false( $summary['webhook_signature_verifier_configured'] );
		$this->assert_false( $summary['webhook_permission_callbacks_configured'] );
		$this->assert_true( $summary['registration_planner_ready'] );
		$this->assert_true( $summary['registrar_ready'] );
		$this->assert_true( $summary['bootstrapper_ready'] );
		$this->assert_same( 0, $summary['registerable_route_count'] );
		$this->assert_true( $summary['route_registration_deferred'] );
		$this->assert_true( $summary['route_connected_reads_deferred'] );
		$this->assert_true( $summary['route_connected_writes_deferred'] );
		$this->assert_true( $summary['transaction_execution_deferred'] );
		$this->assert_true( $summary['provider_capture_deferred'] );
		$this->assert_true( $summary['provider_inventory_write_deferred'] );
		$this->assert_true( $summary['webhook_registration_deferred'] );
		$this->assert_true( $summary['woocommerce_gateway_capture_deferred'] );
		$this->assert_false( $summary['route_connected_reads_ready'] );
		$this->assert_false( $summary['route_connected_writes_ready'] );
		$this->assert_same(
			array(
				'pos_payment_capability_permission_callbacks_not_configured',
				'pos_payment_webhook_signature_verifier_not_configured',
			),
			$summary['configuration_issues']
		);
	}

	public function test_configured_factory_assembles_controller_permissions_registrar_and_bootstrapper(): void {
		$factory = new PosPaymentRouteDependencyFactory(
			null,
			$this->handlers_for_all_routes(),
			static fn (): bool => true,
			static fn (): bool => true,
			static fn (): bool => true
		);
		$summary = $factory->readiness_summary();

		$this->assert_true( $factory->is_configured() );
		$this->assert_true( $summary['configured'] );
		$this->assert_same( 8, $summary['controller_handler_count'] );
		$this->assert_true( $summary['controller_handlers_configured'] );
		$this->assert_same( 8, $summary['permission_callback_count'] );
		$this->assert_true( $summary['capability_permission_callbacks_configured'] );
		$this->assert_true( $summary['webhook_signature_verifier_configured'] );
		$this->assert_true( $summary['webhook_permission_callbacks_configured'] );
		$this->assert_same( 0, $summary['registerable_route_count'] );
		$this->assert_true( $summary['route_registration_deferred'] );
		$this->assert_true( $summary['route_connected_reads_deferred'] );
		$this->assert_true( $summary['route_connected_writes_deferred'] );
		$this->assert_same( array(), $summary['configuration_issues'] );
		$this->assert_true( $factory->controller()->has_handler( 'ingest_pos_event' ) );
		$this->assert_true( $factory->controller()->has_handler( 'receive_payment_provider_webhook' ) );
		$this->assert_same( 0, $factory->registrar()->register_enabled_routes() );
		$this->assert_same( 'gated', $factory->bootstrapper()->bootstrap( true )['status'] );
	}

	public function test_factory_bootstrapper_uses_injected_dependencies_for_future_ready_routes(): void {
		$calls   = array();
		$factory = new PosPaymentRouteDependencyFactory(
			null,
			$this->handlers_for_all_routes(),
			static fn (): bool => true,
			static fn (): bool => true,
			static function ( string $namespace, string $route, array $args ) use ( &$calls ): bool {
				$calls[] = array(
					'namespace' => $namespace,
					'route'     => $route,
					'args'      => $args,
				);

				return true;
			}
		);
		$result  = $factory->bootstrapper()->bootstrap( true, $this->future_enabled_fee_review_route() );

		$this->assert_same( 'ready', $result['status'] );
		$this->assert_same( 1, $result['registered_route_count'] );
		$this->assert_same( array( 'GET /payments/fee-snapshots' ), $result['registered_route_keys'] );
		$this->assert_false( $result['registration_deferred'] );
		$this->assert_same( 1, count( $calls ) );
		$this->assert_same( '/payments/fee-snapshots', $calls[0]['route'] );
		$this->assert_same( 'GET', $calls[0]['args']['methods'] );
		$this->assert_true( is_callable( $calls[0]['args']['callback'] ) );
		$this->assert_true( is_callable( $calls[0]['args']['permission_callback'] ) );
	}

	public function test_default_controller_uses_parser_only_validation_handlers(): void {
		$response = ( new PosPaymentRouteDependencyFactory() )->controller()->run_pos_reconciliation(
			array(
				'body' => array(
					'provider' => 'square-sandbox',
				),
			)
		);

		$this->assert_same( 'validated', $response['status'] );
		$this->assert_true( $response['data']['reconciliation_deferred'] );
		$this->assert_true( $response['data']['route_connected_writes_deferred'] );
	}

	public function test_factory_controller_dispatches_injected_handler_without_live_writes(): void {
		$response = ( new PosPaymentRouteDependencyFactory(
			null,
			array(
				'ingest_pos_event' => static function ( OfflineRestRequestData $data ): array {
					$body = $data->body_params();

					return array(
						'status'                  => 'validated',
						'provider_event_id'       => (string) ( $body['provider_event_id'] ?? '' ),
						'route_connected_writes_deferred' => true,
					);
				},
			)
		) )->controller()->ingest_pos_event(
			array(
				'body' => array(
					'provider_event_id' => 'evt-pos-144',
				),
			)
		);

		$this->assert_same( 'validated', $response['status'] );
		$this->assert_same( 'evt-pos-144', $response['provider_event_id'] );
		$this->assert_true( $response['route_connected_writes_deferred'] );
	}

	public function test_permission_factory_builds_expected_callback_types_when_dependencies_exist(): void {
		$callbacks = ( new PosPaymentRouteDependencyFactory(
			null,
			array(),
			static fn (): bool => true,
			static fn (): bool => true
		) )->permission_callback_factory()->callbacks_for_contracts();

		$this->assert_true( $callbacks['POST /pos/events'] instanceof PosPaymentCapabilityPermissionCallbackAdapter );
		$this->assert_true(
			$callbacks['POST /payments/webhooks/(?P<provider>[a-zA-Z0-9_-]+)'] instanceof PosPaymentWebhookPermissionCallbackAdapter
		);
	}

	/**
	 * @return array<string, callable(OfflineRestRequestData): array<string, mixed>>
	 */
	private function handlers_for_all_routes(): array {
		$callbacks = array(
			'ingest_pos_event',
			'get_pos_event_status',
			'run_pos_reconciliation',
			'list_pos_reconciliation_conflicts',
			'resolve_pos_reconciliation_conflict',
			'receive_payment_provider_webhook',
			'list_payment_fee_snapshots',
			'create_payment_fee_snapshot',
		);

		return array_fill_keys(
			$callbacks,
			static fn (): array => array(
				'status'                          => 'ready',
				'route_connected_writes_deferred' => true,
			)
		);
	}

	/**
	 * @return list<array<string, mixed>>
	 */
	private function future_enabled_fee_review_route(): array {
		$routes = \TCGStorePlatform\Api\V1\PosPaymentRouteContracts::route_contracts();

		foreach ( $routes as $index => $route ) {
			$is_target                                     = '/payments/fee-snapshots' === $route['path']
				&& 'GET' === $route['method'];
			$routes[ $index ]['live_enabled_by_default']     = $is_target;
			$routes[ $index ]['route_registration_deferred'] = ! $is_target;
			$routes[ $index ]['route_connected_reads_deferred'] = ! $is_target;
		}

		return $routes;
	}
}
