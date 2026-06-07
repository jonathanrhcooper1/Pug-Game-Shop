<?php
/**
 * POS/payment route registrar tests.
 *
 * @package TCGStorePlatform
 */

namespace TCGStorePlatform\Tests\Unit;

use TCGStorePlatform\Api\V1\PosPaymentCapabilityPermissionCallbackAdapter;
use TCGStorePlatform\Api\V1\PosPaymentController;
use TCGStorePlatform\Api\V1\PosPaymentRouteContracts;
use TCGStorePlatform\Api\V1\PosPaymentRoutePermissionCallbackFactory;
use TCGStorePlatform\Api\V1\PosPaymentRouteRegistrar;
use TCGStorePlatform\Api\V1\PosPaymentRouteRegistrationPlanner;
use TCGStorePlatform\Api\V1\PosPaymentWebhookPermissionCallbackAdapter;
use TCGStorePlatform\Tests\TestCase;

final class PosPaymentRouteRegistrarTest extends TestCase {
	public function test_registrar_does_not_register_disabled_default_pos_payment_routes(): void {
		$calls     = array();
		$registrar = new PosPaymentRouteRegistrar(
			$this->planner(),
			static function ( string $namespace, string $route, array $args ) use ( &$calls ): bool {
				$calls[] = array( $namespace, $route, $args );

				return true;
			}
		);

		$this->assert_same( 0, $registrar->register_enabled_routes() );
		$this->assert_same( array(), $calls );
	}

	public function test_registrar_registers_only_future_enabled_and_ready_read_route_plans(): void {
		$calls     = array();
		$registrar = new PosPaymentRouteRegistrar(
			$this->planner(),
			static function ( string $namespace, string $route, array $args ) use ( &$calls ): bool {
				$calls[] = array(
					'namespace' => $namespace,
					'route'     => $route,
					'args'      => $args,
				);

				return true;
			}
		);

		$this->assert_same( 1, $registrar->register_enabled_routes( $this->future_enabled_fee_review_route() ) );
		$this->assert_same( 1, count( $calls ) );
		$this->assert_same( 'tcg-store/v1', $calls[0]['namespace'] );
		$this->assert_same( '/payments/fee-snapshots', $calls[0]['route'] );
		$this->assert_same( 'GET', $calls[0]['args']['methods'] );
		$this->assert_true( is_callable( $calls[0]['args']['callback'] ) );
		$this->assert_true( $calls[0]['args']['permission_callback'] instanceof PosPaymentCapabilityPermissionCallbackAdapter );
	}

	public function test_registrar_does_not_register_live_flagged_routes_without_ready_permission_callbacks(): void {
		$calls     = array();
		$registrar = new PosPaymentRouteRegistrar(
			new PosPaymentRouteRegistrationPlanner( null, $this->controller() ),
			static function ( string $namespace, string $route, array $args ) use ( &$calls ): bool {
				$calls[] = array( $namespace, $route, $args );

				return true;
			}
		);

		$this->assert_same( 0, $registrar->register_enabled_routes( $this->future_enabled_fee_review_route() ) );
		$this->assert_same( array(), $calls );
	}

	public function test_registrar_does_not_register_live_flagged_routes_without_injected_handlers(): void {
		$calls     = array();
		$registrar = new PosPaymentRouteRegistrar(
			new PosPaymentRouteRegistrationPlanner(
				new PosPaymentRoutePermissionCallbackFactory( static fn (): bool => true ),
				new PosPaymentController()
			),
			static function ( string $namespace, string $route, array $args ) use ( &$calls ): bool {
				$calls[] = array( $namespace, $route, $args );

				return true;
			}
		);

		$this->assert_same( 0, $registrar->register_enabled_routes( $this->future_enabled_fee_review_route() ) );
		$this->assert_same( array(), $calls );
	}

	public function test_registrar_does_not_register_future_write_route_while_write_deferral_remains(): void {
		$calls     = array();
		$registrar = new PosPaymentRouteRegistrar(
			$this->planner(),
			static function ( string $namespace, string $route, array $args ) use ( &$calls ): bool {
				$calls[] = array( $namespace, $route, $args );

				return true;
			}
		);

		$this->assert_same( 0, $registrar->register_enabled_routes( $this->future_enabled_pos_ingest_route() ) );
		$this->assert_same( array(), $calls );
	}

