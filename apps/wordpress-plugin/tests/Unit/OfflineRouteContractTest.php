<?php
/**
 * Offline device and sync REST route contract tests.
 *
 * @package TCGStorePlatform
 */

namespace TCGStorePlatform\Tests\Unit;

use TCGStorePlatform\Api\V1\OfflineRouteContracts;
use TCGStorePlatform\Tests\TestCase;

final class OfflineRouteContractTest extends TestCase {
	public function test_offline_routes_are_planned_but_not_live_by_default(): void {
		$routes = OfflineRouteContracts::route_contracts();

		$this->assert_same( 5, count( $routes ) );

		foreach ( $routes as $route ) {
			$this->assert_same( 'tcg-store/v1', $route['namespace'] );
			$this->assert_false( $route['live_enabled_by_default'] );
		}
	}

	public function test_offline_route_contracts_match_documented_permissions(): void {
		$this->assert_same(
			array(
				'POST /offline/devices/register'                                             => 'pairing_code_plus_manager',
				'POST /offline/pull'                                                         => 'registered_device',
				'POST /offline/push'                                                         => 'registered_device',
				'GET /offline/conflicts'                                                     => 'resolve_conflicts',
				'POST /offline/conflicts/(?P<conflict_id>[a-zA-Z0-9_-]+)/resolve'            => 'resolve_conflicts',
			),
			$this->permission_map()
		);
	}

	public function test_offline_route_contract_callbacks_are_stable_for_app_clients(): void {
		$this->assert_same(
			array(
				'POST /offline/devices/register'                                             => 'register_offline_device',
				'POST /offline/pull'                                                         => 'pull_offline_changes',
				'POST /offline/push'                                                         => 'push_offline_operations',
				'GET /offline/conflicts'                                                     => 'list_offline_conflicts',
				'POST /offline/conflicts/(?P<conflict_id>[a-zA-Z0-9_-]+)/resolve'            => 'resolve_offline_conflict',
			),
			$this->callback_map()
		);
	}

	/**
	 * @return array<string, string>
	 */
	private function permission_map(): array {
		$map = array();

		foreach ( OfflineRouteContracts::route_contracts() as $route ) {
			$map[ $route['method'] . ' ' . $route['path'] ] = $route['permission'];
		}

		return $map;
	}

	/**
	 * @return array<string, string>
	 */
	private function callback_map(): array {
		$map = array();

		foreach ( OfflineRouteContracts::route_contracts() as $route ) {
			$map[ $route['method'] . ' ' . $route['path'] ] = $route['callback'];
		}

		return $map;
	}
}
