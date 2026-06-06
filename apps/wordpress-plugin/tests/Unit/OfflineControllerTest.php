<?php
/**
 * Offline controller scaffold tests.
 *
 * @package TCGStorePlatform
 */

namespace TCGStorePlatform\Tests\Unit;

use TCGStorePlatform\Api\V1\OfflineController;
use TCGStorePlatform\Api\V1\OfflineRestRequestData;
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

	public function test_controller_can_dispatch_to_injected_handler_with_normalized_request_data(): void {
		$seen       = null;
		$controller = new OfflineController(
			null,
			array(
				'push_offline_operations' => static function ( OfflineRestRequestData $data ) use ( &$seen ): array {
					$seen = $data;

					return array(
						'status'          => 'handled',
						'device_id'       => $data->body_params()['device_id'] ?? null,
						'idempotency_key' => $data->idempotency_key(),
					);
				},
			)
		);

		$response = $controller->push_offline_operations(
			array(
				'body'    => array(
					'device_id' => 'device-handler-001',
				),
				'headers' => array(
					'Idempotency-Key' => 'batch-handler-001',
				),
			)
		);

		$this->assert_same( 'handled', $response['status'] );
		$this->assert_same( 'device-handler-001', $response['device_id'] );
		$this->assert_same( 'batch-handler-001', $response['idempotency_key'] );
		$this->assert_true( $seen instanceof OfflineRestRequestData );
	}

	public function test_controller_reports_injected_handler_readiness(): void {
		$controller = new OfflineController(
			null,
			array(
				'push_offline_operations' => static fn (): array => array( 'status' => 'handled' ),
			)
		);

		$this->assert_true( $controller->has_handler( 'push_offline_operations' ) );
		$this->assert_false( $controller->has_handler( 'pull_offline_changes' ) );
		$this->assert_false( $controller->has_handler( 'unknown_callback' ) );
	}

	public function test_controller_keeps_unhandled_callbacks_disabled_with_injected_handlers(): void {
		$controller = new OfflineController(
			null,
			array(
				'push_offline_operations' => static fn (): array => array( 'status' => 'handled' ),
			)
		);

		$response = $controller->pull_offline_changes( array() );

		$this->assert_same( 'disabled', $response['status'] );
		$this->assert_same( 'offline_route_disabled', $response['code'] );
		$this->assert_same( 'pull_offline_changes', $response['callback'] );
	}
}
