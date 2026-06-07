<?php
/**
 * POS/payment route readiness planner tests.
 *
 * @package TCGStorePlatform
 */

namespace TCGStorePlatform\Tests\Unit;

use TCGStorePlatform\Api\V1\PosPaymentRouteReadinessPlanner;
use TCGStorePlatform\Api\V1\PosPaymentRoutePermissionCallbackFactory;
use TCGStorePlatform\Tests\TestCase;

final class PosPaymentRouteReadinessPlannerTest extends TestCase {
	public function test_default_readiness_reports_blocked_routes_and_safety_deferrals(): void {
		$plan    = ( new PosPaymentRouteReadinessPlanner() )->plan( false );
		$summary = $plan['route_registration_summary']['POST /pos/events'];

		$this->assert_same( 'blocked', $plan['status'] );
		$this->assert_false( $plan['feature_enabled'] );
		$this->assert_same( 8, $plan['planned_route_count'] );
		$this->assert_same( 0, $plan['registerable_route_count'] );
		$this->assert_false( $plan['should_register_routes'] );
		$this->assert_true( $plan['registration_deferred'] );
		$this->assert_same(
			array( 'pos_payments_feature_disabled', 'no_registerable_pos_payment_routes' ),
			$plan['route_readiness_block_reasons']
		);
		$this->assert_false( $plan['route_handlers_configured'] );
		$this->assert_false( $plan['permission_callbacks_configured'] );
		$this->assert_false( $plan['route_transaction_executor_configured'] );
		$this->assert_true( $plan['route_registration_deferred'] );
		$this->assert_true( $plan['route_connected_writes_deferred'] );
		$this->assert_true( $plan['transaction_execution_deferred'] );
		$this->assert_true( $plan['provider_capture_deferred'] );
		$this->assert_true( $plan['provider_inventory_write_deferred'] );
		$this->assert_true( $plan['webhook_registration_deferred'] );
		$this->assert_true( $plan['woocommerce_gateway_capture_deferred'] );
		$this->assert_true( $plan['production_safety_ready'] );
		$this->assert_same( '/pos/events', $summary['path'] );
		$this->assert_false( $summary['should_register'] );
		$this->assert_true( in_array( 'route_disabled_by_default', $summary['registration_block_reasons'], true ) );
		$this->assert_true( in_array( 'route_registration_deferred', $summary['registration_block_reasons'], true ) );
		$this->assert_true( in_array( 'route_handlers_not_configured', $summary['registration_block_reasons'], true ) );
		$this->assert_true( in_array( 'permission_callbacks_not_configured', $summary['registration_block_reasons'], true ) );
		$this->assert_true( in_array( 'route_connected_writes_deferred', $summary['registration_block_reasons'], true ) );
		$this->assert_true( in_array( 'transaction_execution_deferred', $summary['registration_block_reasons'], true ) );
		$this->assert_true( in_array( 'provider_capture_deferred', $summary['safety_block_reasons'], true ) );
		$this->assert_true( in_array( 'production_provider_credentials_disabled', $summary['safety_block_reasons'], true ) );
	}

	public function test_feature_enabled_readiness_stays_gated_until_routes_are_registerable(): void {
		$plan = ( new PosPaymentRouteReadinessPlanner() )->plan( true );

		$this->assert_same( 'gated', $plan['status'] );
		$this->assert_true( $plan['feature_enabled'] );
		$this->assert_same( 8, $plan['planned_route_count'] );
		$this->assert_same( 0, $plan['registerable_route_count'] );
		$this->assert_same( array( 'no_registerable_pos_payment_routes' ), $plan['route_readiness_block_reasons'] );
		$this->assert_true( $plan['registration_deferred'] );
	}

	public function test_future_read_only_route_can_become_registerable_when_dependencies_are_ready(): void {
		$plan = ( new PosPaymentRouteReadinessPlanner() )->plan(
			true,
			array( $this->future_read_only_contract() ),
			array(
				'route_handlers_configured'       => true,
				'permission_callbacks_configured' => true,
			)
		);

		$this->assert_same( 'ready', $plan['status'] );
		$this->assert_true( $plan['should_register_routes'] );
		$this->assert_false( $plan['registration_deferred'] );
		$this->assert_same( 1, $plan['registerable_route_count'] );
		$this->assert_same( array( 'GET /payments/fee-snapshots' ), $plan['registerable_route_keys'] );
		$this->assert_same( array(), $plan['route_readiness_block_reasons'] );
		$this->assert_true( $plan['route_registration_summary']['GET /payments/fee-snapshots']['should_register'] );
	}

