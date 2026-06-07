<?php
/**
 * Inventory route registration planner tests.
 *
 * @package TCGStorePlatform
 */

namespace TCGStorePlatform\Tests\Unit;

use TCGStorePlatform\Api\V1\InventoryCapabilityPermissionCallbackAdapter;
use TCGStorePlatform\Api\V1\InventoryController;
use TCGStorePlatform\Api\V1\InventoryPublicReadPermissionCallbackAdapter;
use TCGStorePlatform\Api\V1\InventoryRouteContracts;
use TCGStorePlatform\Api\V1\InventoryRoutePermissionCallbackFactory;
use TCGStorePlatform\Api\V1\InventoryRouteRegistrationPlanner;
use TCGStorePlatform\Api\V1\OfflineRestRequestData;
use TCGStorePlatform\Tests\TestCase;

final class InventoryRouteRegistrationPlannerTest extends TestCase {
	public function test_inventory_routes_remain_disabled_without_callback_factory(): void {
		$planner = new InventoryRouteRegistrationPlanner();
		$plans   = $planner->planned_registration_args();

		$this->assert_same( 16, count( $plans ) );
		$this->assert_same( array(), $planner->enabled_registration_args() );

		foreach ( $plans as $plan ) {
			$this->assert_false( $plan['should_register'] );
			$this->assert_false( $plan['permission_callback_ready'] );
			$this->assert_false( $plan['controller_callback_ready'] );
			$this->assert_same( null, $plan['controller_callback'] );
			$this->assert_same( '__return_false', $plan['permission_callback'] );
			$this->assert_true( $plan['route_registration_deferred'] );
			$this->assert_true( $plan['route_connected_reads_deferred'] );
			$this->assert_true( $plan['route_connected_writes_deferred'] );
			$this->assert_true( in_array( 'route_disabled_by_default', $plan['registration_block_reasons'], true ) );
			$this->assert_true( in_array( 'route_registration_deferred', $plan['registration_block_reasons'], true ) );
			$this->assert_true( in_array( 'permission_callback_not_ready', $plan['registration_block_reasons'], true ) );
			$this->assert_true( in_array( 'controller_callback_not_ready', $plan['registration_block_reasons'], true ) );
		}
	}

	public function test_permission_factory_maps_inventory_capabilities_and_public_reads(): void {
		$factory   = new InventoryRoutePermissionCallbackFactory(
			static fn ( string $capability ): bool => in_array( $capability, array( 'create_inventory', 'view_inventory' ), true ),
			true
		);
		$callbacks = $factory->callbacks_for_contracts();
		$create    = $callbacks['POST /inventory'];
		$search    = $callbacks['GET /inventory/search'];

		$this->assert_true( $create instanceof InventoryCapabilityPermissionCallbackAdapter );
		$this->assert_same( 'create_inventory', $create->capability() );
		$this->assert_true( $create->authorize() );

		$this->assert_true( $search instanceof InventoryPublicReadPermissionCallbackAdapter );
		$this->assert_same( 'public_or_staff_inventory_fields', $search->permission() );
		$this->assert_same( 'view_inventory', $search->fallback_capability() );
		$this->assert_true( $search->public_reads_enabled() );
		$this->assert_true( $search->authorize() );
	}

	public function test_public_routes_stay_locked_when_public_reads_and_capabilities_are_unconfigured(): void {
		$plans  = ( new InventoryRouteRegistrationPlanner(
			new InventoryRoutePermissionCallbackFactory()
		) )->planned_registration_args();
		$search = $plans['GET /inventory/search'];

		$this->assert_same( '__return_false', $search['permission_callback'] );
		$this->assert_false( $search['permission_callback_ready'] );
		$this->assert_true( in_array( 'permission_callback_not_ready', $search['registration_block_reasons'], true ) );
	}

