<?php
/**
 * Applies runtime settings to offline route contracts.
 *
 * @package TCGStorePlatform
 */

namespace TCGStorePlatform\Api\V1;

use TCGStorePlatform\Settings\OfflineRouteRuntimeSettings;

final class OfflineRouteRuntimeConfigurator {
	private const DEVICE_PAIRING_ROUTE_KEY = 'POST /offline/devices/register';
	private const PULL_ROUTE_KEY           = 'POST /offline/pull';
	private const PUSH_ROUTE_KEY           = 'POST /offline/push';
	private const CONFLICT_LIST_ROUTE_KEY  = 'GET /offline/conflicts';
	private const CONFLICT_RESOLVE_PREFIX  = 'POST /offline/conflicts/';

	/**
	 * @param array<string, mixed>             $runtime_settings Runtime settings.
	 * @param null|list<array<string, mixed>> $route_contracts Route contracts.
	 * @return list<array<string, mixed>>
	 */
	public function route_contracts( array $runtime_settings, ?array $route_contracts = null ): array {
		$settings        = OfflineRouteRuntimeSettings::sanitize( $runtime_settings );
		$route_contracts = $route_contracts ?? OfflineRouteContracts::route_contracts();
		$contracts       = array();

		foreach ( $route_contracts as $route_contract ) {
			$route_key = OfflineRoutePermissionCallbackFactory::route_key( $route_contract );

			if (
				self::DEVICE_PAIRING_ROUTE_KEY === $route_key
				&& true === $settings['device_pairing_route_enabled']
			) {
				$route_contract = $this->enable_runtime_route(
					$route_contract,
					array(
						'route_connected_writes_deferred' => false,
						'token_issuance_deferred'         => false,
						'device_token_storage'            => 'desktop_secure_store',
					)
				);
			}

			if ( self::PULL_ROUTE_KEY === $route_key && true === $settings['pull_route_enabled'] ) {
				$route_contract = $this->enable_runtime_route(
					$route_contract,
					array(
						'route_connected_reads_deferred'  => false,
						'route_connected_writes_deferred' => true,
						'cursor_write_deferred'           => true,
					)
				);
			}

			if ( self::PUSH_ROUTE_KEY === $route_key && true === $settings['push_route_enabled'] ) {
				$route_contract = $this->enable_runtime_route(
					$route_contract,
					array(
						'route_connected_reads_deferred'       => false,
						'route_connected_queue_writes_deferred' => false,
						'canonical_mutations_deferred'         => true,
					)
				);
			}

			if (
				(
					self::CONFLICT_LIST_ROUTE_KEY === $route_key
					|| str_starts_with( $route_key, self::CONFLICT_RESOLVE_PREFIX )
				)
				&& true === $settings['conflict_routes_enabled']
			) {
				$route_contract = $this->enable_runtime_route(
					$route_contract,
					array(
						'route_connected_reads_deferred'  => false,
						'route_connected_writes_deferred' => true,
						'manager_resolution_required'     => true,
					)
				);
			}

			$contracts[] = $route_contract;
		}

		return $contracts;
	}

	/**
	 * @param array<string, mixed> $route_contract Route contract.
	 * @param array<string, mixed> $metadata Additional staged metadata.
	 * @return array<string, mixed>
	 */
	private function enable_runtime_route( array $route_contract, array $metadata ): array {
		return array_merge(
			$route_contract,
			array(
				'live_enabled_by_default'   => true,
				'route_registration_deferred' => false,
				'runtime_gate_enabled'      => true,
			),
			$metadata
		);
	}
}