	public function test_registrar_registers_future_write_route_after_write_deferral_is_cleared(): void {
		$calls     = array();
		$registrar = new PosPaymentRouteRegistrar(
			$this->planner(),
			static function ( string $namespace, string $route, array $args ) use ( &$calls ): bool {
				$calls[] = array(
					'namespace' => $namespace,
					'route'     => $route,
					'args'      => $args,
				);

				return true;
			}
		);

		$this->assert_same(
			1,
			$registrar->register_enabled_routes(
				$this->future_enabled_pos_ingest_route(
					array(
						'route_connected_writes_deferred' => false,
					)
				)
			)
		);
		$this->assert_same( '/pos/events', $calls[0]['route'] );
		$this->assert_same( 'POST', $calls[0]['args']['methods'] );
	}

	public function test_registrar_registers_future_webhook_route_after_signature_and_webhook_gates_are_ready(): void {
		$calls     = array();
		$registrar = new PosPaymentRouteRegistrar(
			$this->planner( static fn (): bool => true, static fn (): bool => true ),
			static function ( string $namespace, string $route, array $args ) use ( &$calls ): bool {
				$calls[] = array(
					'namespace' => $namespace,
					'route'     => $route,
					'args'      => $args,
				);

				return true;
			}
		);

		$this->assert_same(
			1,
			$registrar->register_enabled_routes(
				$this->future_enabled_webhook_route(
					array(
						'route_connected_writes_deferred' => false,
						'webhook_registration_deferred'   => false,
					)
				)
			)
		);
		$this->assert_same( '/payments/webhooks/(?P<provider>[a-zA-Z0-9_-]+)', $calls[0]['route'] );
		$this->assert_true( $calls[0]['args']['permission_callback'] instanceof PosPaymentWebhookPermissionCallbackAdapter );
	}

	private function planner(
		?callable $capability_checker = null,
		?callable $webhook_signature_verifier = null
	): PosPaymentRouteRegistrationPlanner {
		return new PosPaymentRouteRegistrationPlanner(
			new PosPaymentRoutePermissionCallbackFactory(
				$capability_checker ?? static fn (): bool => true,
				$webhook_signature_verifier
			),
			$this->controller()
		);
	}

	private function controller(): PosPaymentController {
		return new PosPaymentController( null, $this->handlers_for_all_routes() );
	}

	/**
	 * @return array<string, callable(): array<string, string>>
	 */
	private function handlers_for_all_routes(): array {
		$handlers = array();

		foreach ( PosPaymentRouteContracts::route_contracts() as $route ) {
			$handlers[ $route['callback'] ] = static fn (): array => array( 'status' => 'ready' );
		}

		return $handlers;
	}

	/**
	 * @param array<string, mixed> $overrides Route overrides.
	 * @return list<array<string, mixed>>
	 */
	private function future_enabled_fee_review_route( array $overrides = array() ): array {
		return $this->future_enabled_route( '/payments/fee-snapshots', 'GET', $overrides );
	}

	/**
	 * @param array<string, mixed> $overrides Route overrides.
	 * @return list<array<string, mixed>>
	 */
	private function future_enabled_pos_ingest_route( array $overrides = array() ): array {
		return $this->future_enabled_route( '/pos/events', 'POST', $overrides );
	}

	/**
	 * @param array<string, mixed> $overrides Route overrides.
	 * @return list<array<string, mixed>>
	 */
	private function future_enabled_webhook_route( array $overrides = array() ): array {
		return $this->future_enabled_route( '/payments/webhooks/(?P<provider>[a-zA-Z0-9_-]+)', 'POST', $overrides );
	}

	/**
	 * @param array<string, mixed> $overrides Route overrides.
	 * @return list<array<string, mixed>>
	 */
	private function future_enabled_route( string $path, string $method, array $overrides = array() ): array {
		$routes = PosPaymentRouteContracts::route_contracts();

		foreach ( $routes as $index => $route ) {
			$routes[ $index ]['live_enabled_by_default']     = $path === $route['path'] && $method === $route['method'];
			$routes[ $index ]['route_registration_deferred'] = ! $routes[ $index ]['live_enabled_by_default'];

			if ( $routes[ $index ]['live_enabled_by_default'] ) {
				$routes[ $index ]['route_connected_reads_deferred'] = 'GET' === $method ? false : true;
				$routes[ $index ] = array_merge( $routes[ $index ], $overrides );
			}
		}

		return $routes;
	}
}
