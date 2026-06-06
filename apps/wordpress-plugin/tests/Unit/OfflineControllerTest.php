<?php
/**
 * Offline controller scaffold tests.
 *
 * @package TCGStorePlatform
 */

namespace TCGStorePlatform\Tests\Unit;

use TCGStorePlatform\Api\V1\OfflineController;
use TCGStorePlatform\Api\V1\OfflineRouteContracts;
use TCGStorePlatform\Tests\TestCase;

final class OfflineControllerTest extends TestCase {
	public function test_controller_exposes_every_planned_offline_route_callback(): void {
		$controller = new OfflineController();

		foreach ( OfflineRouteContracts::route_contracts() as $route ) {
			$this->assert_true( method_exists( $controller, $route['callback'] ) );
		}
	}

	public function test_controller_callbacks_fail_closed_while_routes_are_disabled(): void {
		$controller = new OfflineController();

		foreach ( OfflineRouteContracts::route_contracts() as $route ) {
			$response = $controller->{$route['callback']}( array() );

			$this->assert_same( 'disabled', $response['status'] );
			$this->assert_same( 501, $response['status_code'] );
			$this->assert_same( 'offline_route_disabled', $response['code'] );
			$this->assert_same( $route['callback'], $response['callback'] );
		}
	}
}
