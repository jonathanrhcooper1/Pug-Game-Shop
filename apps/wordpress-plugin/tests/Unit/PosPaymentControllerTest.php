<?php
/**
 * POS/payment controller scaffold tests.
 *
 * @package TCGStorePlatform
 */

namespace TCGStorePlatform\Tests\Unit;

use TCGStorePlatform\Api\V1\OfflineRestRequestData;
use TCGStorePlatform\Api\V1\PosPaymentController;
use TCGStorePlatform\Api\V1\PosPaymentRouteContracts;
use TCGStorePlatform\Tests\TestCase;

final class PosPaymentControllerTest extends TestCase {
	public function test_controller_exposes_every_planned_pos_payment_route_callback(): void {
		$controller = new PosPaymentController();

		foreach ( PosPaymentRouteContracts::route_contracts() as $route ) {
			$this->assert_true( method_exists( $controller, $route['callback'] ) );
		}
	}

	public function test_controller_callbacks_fail_closed_while_routes_are_disabled(): void {
		$controller = new PosPaymentController();

		foreach ( PosPaymentRouteContracts::route_contracts() as $route ) {
			$response = $controller->{$route['callback']}( array() );

			$this->assert_same( 'disabled', $response['status'] );
			$this->assert_same( 501, $response['status_code'] );
			$this->assert_same( 'pos_payment_route_disabled', $response['code'] );
			$this->assert_same( $route['callback'], $response['callback'] );
			$this->assert_true( $response['route_registration_deferred'] );
			$this->assert_true( $response['route_connected_writes_deferred'] );
			$this->assert_true( $response['transaction_execution_deferred'] );
			$this->assert_true( $response['provider_capture_deferred'] );
			$this->assert_true( $response['provider_inventory_write_deferred'] );
			$this->assert_true( $response['webhook_registration_deferred'] );
			$this->assert_true( $response['woocommerce_gateway_capture_deferred'] );
		}
	}

	public function test_controller_can_dispatch_to_injected_handler_with_normalized_request_data(): void {
		$seen       = null;
		$controller = new PosPaymentController(
			null,
			array(
				'ingest_pos_event' => static function ( OfflineRestRequestData $data ) use ( &$seen ): array {
					$seen = $data;

					return array(
						'status'            => 'handled',
						'provider_event_id' => $data->body_params()['provider_event_id'] ?? null,
						'idempotency_key'   => $data->idempotency_key(),
					);
				},
			)
		);

		$response = $controller->ingest_pos_event(
			array(
				'body'    => array(
					'provider_event_id' => 'evt-square-sandbox-sale-001',
				),
				'headers' => array(
					'Idempotency-Key' => 'square-sandbox:evt-square-sandbox-sale-001',
				),
			)
		);

		$this->assert_same( 'handled', $response['status'] );
		$this->assert_same( 'evt-square-sandbox-sale-001', $response['provider_event_id'] );
		$this->assert_same( 'square-sandbox:evt-square-sandbox-sale-001', $response['idempotency_key'] );
		$this->assert_true( $seen instanceof OfflineRestRequestData );
	}

	public function test_controller_reports_injected_handler_readiness(): void {
		$controller = new PosPaymentController(
			null,
			array(
				'ingest_pos_event' => static fn (): array => array( 'status' => 'handled' ),
			)
		);

		$this->assert_true( $controller->has_handler( 'ingest_pos_event' ) );
		$this->assert_false( $controller->has_handler( 'run_pos_reconciliation' ) );
		$this->assert_false( $controller->has_handler( 'unknown_callback' ) );
	}

	public function test_controller_keeps_unhandled_callbacks_disabled_with_injected_handlers(): void {
		$controller = new PosPaymentController(
			null,
			array(
				'ingest_pos_event' => static fn (): array => array( 'status' => 'handled' ),
			)
		);

		$response = $controller->run_pos_reconciliation( array() );

		$this->assert_same( 'disabled', $response['status'] );
		$this->assert_same( 'pos_payment_route_disabled', $response['code'] );
		$this->assert_same( 'run_pos_reconciliation', $response['callback'] );
	}
}
