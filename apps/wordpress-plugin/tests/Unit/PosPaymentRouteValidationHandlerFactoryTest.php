<?php
/**
 * POS/payment route validation handler tests.
 *
 * @package TCGStorePlatform
 */

namespace TCGStorePlatform\Tests\Unit;

use TCGStorePlatform\Api\V1\PosPaymentController;
use TCGStorePlatform\Api\V1\PosPaymentRouteValidationHandlerFactory;
use TCGStorePlatform\Tests\TestCase;

final class PosPaymentRouteValidationHandlerFactoryTest extends TestCase {
	public function test_handlers_expose_every_planned_pos_payment_callback(): void {
		$handlers = ( new PosPaymentRouteValidationHandlerFactory() )->handlers();

		$this->assert_same(
			array(
				'ingest_pos_event',
				'get_pos_event_status',
				'run_pos_reconciliation',
				'list_pos_reconciliation_conflicts',
				'resolve_pos_reconciliation_conflict',
				'receive_payment_provider_webhook',
				'list_payment_fee_snapshots',
				'create_payment_fee_snapshot',
			),
			array_keys( $handlers )
		);
	}

	public function test_ingest_pos_event_validates_transaction_plan_without_writes(): void {
		$response = $this->controller()->ingest_pos_event(
			array(
				'body' => array(
					'transaction_plan' => $this->accepted_sale_plan(),
					'context'          => array(
						'received_at' => '2026-06-07 12:00:00',
					),
				),
			)
		);

		$this->assert_same( 'validated', $response['status'] );
		$this->assert_same( 202, $response['status_code'] );
		$this->assert_same( 'ingest_pos_event', $response['callback'] );
		$this->assert_same( 'ready', $response['data']['log_plan_status'] );
		$this->assert_same( 1, $response['data']['planned_pos_sync_rows'] );
		$this->assert_same( 1, $response['data']['planned_payment_log_rows'] );
		$this->assert_true( $response['data']['log_write_deferred'] );
		$this->assert_true( $response['data']['route_connected_writes_deferred'] );
		$this->assert_true( $response['data']['provider_capture_deferred'] );
		$this->assert_true( $response['data']['route_still_gated'] );
	}

	public function test_ingest_pos_event_rejects_missing_transaction_plan(): void {
		$response = $this->controller()->ingest_pos_event( array( 'body' => array() ) );

		$this->assert_same( 'invalid', $response['status'] );
		$this->assert_same( 400, $response['status_code'] );
		$this->assert_same( 'pos_payment_route_request_invalid', $response['code'] );
		$this->assert_same( array( 'transaction_plan_required' ), $response['errors'] );
	}

	public function test_webhook_handler_uses_route_provider_for_log_planning(): void {
		$response = $this->controller()->receive_payment_provider_webhook(
			array(
				'route' => array(
					'provider' => 'square-sandbox',
				),
				'body'  => array(
					'transaction_plan' => $this->accepted_sale_plan_without_provider(),
				),
			)
		);

		$this->assert_same( 'validated', $response['status'] );
		$this->assert_same( 'receive_payment_provider_webhook', $response['callback'] );
		$this->assert_same( 'ready', $response['data']['log_plan_status'] );
		$this->assert_true( $response['data']['log_write_deferred'] );
	}

	public function test_status_and_conflict_routes_validate_route_and_query_data(): void {
		$status = $this->controller()->get_pos_event_status(
			array(
				'route' => array(
					'provider_event_id' => 'evt-pos-status-145',
				),
			)
		);
		$list   = $this->controller()->list_pos_reconciliation_conflicts(
			array(
				'query' => array(
					'status'    => 'open',
					'cursor'    => 'conflict-cursor-145',
					'page_size' => '250',
				),
			)
		);

		$this->assert_same( 'evt-pos-status-145', $status['data']['provider_event_id'] );
		$this->assert_true( $status['data']['read_deferred'] );
		$this->assert_same( 'open', $list['data']['status'] );
		$this->assert_same( 'conflict-cursor-145', $list['data']['cursor'] );
		$this->assert_same( 100, $list['data']['page_size'] );
		$this->assert_true( $list['data']['read_deferred'] );
	}

	public function test_reconciliation_and_conflict_resolution_stay_deferred(): void {
		$run     = $this->controller()->run_pos_reconciliation(
			array(
				'body' => array(
					'provider'     => 'square-sandbox',
					'window_start' => '2026-06-07T12:00:00Z',
					'window_end'   => '2026-06-07T13:00:00Z',
				),
			)
		);
		$resolve = $this->controller()->resolve_pos_reconciliation_conflict(
			array(
				'route'   => array(
					'conflict_id' => '145',
				),
				'body'    => array(
					'resolution_action' => 'accept_pos',
				),
				'headers' => array(
					'Idempotency-Key' => 'resolve-pos-conflict-145',
				),
			)
		);

		$this->assert_same( 'validated', $run['status'] );
		$this->assert_true( $run['data']['reconciliation_deferred'] );
		$this->assert_same( '145', $resolve['data']['conflict_id'] );
		$this->assert_same( 'accept_pos', $resolve['data']['resolution_action'] );
		$this->assert_true( $resolve['data']['conflict_write_deferred'] );
		$this->assert_true( $resolve['data']['route_connected_writes_deferred'] );
	}

	public function test_fee_snapshot_routes_validate_without_writes(): void {
		$list   = $this->controller()->list_payment_fee_snapshots(
			array(
				'query' => array(
					'provider' => 'square-sandbox',
					'currency' => 'usd',
				),
			)
		);
		$create = $this->controller()->create_payment_fee_snapshot(
			array(
				'body' => array(
					'provider'         => 'square-sandbox',
					'currency'         => 'USD',
					'fee_basis_points' => 295,
				),
			)
		);

		$this->assert_same( 'square-sandbox', $list['data']['provider'] );
		$this->assert_same( 'USD', $list['data']['currency'] );
		$this->assert_true( $list['data']['read_deferred'] );
		$this->assert_same( 'validated', $create['status'] );
		$this->assert_true( $create['data']['fee_basis_points_configured'] );
		$this->assert_true( $create['data']['fee_write_deferred'] );
	}

	private function controller(): PosPaymentController {
		return new PosPaymentController(
			null,
			( new PosPaymentRouteValidationHandlerFactory() )->handlers()
		);
	}

	/**
	 * @return array<string, mixed>
	 */
	private function accepted_sale_plan(): array {
		return array(
			'status'  => 'accepted',
			'code'    => 'pos_sale_reconciled',
			'details' => array(
				'ingestion'                       => $this->sale_ingestion(),
				'providerInventoryWriteBlocked'  => true,
				'routeConnectedWritesDeferred'   => true,
				'productionCaptureDeferred'      => true,
			),
		);
	}

	/**
	 * @return array<string, mixed>
	 */
	private function accepted_sale_plan_without_provider(): array {
		$plan = $this->accepted_sale_plan();
		unset( $plan['details']['ingestion']['provider'] );

		return $plan;
	}

	/**
	 * @return array<string, mixed>
	 */
	private function sale_ingestion(): array {
		return array(
			'provider'       => 'square-sandbox',
			'eventId'        => 'evt-square-sandbox-sale-145',
			'eventType'      => 'sale',
			'idempotencyKey' => 'square-sandbox:evt-square-sandbox-sale-145',
			'payment'        => array(
				'status'           => 'approved',
				'transactionId'    => 'sandbox-pos-txn-145',
				'amountMinorUnits' => 12500,
				'currency'         => 'USD',
			),
		);
	}
}
