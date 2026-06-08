<?php
/**
 * Offline connector manifest controller tests.
 *
 * @package TCGStorePlatform
 */

namespace TCGStorePlatform\Tests\Unit;

use TCGStorePlatform\Api\V1\OfflineConnectorManifestController;
use TCGStorePlatform\Tests\TestCase;

final class OfflineConnectorManifestControllerTest extends TestCase {
	public function test_route_contract_is_public_safe_read_only_manifest(): void {
		$routes = OfflineConnectorManifestController::route_contracts();

		$this->assert_same( 1, count( $routes ) );
		$this->assert_same( 'tcg-store/v1', $routes[0]['namespace'] );
		$this->assert_same( '/offline/connector-manifest', $routes[0]['path'] );
		$this->assert_same( 'GET', $routes[0]['method'] );
		$this->assert_same( 'get_manifest', $routes[0]['callback'] );
		$this->assert_same( 'public_safe_manifest', $routes[0]['permission'] );
	}

	public function test_controller_does_not_register_device_pairing_or_sync_routes(): void {
		$paths = array_map(
			static fn ( array $route ): string => $route['path'],
			OfflineConnectorManifestController::route_contracts()
		);
		$body  = implode( "\n", $paths );

		$this->assert_contains( '/offline/connector-manifest', $body );
		$this->assert_not_contains( '/offline/devices/register', $body );
		$this->assert_not_contains( '/offline/pull', $body );
		$this->assert_not_contains( '/offline/push', $body );
		$this->assert_not_contains( '/offline/conflicts', $body );
	}
}
