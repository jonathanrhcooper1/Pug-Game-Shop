<?php
/**
 * Inventory route runtime settings tests.
 *
 * @package TCGStorePlatform
 */

namespace TCGStorePlatform\Tests\Unit;

use TCGStorePlatform\Settings\InventoryRouteRuntimeSettings;
use TCGStorePlatform\Tests\TestCase;

final class InventoryRouteRuntimeSettingsTest extends TestCase {
	public function test_defaults_keep_inventory_runtime_routes_disabled(): void {
		$defaults = InventoryRouteRuntimeSettings::defaults();

		$this->assert_false( $defaults['staff_search_route_enabled'] );
		$this->assert_false( $defaults['staff_create_route_enabled'] );
		$this->assert_false( $defaults['public_search_route_enabled'] );
	}

	public function test_public_search_requires_staff_search(): void {
		$result = InventoryRouteRuntimeSettings::sanitize(
			array(
				'public_search_route_enabled' => true,
			)
		);

		$this->assert_false( $result['staff_search_route_enabled'] );
		$this->assert_false( $result['staff_create_route_enabled'] );
		$this->assert_false( $result['public_search_route_enabled'] );

		$result = InventoryRouteRuntimeSettings::sanitize(
			array(
				'staff_search_route_enabled'  => true,
				'public_search_route_enabled' => true,
			)
		);

		$this->assert_true( $result['staff_search_route_enabled'] );
		$this->assert_false( $result['staff_create_route_enabled'] );
		$this->assert_true( $result['public_search_route_enabled'] );
	}

	public function test_staff_create_gate_is_separate_from_public_search(): void {
		$result = InventoryRouteRuntimeSettings::sanitize(
			array(
				'staff_create_route_enabled'  => true,
				'public_search_route_enabled' => true,
			)
		);

		$this->assert_false( $result['staff_search_route_enabled'] );
		$this->assert_true( $result['staff_create_route_enabled'] );
		$this->assert_false( $result['public_search_route_enabled'] );
	}

	public function test_from_settings_reads_nested_runtime_key(): void {
		$result = InventoryRouteRuntimeSettings::from_settings(
			array(
				InventoryRouteRuntimeSettings::KEY => array(
					'staff_search_route_enabled' => true,
					'staff_create_route_enabled' => true,
				),
			)
		);

		$this->assert_true( $result['staff_search_route_enabled'] );
		$this->assert_true( $result['staff_create_route_enabled'] );
		$this->assert_false( $result['public_search_route_enabled'] );
	}
}
