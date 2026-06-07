<?php
/**
 * Inventory route runtime configurator tests.
 *
 * @package TCGStorePlatform
 */

namespace TCGStorePlatform\Tests\Unit;

use TCGStorePlatform\Api\V1\InventoryRoutePermissionCallbackFactory;
use TCGStorePlatform\Api\V1\InventoryRouteRuntimeConfigurator;
use TCGStorePlatform\Tests\TestCase;

final class InventoryRouteRuntimeConfiguratorTest extends TestCase {
	public function test_default_runtime_settings_keep_inventory_search_contract_locked(): void {
		$configurator = new InventoryRouteRuntimeConfigurator();
		$contracts    = $configurator->route_contracts( array() );
		$search       = $this->find_route( $contracts, 'GET /inventory/search' );

		$this->assert_false( $search['live_enabled_by_default'] );
		$this->assert_false( $configurator->public_read_routes_enabled( array() ) );
		$this->assert_false( $configurator->route_connected_reads_enabled( array() ) );
		$this->assert_false( $configurator->route_connected_writes_enabled( array() ) );
	}

	public function test_staff_search_runtime_settings_clear_read_route_deferrals_only_for_search(): void {
		$configurator = new InventoryRouteRuntimeConfigurator();
		$contracts    = $configurator->route_contracts(
			array(
				'staff_search_route_enabled'  => true,
				'public_search_route_enabled' => true,
			)
		);
		$search       = $this->find_route( $contracts, 'GET /inventory/search' );
		$list         = $this->find_route( $contracts, 'GET /inventory' );

		$this->assert_true( $search['live_enabled_by_default'] );
		$this->assert_false( $search['route_registration_deferred'] );
		$this->assert_false( $search['route_connected_reads_deferred'] );
		$this->assert_true( $search['route_connected_writes_deferred'] );
		$this->assert_true( $search['woocommerce_projection_deferred'] );
		$this->assert_true( $search['square_inventory_projection_deferred'] );
		$this->assert_true( $search['label_print_deferred'] );
		$this->assert_false( $list['live_enabled_by_default'] );
		$this->assert_true(
			$configurator->public_read_routes_enabled(
				array(
					'staff_search_route_enabled'  => true,
					'public_search_route_enabled' => true,
				)
			)
		);
		$this->assert_true( $configurator->route_connected_reads_enabled( array( 'staff_search_route_enabled' => true ) ) );
	}

	public function test_staff_create_runtime_settings_clear_write_route_deferrals_only_for_create(): void {
		$configurator = new InventoryRouteRuntimeConfigurator();
		$contracts    = $configurator->route_contracts(
			array(
				'staff_create_route_enabled' => true,
			)
		);
		$create       = $this->find_route( $contracts, 'POST /inventory' );
		$search       = $this->find_route( $contracts, 'GET /inventory/search' );
		$update       = $this->find_route( $contracts, 'PUT /inventory/(?P<inventory_id>\d+)' );

		$this->assert_true( $create['live_enabled_by_default'] );
		$this->assert_false( $create['route_registration_deferred'] );
		$this->assert_true( $create['route_connected_reads_deferred'] );
		$this->assert_false( $create['route_connected_writes_deferred'] );
		$this->assert_true( $create['woocommerce_projection_deferred'] );
		$this->assert_true( $create['square_inventory_projection_deferred'] );
		$this->assert_true( $create['label_print_deferred'] );
		$this->assert_false( $search['live_enabled_by_default'] );
		$this->assert_false( $update['live_enabled_by_default'] );
		$this->assert_true( $configurator->route_connected_writes_enabled( array( 'staff_create_route_enabled' => true ) ) );
		$this->assert_false( $configurator->route_connected_reads_enabled( array( 'staff_create_route_enabled' => true ) ) );
	}

	/**
	 * @param list<array<string, mixed>> $routes Route contracts.
	 * @return array<string, mixed>
	 */
	private function find_route( array $routes, string $route_key ): array {
		foreach ( $routes as $route ) {
			if ( $route_key === InventoryRoutePermissionCallbackFactory::route_key( $route ) ) {
				return $route;
			}
		}

		return array();
	}
}
