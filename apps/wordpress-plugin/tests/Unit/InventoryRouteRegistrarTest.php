<?php
/**
 * Inventory route registrar tests.
 *
 * @package TCGStorePlatform
 */

namespace TCGStorePlatform\Tests\Unit;

use TCGStorePlatform\Api\V1\InventoryCapabilityPermissionCallbackAdapter;
use TCGStorePlatform\Api\V1\InventoryController;
use TCGStorePlatform\Api\V1\InventoryPublicReadPermissionCallbackAdapter;
use TCGStorePlatform\Api\V1\InventoryRouteContracts;
use TCGStorePlatform\Api\V1\InventoryRoutePermissionCallbackFactory;
use TCGStorePlatform\Api\V1\InventoryRouteRegistrar;
use TCGStorePlatform\Api\V1\InventoryRouteRegistrationPlanner;
use TCGStorePlatform\Api\V1\OfflineRestRequestData;
use TCGStorePlatform\Tests\TestCase;

final class InventoryRouteRegistrarTest extends TestCase {
	public function test_registrar_does_not_register_disabled_default_inventory_routes(): void {
		$calls     = array();
		$registrar = new InventoryRouteRegistrar(
			$this->planner(),
			static function ( string $namespace, string $route, array $args ) use ( &$calls ): bool {
				$calls[] = array( $namespace, $route, $args );

				return true;
			}
		);

		$this->assert_same( 0, $registrar->register_enabled_routes() );
		$this->assert_same( array(), $calls );
	}

	public function test_registrar_registers_future_enabled_inventory_search_route(): void {
		$calls     = array();
		$registrar = new InventoryRouteRegistrar(
			$this->planner( true ),
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
				$this->future_enabled_route(
					'/inventory/search',
					'GET',
					array(
						'route_connected_reads_deferred' => false,
					)
				)
			)
		);
		$this->assert_same( 'tcg-store/v1', $calls[0]['namespace'] );
		$this->assert_same( '/inventory/search', $calls[0]['route'] );
		$this->assert_same( 'GET', $calls[0]['args']['methods'] );
		$this->assert_true( is_callable( $calls[0]['args']['callback'] ) );
		$this->assert_true( $calls[0]['args']['permission_callback'] instanceof InventoryPublicReadPermissionCallbackAdapter );
	}

	public function test_registrar_registers_future_enabled_inventory_create_route(): void {
		$calls     = array();
		$registrar = new InventoryRouteRegistrar(
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
				$this->future_enabled_route(
					'/inventory',
					'POST',
					array(
						'route_connected_writes_deferred' => false,
					)
				)
			)
		);
		$this->assert_same( '/inventory', $calls[0]['route'] );
		$this->assert_same( 'POST', $calls[0]['args']['methods'] );
		$this->assert_true( $calls[0]['args']['permission_callback'] instanceof InventoryCapabilityPermissionCallbackAdapter );
	}

	public function test_registrar_does_not_register_without_ready_permission_or_handler(): void {
		$calls = array();

		$without_permission = new InventoryRouteRegistrar(
			new InventoryRouteRegistrationPlanner( null, $this->controller() ),
			static function ( string $namespace, string $route, array $args ) use ( &$calls ): bool {
				$calls[] = array( $namespace, $route, $args );

				return true;
			}
		);

		$this->assert_same(
			0,
			$without_permission->register_enabled_routes(
				$this->future_enabled_route(
					'/inventory',
					'POST',
					array(
						'route_connected_writes_deferred' => false,
					)
				)
			)
		);

		$without_handler = new InventoryRouteRegistrar(
			new InventoryRouteRegistrationPlanner(
				new InventoryRoutePermissionCallbackFactory( static fn (): bool => true ),
				new InventoryController()
			),
			static function ( string $namespace, string $route, array $args ) use ( &$calls ): bool {
				$calls[] = array( $namespace, $route, $args );

				return true;
			}
		);

		$this->assert_same(
			0,
			$without_handler->register_enabled_routes(
				$this->future_enabled_route(
					'/inventory',
					'POST',
					array(
						'route_connected_writes_deferred' => false,
					)
				)
			)
		);
		$this->assert_same( array(), $calls );
	}

	private function planner( bool $public_read_routes_enabled = false ): InventoryRouteRegistrationPlanner {
		return new InventoryRouteRegistrationPlanner(
			new InventoryRoutePermissionCallbackFactory( static fn (): bool => true, $public_read_routes_enabled ),
			$this->controller()
		);
	}

	private function controller(): InventoryController {
		return new InventoryController( null, $this->handlers_for_all_routes() );
	}

	/**
	 * @return array<string, callable(OfflineRestRequestData): array<string, string>>
	 */
	private function handlers_for_all_routes(): array {
		$handlers = array();

		foreach ( InventoryRouteContracts::route_contracts() as $route ) {
			$handlers[ $route['callback'] ] = static fn (): array => array( 'status' => 'ready' );
		}

		return $handlers;
	}

	/**
	 * @param array<string, mixed> $overrides Route overrides.
	 * @return list<array<string, mixed>>
	 */
	private function future_enabled_route( string $path, string $method, array $overrides = array() ): array {
		$routes = InventoryRouteContracts::route_contracts();

		foreach ( $routes as $index => $route ) {
			$routes[ $index ]['live_enabled_by_default']     = $path === $route['path'] && $method === $route['method'];
			$routes[ $index ]['route_registration_deferred'] = ! $routes[ $index ]['live_enabled_by_default'];

			if ( $routes[ $index ]['live_enabled_by_default'] ) {
				$routes[ $index ]['route_connected_reads_deferred']  = 'GET' === $method ? false : true;
				$routes[ $index ]['route_connected_writes_deferred'] = 'GET' === $method ? true : true;
				$routes[ $index ]                                  = array_merge( $routes[ $index ], $overrides );
			}
		}

		return $routes;
	}
}
