<?php
/**
 * Offline route runtime configurator tests.
 *
 * @package TCGStorePlatform
 */

namespace TCGStorePlatform\Tests\Unit;

use TCGStorePlatform\Api\V1\OfflineRouteRuntimeConfigurator;
use TCGStorePlatform\Tests\TestCase;

final class OfflineRouteRuntimeConfiguratorTest extends TestCase {
	public function test_default_runtime_settings_keep_all_routes_disabled(): void {
		$contracts = ( new OfflineRouteRuntimeConfigurator() )->route_contracts( array() );

		$this->assert_same( 5, count( $contracts ) );

		foreach ( $contracts as $contract ) {
			$this->assert_false( $contract['live_enabled_by_default'] );
			$this->assert_false( isset( $contract['runtime_gate_enabled'] ) );
		}
	}

	public function test_device_pairing_runtime_setting_enables_only_pairing_route(): void {
		$contracts = $this->contracts_by_key(
			( new OfflineRouteRuntimeConfigurator() )->route_contracts(
				array(
					'device_pairing_route_enabled' => true,
				)
			)
		);

		$this->assert_true( $contracts['POST /offline/devices/register']['live_enabled_by_default'] );
		$this->assert_true( $contracts['POST /offline/devices/register']['runtime_gate_enabled'] );
		$this->assert_false( $contracts['POST /offline/devices/register']['route_registration_deferred'] );
		$this->assert_same( 'desktop_secure_store', $contracts['POST /offline/devices/register']['device_token_storage'] );

		$this->assert_false( $contracts['POST /offline/pull']['live_enabled_by_default'] );
		$this->assert_false( $contracts['POST /offline/push']['live_enabled_by_default'] );
		$this->assert_false( $contracts['GET /offline/conflicts']['live_enabled_by_default'] );
	}

	public function test_conflict_runtime_setting_enables_both_conflict_routes_only(): void {
		$contracts = $this->contracts_by_key(
			( new OfflineRouteRuntimeConfigurator() )->route_contracts(
				array(
					'conflict_routes_enabled' => true,
				)
			)
		);

		$this->assert_true( $contracts['GET /offline/conflicts']['live_enabled_by_default'] );
		$this->assert_true(
			$contracts['POST /offline/conflicts/(?P<conflict_id>[a-zA-Z0-9_-]+)/resolve']['live_enabled_by_default']
		);
		$this->assert_true( $contracts['GET /offline/conflicts']['manager_resolution_required'] );
		$this->assert_false( $contracts['POST /offline/devices/register']['live_enabled_by_default'] );
		$this->assert_false( $contracts['POST /offline/pull']['live_enabled_by_default'] );
		$this->assert_false( $contracts['POST /offline/push']['live_enabled_by_default'] );
	}

	/**
	 * @param list<array<string, mixed>> $contracts Route contracts.
	 * @return array<string, array<string, mixed>>
	 */
	private function contracts_by_key( array $contracts ): array {
		$map = array();

		foreach ( $contracts as $contract ) {
			$map[ $contract['method'] . ' ' . $contract['path'] ] = $contract;
		}

		return $map;
	}
}
