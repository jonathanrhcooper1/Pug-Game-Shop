<?php
/**
 * Inventory route runtime gate settings.
 *
 * @package TCGStorePlatform
 */

namespace TCGStorePlatform\Settings;

final class InventoryRouteRuntimeSettings {
	public const KEY = 'inventory_route_runtime';

	/**
	 * @return array<string, bool>
	 */
	public static function defaults(): array {
		return array(
			'staff_search_route_enabled'  => false,
			'staff_create_route_enabled'  => false,
			'public_search_route_enabled' => false,
		);
	}

	/**
	 * @param array<string, mixed> $settings Full platform settings.
	 * @return array<string, bool>
	 */
	public static function from_settings( array $settings ): array {
		return self::sanitize( $settings[ self::KEY ] ?? array() );
	}

	/**
	 * @param mixed $value Submitted route runtime settings.
	 * @return array<string, bool>
	 */
	public static function sanitize( mixed $value ): array {
		$value                = is_array( $value ) ? $value : array();
		$staff_search_enabled = ! empty( $value['staff_search_route_enabled'] );
		$staff_create_enabled = ! empty( $value['staff_create_route_enabled'] );

		return array(
			'staff_search_route_enabled'  => $staff_search_enabled,
			'staff_create_route_enabled'  => $staff_create_enabled,
			'public_search_route_enabled' => $staff_search_enabled
				&& ! empty( $value['public_search_route_enabled'] ),
		);
	}

	private function __construct() {
	}
}
