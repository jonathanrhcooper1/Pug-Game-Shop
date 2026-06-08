<?php
/**
 * Applies runtime settings to inventory route contracts.
 *
 * @package TCGStorePlatform
 */

namespace TCGStorePlatform\Api\V1;

use TCGStorePlatform\Settings\InventoryRouteRuntimeSettings;

final class InventoryRouteRuntimeConfigurator {
	private const STAFF_SEARCH_ROUTE_KEY = 'GET /inventory/search';
	private const REFERENCE_SEARCH_ROUTE_KEY = 'GET /reference/search';
	private const STAFF_CREATE_ROUTE_KEY = 'POST /inventory';

	/**
	 * @param array<string, mixed>             $runtime_settings Runtime settings.
	 * @param null|list<array<string, mixed>> $route_contracts Route contracts.
	 * @return list<array<string, mixed>>
	 */
	public function route_contracts( array $runtime_settings, ?array $route_contracts = null ): array {
		$settings        = InventoryRouteRuntimeSettings::sanitize( $runtime_settings );
		$route_contracts = $route_contracts ?? InventoryRouteContracts::route_contracts();
		$contracts       = array();

		foreach ( $route_contracts as $route_contract ) {
			if (
				in_array(
					InventoryRoutePermissionCallbackFactory::route_key( $route_contract ),
					array( self::STAFF_SEARCH_ROUTE_KEY, self::REFERENCE_SEARCH_ROUTE_KEY ),
					true
				)
				&& true === $settings['staff_search_route_enabled']
			) {
				$route_contract['live_enabled_by_default']              = true;
				$route_contract['route_registration_deferred']          = false;
				$route_contract['route_connected_reads_deferred']       = false;
				$route_contract['route_connected_writes_deferred']      = true;
				$route_contract['woocommerce_projection_deferred']      = true;
				$route_contract['square_inventory_projection_deferred'] = true;
				$route_contract['label_print_deferred']                 = true;
			}

			if (
				self::STAFF_CREATE_ROUTE_KEY === InventoryRoutePermissionCallbackFactory::route_key( $route_contract )
				&& true === $settings['staff_create_route_enabled']
			) {
				$route_contract['live_enabled_by_default']              = true;
				$route_contract['route_registration_deferred']          = false;
				$route_contract['route_connected_reads_deferred']       = true;
				$route_contract['route_connected_writes_deferred']      = false;
				$route_contract['woocommerce_projection_deferred']      = true;
				$route_contract['square_inventory_projection_deferred'] = true;
				$route_contract['label_print_deferred']                 = true;
			}

			$contracts[] = $route_contract;
		}

		return $contracts;
	}

	/**
	 * @param array<string, mixed> $runtime_settings Runtime settings.
	 */
	public function public_read_routes_enabled( array $runtime_settings ): bool {
		$settings = InventoryRouteRuntimeSettings::sanitize( $runtime_settings );

		return true === $settings['public_search_route_enabled'];
	}

	/**
	 * @param array<string, mixed> $runtime_settings Runtime settings.
	 */
	public function route_connected_reads_enabled( array $runtime_settings ): bool {
		$settings = InventoryRouteRuntimeSettings::sanitize( $runtime_settings );

		return true === $settings['staff_search_route_enabled'];
	}

	/**
	 * @param array<string, mixed> $runtime_settings Runtime settings.
	 */
	public function route_connected_writes_enabled( array $runtime_settings ): bool {
		$settings = InventoryRouteRuntimeSettings::sanitize( $runtime_settings );

		return true === $settings['staff_create_route_enabled'];
	}
}
