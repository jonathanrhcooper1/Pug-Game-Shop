<?php
/**
 * POS/payment log repository staging tests.
 *
 * @package TCGStorePlatform
 */

namespace TCGStorePlatform\Tests\Unit;

use TCGStorePlatform\Payments\PosPaymentLogPlan;
use TCGStorePlatform\Payments\PosPaymentLogPlanner;
use TCGStorePlatform\Payments\PosPaymentLogQueryBuilder;
use TCGStorePlatform\Payments\PosPaymentLogRepository;
use TCGStorePlatform\Tests\TestCase;

final class PosPaymentLogRepositoryTest extends TestCase {
	public function test_repository_stages_pos_and_payment_log_writes_as_deferred(): void {
		$query_plan = ( new PosPaymentLogQueryBuilder() )->build( $this->log_plan(), 'wp_' );
		$result     = ( new PosPaymentLogRepository() )->stage( $query_plan );
		$audit      = $result->audit_payload();

		$this->assert_true( $result->is_deferred() );
		$this->assert_false( $result->is_rejected() );
		$this->assert_same( 'deferred', $result->status() );
		$this->assert_same( 0, $result->rows_affected() );
		$this->assert_same( 2, $result->pos_sync_query_count() );
		$this->assert_same( 1, $result->payment_provider_query_count() );
		$this->assert_same( 3, $result->total_query_count() );
		$this->assert_same( 48, $result->prepare_arg_count() );
		$this->assert_same(
			array(
				'square-sandbox:evt-square-sandbox-sale-001:pos:line-0',
				'square-sandbox:evt-square-sandbox-sale-001:pos:line-1',
			),
			$result->pos_sync_idempotency_keys()
		);
		$this->assert_same(
			array( 'square-sandbox:evt-square-sandbox-sale-001:payment:capture' ),
			$result->payment_provider_idempotency_keys()
		);
		$this->assert_same( 'pos_sync_insert', $result->pos_sync_results()[0]['query_kind'] );
		$this->assert_same( 16, $result->pos_sync_results()[0]['prepare_arg_count'] );
		$this->assert_same( 'deferred', $result->pos_sync_results()[0]['execution_status'] );
		$this->assert_true( $result->pos_sync_results()[0]['pos_sync_write_execution_deferred'] );
		$this->assert_true( $result->pos_sync_results()[0]['provider_inventory_write_deferred'] );
		$this->assert_same( 'payment_provider_insert', $result->payment_provider_results()[0]['query_kind'] );
		$this->assert_same( 'capture', $result->payment_provider_results()[0]['operation'] );
		$this->assert_true( $result->payment_provider_results()[0]['payment_capture_execution_deferred'] );
		$this->assert_same( 'pos_payment_log_repository', $audit['action'] );
		$this->assert_same( 'pos_payment_log_sql_planned', $audit['query']['action'] );
		$this->assert_same( 3, $audit['total_query_count'] );
		$this->assert_same( 48, $audit['prepare_arg_count'] );
		$this->assert_same( 0, $audit['rows_affected'] );
		$this->assert_true( $audit['explicit_execution_required'] );
		$this->assert_true( $audit['payment_log_repository_deferred'] );
		$this->assert_true( $audit['route_connected_writes_deferred'] );
		$this->assert_true( $audit['production_capture_deferred'] );
		$this->assert_same( array(), $audit['errors'] );
	}

	public function test_repository_accepts_empty_valid_plans_as_deferred_without_results(): void {
		$query_plan = ( new PosPaymentLogQueryBuilder() )->build(
			PosPaymentLogPlan::ready( 'fixture_empty', array(), array(), array() ),
			'wp_'
		);
		$result     = ( new PosPaymentLogRepository() )->stage( $query_plan );

		$this->assert_true( $result->is_deferred() );
		$this->assert_same( 0, $result->pos_sync_query_count() );
		$this->assert_same( 0, $result->payment_provider_query_count() );
		$this->assert_same( 0, $result->total_query_count() );
		$this->assert_same( 0, $result->prepare_arg_count() );
		$this->assert_same( array(), $result->log_idempotency_keys() );
		$this->assert_same( array(), $result->pos_sync_results() );
		$this->assert_same( array(), $result->payment_provider_results() );
		$this->assert_same( array(), $result->errors() );
	}

	public function test_repository_rejects_invalid_query_plan_before_execution(): void {
		$query_plan = ( new PosPaymentLogQueryBuilder() )->build( $this->log_plan(), 'wp-bad_' );
		$result     = ( new PosPaymentLogRepository() )->stage( $query_plan );
		$audit      = $result->audit_payload();

		$this->assert_true( $result->is_rejected() );
		$this->assert_false( $result->is_deferred() );
		$this->assert_same( 'rejected', $result->status() );
		$this->assert_same( 0, $result->rows_affected() );
		$this->assert_same( 0, $result->pos_sync_query_count() );
		$this->assert_same( 0, $result->payment_provider_query_count() );
		$this->assert_same( 0, $result->total_query_count() );
		$this->assert_same( 0, $result->prepare_arg_count() );
		$this->assert_same( array(), $result->pos_sync_results() );
		$this->assert_same( array(), $result->payment_provider_results() );
		$this->assert_true( in_array( 'table_prefix_invalid', $result->errors(), true ) );
		$this->assert_true( $audit['is_rejected'] );
		$this->assert_true( $audit['payment_log_repository_deferred'] );
		$this->assert_same( array( 'table_prefix_invalid' ), $audit['errors'] );
	}

	private function log_plan(): PosPaymentLogPlan {
		return ( new PosPaymentLogPlanner() )->plan_transaction(
			array(
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
			),
			array(
				'woo_order_id'         => '1001',
				'provider_location_id' => 'loc-sandbox-1',
				'received_at'          => '2026-06-06 14:00:00',
			)
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
				'status'           => 'approved',
				'transactionId'    => 'sandbox-pos-txn-001',
				'amountMinorUnits' => 12500,
				'currency'         => 'USD',
			),
		);
	}
}
