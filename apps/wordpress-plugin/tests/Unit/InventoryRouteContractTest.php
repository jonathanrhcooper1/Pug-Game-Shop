<?php
/**
 * Inventory REST route contract tests.
 *
 * @package TCGStorePlatform
 */

namespace TCGStorePlatform\Tests\Unit;

use TCGStorePlatform\Api\V1\InventoryRouteContracts;
use TCGStorePlatform\Tests\TestCase;

final class InventoryRouteContractTest extends TestCase {
	public function test_inventory_routes_are_planned_but_not_live_by_default(): void {
		$routes = InventoryRouteContracts::route_contracts();

		$this->assert_same( 16, count( $routes ) );

		foreach ( $routes as $route ) {
			$this->assert_same( 'tcg-store/v1', $route['namespace'] );
			$this->assert_false( $route['live_enabled_by_default'] );
		}
	}

	public function test_inventory_route_contracts_match_documented_permissions(): void {
		$this->assert_same(
			array(
				'GET /inventory'                                           => 'view_inventory',
				'GET /inventory/(?P<inventory_id>\d+)'                    => 'public_visibility_or_view_inventory',
				'POST /inventory'                                          => 'create_inventory',
				'PUT /inventory/(?P<inventory_id>\d+)'                    => 'edit_inventory',
				'POST /inventory/(?P<inventory_id>\d+)/reserve'           => 'source_authenticated_principal',
				'POST /inventory/(?P<inventory_id>\d+)/release'           => 'reservation_owner_or_staff',
				'POST /inventory/(?P<inventory_id>\d+)/mark-sold'         => 'staff_or_pos_device',
				'POST /inventory/(?P<inventory_id>\d+)/move'              => 'edit_inventory',
				'POST /inventory/(?P<inventory_id>\d+)/price-lock'        => 'edit_prices',
				'POST /inventory/bulk-intake'                              => 'create_inventory',
				'POST /inventory/import'                                   => 'manage_inventory_imports',
				'POST /inventory/export'                                   => 'view_reports',
				'GET /search'                                              => 'public_filtered_response',
				'GET /reference/search'                                    => 'public_rate_limited',
				'GET /inventory/search'                                    => 'public_or_staff_inventory_fields',
				'GET /search/versions'                                     => 'public_filtered_response',
			),
			$this->permission_map()
		);
	}

	public function test_inventory_route_contracts_have_unique_method_paths(): void {
		$seen = array();

		foreach ( InventoryRouteContracts::route_contracts() as $route ) {
			$key = $route['method'] . ' ' . $route['path'];

			$this->assert_false( isset( $seen[ $key ] ), "Duplicate inventory route: {$key}" );
			$seen[ $key ] = true;
		}
	}

	/**
	 * @return array<string, string>
	 */
	private function permission_map(): array {
		$map = array();

		foreach ( InventoryRouteContracts::route_contracts() as $route ) {
			$map[ $route['method'] . ' ' . $route['path'] ] = $route['permission'];
		}

		return $map;
	}
}
