<?php
/**
 * Offline route runtime gate settings.
 *
 * @package TCGStorePlatform
 */

namespace TCGStorePlatform\Settings;

final class OfflineRouteRuntimeSettings {
	public const KEY = 'offline_route_runtime';

	/**
	 * @return array<string, bool>
	 */
	public static function defaults(): array {
		return array(
			'device_pairing_route_enabled' => false,
			'pull_route_enabled'           => false,
			'push_route_enabled'           => false,
			'conflict_routes_enabled'      => false,
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
		$value = is_array( $value ) ? $value : array();

		return array(
			'device_pairing_route_enabled' => ! empty( $value['device_pairing_route_enabled'] ),
			'pull_route_enabled'           => ! empty( $value['pull_route_enabled'] ),
			'push_route_enabled'           => ! empty( $value['push_route_enabled'] ),
			'conflict_routes_enabled'      => ! empty( $value['conflict_routes_enabled'] ),
		);
	}

	private function __construct() {
	}
}