	public function test_controller_dispatches_injected_inventory_handler(): void {
		$controller = new InventoryController(
			null,
			array(
				'search_inventory_items' => static function ( OfflineRestRequestData $request ): array {
					return array(
						'status' => 'ready',
						'query'  => $request->query_params()['q'] ?? '',
					);
				},
			)
		);

		$response = $controller->search_inventory_items(
			array(
				'query' => array(
					'q' => 'charizard',
				),
			)
		);

		$this->assert_same( 'ready', $response['status'] );
		$this->assert_same( 'charizard', $response['query'] );

		$disabled = $controller->create_inventory_item( array() );

		$this->assert_same( 'disabled', $disabled['status'] );
		$this->assert_same( 'inventory_route_disabled', $disabled['code'] );
		$this->assert_true( $disabled['route_connected_writes_deferred'] );
	}

	public function test_planner_requires_injected_handlers_for_controller_readiness(): void {
		$plans = ( new InventoryRouteRegistrationPlanner(
			new InventoryRoutePermissionCallbackFactory( static fn (): bool => true, true ),
			new InventoryController()
		) )->planned_registration_args();

		foreach ( $plans as $plan ) {
			$this->assert_false( $plan['controller_callback_ready'] );
			$this->assert_same( null, $plan['controller_callback'] );
			$this->assert_true( in_array( 'controller_callback_not_ready', $plan['registration_block_reasons'], true ) );
		}
	}

	public function test_future_inventory_search_route_can_register_when_public_read_gates_are_clear(): void {
		$plans = $this->planner( true )->planned_registration_args(
			$this->future_enabled_route(
				'/inventory/search',
				'GET',
				array(
					'route_connected_reads_deferred' => false,
				)
			)
		);
		$plan  = $plans['GET /inventory/search'];

		$this->assert_true( $plan['should_register'] );
		$this->assert_same( array(), $plan['registration_block_reasons'] );
		$this->assert_true( is_callable( $plan['controller_callback'] ) );
		$this->assert_true( $plan['permission_callback'] instanceof InventoryPublicReadPermissionCallbackAdapter );
	}

	public function test_future_inventory_create_route_stays_blocked_until_write_gate_is_clear(): void {
		$blocked = $this->planner()->planned_registration_args(
			$this->future_enabled_route( '/inventory', 'POST' )
		);
		$plan    = $blocked['POST /inventory'];

		$this->assert_false( $plan['should_register'] );
		$this->assert_true( in_array( 'route_connected_writes_deferred', $plan['registration_block_reasons'], true ) );

		$ready = $this->planner()->planned_registration_args(
			$this->future_enabled_route(
				'/inventory',
				'POST',
				array(
					'route_connected_writes_deferred' => false,
				)
			)
		);

		$this->assert_true( $ready['POST /inventory']['should_register'] );
		$this->assert_same( array(), $ready['POST /inventory']['registration_block_reasons'] );
	}

	public function test_external_principal_routes_stay_locked_until_device_or_owner_permissions_exist(): void {
		$plans = $this->planner()->planned_registration_args(
			$this->future_enabled_route(
				'/inventory/(?P<inventory_id>\d+)/reserve',
				'POST',
				array(
					'route_connected_writes_deferred' => false,
				)
			)
		);
		$plan  = $plans['POST /inventory/(?P<inventory_id>\d+)/reserve'];

		$this->assert_false( $plan['should_register'] );
		$this->assert_same( '__return_false', $plan['permission_callback'] );
		$this->assert_true( in_array( 'permission_callback_not_ready', $plan['registration_block_reasons'], true ) );
	}

	private function planner( bool $public_read_routes_enabled = false ): InventoryRouteRegistrationPlanner {
		return new InventoryRouteRegistrationPlanner(
			new InventoryRoutePermissionCallbackFactory( static fn (): bool => true, $public_read_routes_enabled ),
			new InventoryController( null, $this->handlers_for_all_routes() )
		);
	}

	/**
	 * @return array<string, callable(OfflineRestRequestData): array<string, string>>
	 */
	private function handlers_for_all_routes(): array {
		$handlers = array();

		foreach ( InventoryRouteContracts::route_contracts() as $route ) {
			$handlers[ $route['callback'] ] = static fn ( OfflineRestRequestData $request ): array => array(
				'status'   => 'ready',
				'callback' => (string) ( $request->query_params()['callback'] ?? '' ),
			);
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
