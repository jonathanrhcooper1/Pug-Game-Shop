<?php
/**
 * POS payment log planner tests.
 *
 * @package TCGStorePlatform
 */

namespace TCGStorePlatform\Tests\Unit;

use TCGStorePlatform\Payments\PosPaymentLogPlan;
use TCGStorePlatform\Payments\PosPaymentLogPlanner;
use TCGStorePlatform\Tests\TestCase;

final class PosPaymentLogPlannerTest extends TestCase {
	public function test_sale_plan_creates_payment_row_and_per_line_pos_rows(): void {
		$plan        = ( new PosPaymentLogPlanner() )->plan_transaction(
			$this->accepted_sale_plan(),
			array(
				'woo_order_id'         => '1001',
				'provider_location_id' => 'loc-sandbox-1',
				'received_at'          => '2026-06-06 14:00:00',
			)
		);
		$payment_row = $plan->payment_provider_rows()[0];
		$pos_rows    = $plan->pos_sync_rows();

		$this->assert_same( PosPaymentLogPlan::READY, $plan->status() );
		$this->assert_same( 3, $plan->write_count() );
		$this->assert_same( 'square-sandbox:evt-square-sandbox-sale-001:payment:capture', $payment_row['idempotency_key'] );
		$this->assert_same( 'capture', $payment_row['operation'] );
		$this->assert_same( 1001, $payment_row['woo_order_id'] );
		$this->assert_same( 12500, $payment_row['amount_minor_units'] );
		$this->assert_same( 'USD', $payment_row['currency'] );
		$this->assert_same( 'approved', $payment_row['status'] );
		$this->assert_same( 'square-sandbox:evt-square-sandbox-sale-001:pos:line-0', $pos_rows[0]['idempotency_key'] );
		$this->assert_same( 'reconciled', $pos_rows[0]['reconciliation_status'] );
		$this->assert_same( '2026-06-06 14:00:00', $pos_rows[0]['reconciled_at'] );
		$this->assert_same( 42, $pos_rows[0]['inventory_item_id'] );
		$this->assert_same( 'PKM-BASE-004-HOLO', $pos_rows[0]['barcode'] );
	}

	public function test_conflict_plan_creates_summary_pos_row_without_inventory_write(): void {
		$plan    = ( new PosPaymentLogPlanner() )->plan_transaction(
			array(
				'status'  => 'conflict',
				'code'    => 'unmapped_pos_line',
				'details' => array(
					'ingestion'            => $this->sale_ingestion(),
					'unmappedCount'        => 1,
					'requiresManagerReview' => true,
					'inventoryTransitions' => array(),
				),
			),
			array(
				'received_at' => '2026-06-06 14:05:00',
			)
		);
		$pos_row = $plan->pos_sync_rows()[0];

		$this->assert_same( PosPaymentLogPlan::READY, $plan->status() );
		$this->assert_same( 2, $plan->write_count() );
		$this->assert_same( 'square-sandbox:evt-square-sandbox-sale-001:pos:summary', $pos_row['idempotency_key'] );
		$this->assert_same( 'conflict', $pos_row['reconciliation_status'] );
		$this->assert_same( null, $pos_row['inventory_item_id'] );
		$this->assert_same( null, $pos_row['reconciled_at'] );
		$this->assert_contains( 'production_capture_deferred', $pos_row['result_details_json'] );
	}

	public function test_replayed_plan_marks_summary_row_as_replayed(): void {
		$plan    = ( new PosPaymentLogPlanner() )->plan_transaction(
			array(
				'status'  => 'accepted',
				'code'    => 'pos_event_replay',
				'details' => array(
					'ingestion'            => $this->sale_ingestion(),
					'replayed'             => true,
					'inventoryTransitions' => array(),
				),
			),
			array(
				'received_at' => '2026-06-06 14:10:00',
			)
		);
		$pos_row = $plan->pos_sync_rows()[0];

		$this->assert_same( PosPaymentLogPlan::READY, $plan->status() );
		$this->assert_same( 'replayed', $pos_row['reconciliation_status'] );
		$this->assert_same( null, $pos_row['reconciled_at'] );
	}

	public function test_raw_payment_payloads_are_redacted_before_logging(): void {
		$plan        = ( new PosPaymentLogPlanner() )->plan_transaction(
			$this->accepted_sale_plan(),
			array(
				'raw_request'  => array(
					'api_key' => 'sandbox-secret-key',
					'event'   => 'evt-square-sandbox-sale-001',
				),
				'raw_response' => array(
					'authorization' => 'Bearer sandbox-token',
					'status'        => 'approved',
				),
				'received_at'  => '2026-06-06 14:00:00',
			)
		);
		$payment_row = $plan->payment_provider_rows()[0];

		$this->assert_not_contains( 'sandbox-secret-key', $payment_row['masked_request_json'] );
		$this->assert_not_contains( 'sandbox-token', $payment_row['masked_response_json'] );
		$this->assert_contains( '[redacted]', $payment_row['masked_request_json'] );
		$this->assert_contains( '[redacted]', $payment_row['masked_response_json'] );
	}

	public function test_missing_required_fields_fails_without_rows(): void {
		$plan = ( new PosPaymentLogPlanner() )->plan_transaction(
			array(
				'status'  => 'accepted',
				'code'    => 'pos_sale_reconciled',
				'details' => array(
					'ingestion' => array(
						'eventType' => 'sale',
						'payment'   => array(
							'status' => 'approved',
						),
					),
				),
			)
		);

		$this->assert_same( PosPaymentLogPlan::FAILED, $plan->status() );
		$this->assert_same( 0, $plan->write_count() );
		$this->assert_true( in_array( 'pos_provider_missing', $plan->errors(), true ) );
		$this->assert_true( in_array( 'payment_currency_missing', $plan->errors(), true ) );
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
				'inventoryTransitions'           => array(
					array(
						'inventoryId' => 42,
						'barcode'     => 'PKM-BASE-004-HOLO',
						'status'      => 'sold',
						'source'      => 'pos_scan_gate',
					),
					array(
						'inventoryId' => 43,
						'barcode'     => 'PKM-BASE-025',
						'status'      => 'sold',
						'source'      => 'pos_scan_gate',
					),
				),
			),
		);
	}

	/**
	 * @return array<string, mixed>
	 */
	private function sale_ingestion(): array {
		return array(
			'provider'        => 'square-sandbox',
			'eventId'         => 'evt-square-sandbox-sale-001',
			'eventType'       => 'sale',
			'idempotencyKey'  => 'square-sandbox:evt-square-sandbox-sale-001',
			'externalOrderId' => 'sandbox-order-001',
			'payment'         => array(
				'status'          => 'approved',
				'transactionId'   => 'sandbox-pos-txn-001',
				'amountMinorUnits' => 12500,
				'currency'        => 'USD',
			),
		);
	}
}