	public function test_future_write_route_requires_transaction_executor_and_cleared_write_deferrals(): void {
		$plan = ( new PosPaymentRouteReadinessPlanner() )->plan(
			true,
			array( $this->future_write_contract( true ) ),
			array(
				'route_handlers_configured'       => true,
				'permission_callbacks_configured' => true,
			)
		);
		$route = $plan['route_registration_summary']['POST /pos/reconciliation/run'];

		$this->assert_same( 'gated', $plan['status'] );
		$this->assert_false( $route['should_register'] );
		$this->assert_true( in_array( 'route_connected_writes_deferred', $route['registration_block_reasons'], true ) );
		$this->assert_true( in_array( 'transaction_execution_deferred', $route['registration_block_reasons'], true ) );
		$this->assert_true( in_array( 'route_transaction_executor_not_configured', $route['registration_block_reasons'], true ) );

		$ready = ( new PosPaymentRouteReadinessPlanner() )->plan(
			true,
			array( $this->future_write_contract( false ) ),
			array(
				'route_handlers_configured'             => true,
				'permission_callbacks_configured'       => true,
				'route_transaction_executor_configured' => true,
			)
		);

		$this->assert_same( 'ready', $ready['status'] );
		$this->assert_true( $ready['route_registration_summary']['POST /pos/reconciliation/run']['should_register'] );
	}

	public function test_provider_webhook_route_requires_verifier_even_when_other_dependencies_are_ready(): void {
		$plan = ( new PosPaymentRouteReadinessPlanner() )->plan(
			true,
			array( $this->future_webhook_contract() ),
			array(
				'route_handlers_configured'             => true,
				'permission_callbacks_configured'       => true,
				'route_transaction_executor_configured' => true,
			)
		);
		$route = $plan['route_registration_summary']['POST /payments/webhooks/(?P<provider>[a-zA-Z0-9_-]+)'];

		$this->assert_same( 'gated', $plan['status'] );
		$this->assert_false( $route['should_register'] );
		$this->assert_true( in_array( 'webhook_verifier_not_configured', $route['registration_block_reasons'], true ) );

		$ready = ( new PosPaymentRouteReadinessPlanner() )->plan(
			true,
			array( $this->future_webhook_contract() ),
			array(
				'route_handlers_configured'             => true,
				'permission_callbacks_configured'       => true,
				'route_transaction_executor_configured' => true,
				'webhook_verifier_configured'           => true,
			)
		);

		$this->assert_same( 'ready', $ready['status'] );
		$this->assert_true(
			$ready['route_registration_summary']['POST /payments/webhooks/(?P<provider>[a-zA-Z0-9_-]+)']['should_register']
		);
	}

	public function test_readiness_can_use_injected_permission_factory_for_callbacks_and_webhook_verifier(): void {
		$plan = ( new PosPaymentRouteReadinessPlanner(
			new PosPaymentRoutePermissionCallbackFactory(
				static fn (): bool => true,
				static fn (): bool => true
			)
		) )->plan(
			true,
			array( $this->future_webhook_contract() ),
			array(
				'route_handlers_configured'             => true,
				'route_transaction_executor_configured' => true,
			)
		);

		$this->assert_same( 'ready', $plan['status'] );
		$this->assert_true( $plan['permission_callbacks_configured'] );
		$this->assert_same( 1, $plan['permission_callback_count'] );
		$this->assert_same(
			array( 'POST /payments/webhooks/(?P<provider>[a-zA-Z0-9_-]+)' ),
			$plan['permission_callback_keys']
		);
		$this->assert_true( $plan['webhook_verifier_configured'] );
		$this->assert_true(
			$plan['route_registration_summary']['POST /payments/webhooks/(?P<provider>[a-zA-Z0-9_-]+)']['permission_callback_ready']
		);
		$this->assert_true(
			$plan['route_registration_summary']['POST /payments/webhooks/(?P<provider>[a-zA-Z0-9_-]+)']['webhook_verifier_ready']
		);
	}

	/**
	 * @return array<string, mixed>
	 */
	private function future_read_only_contract(): array {
		return $this->contract(
			'/payments/fee-snapshots',
			'GET',
			'list_payment_fee_snapshots',
			'manage_settings',
			'payment_fee_review',
			false
		);
	}

	/**
	 * @return array<string, mixed>
	 */
	private function future_write_contract( bool $deferred ): array {
		return $this->contract(
			'/pos/reconciliation/run',
			'POST',
			'run_pos_reconciliation',
			'manage_pos',
			'pos_reconciliation',
			$deferred
		);
	}

	/**
	 * @return array<string, mixed>
	 */
	private function future_webhook_contract(): array {
		return $this->contract(
			'/payments/webhooks/(?P<provider>[a-zA-Z0-9_-]+)',
			'POST',
			'receive_payment_provider_webhook',
			'signed_provider_webhook',
			'payment_webhook_ingestion',
			false
		);
	}

	/**
	 * @return array<string, mixed>
	 */
	private function contract(
		string $path,
		string $method,
		string $callback,
		string $permission,
		string $workflow,
		bool $deferred
	): array {
		return array(
			'namespace'                         => 'tcg-store/v1',
			'path'                              => $path,
			'method'                            => $method,
			'callback'                          => $callback,
			'permission'                        => $permission,
			'workflow'                          => $workflow,
			'live_enabled_by_default'           => true,
			'route_registration_deferred'       => false,
			'route_connected_writes_deferred'   => $deferred,
			'transaction_execution_deferred'    => $deferred,
			'provider_capture_deferred'         => true,
			'provider_inventory_write_deferred' => true,
			'webhook_registration_deferred'     => false,
			'woocommerce_gateway_capture_deferred' => true,
		);
	}
}
