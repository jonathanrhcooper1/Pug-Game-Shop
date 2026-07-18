<?php
/**
 * POS payment log SQL builder tests.
 *
 * @package TCGStorePlatform
 */

namespace TCGStorePlatform\Tests\Unit;

use TCGStorePlatform\Payments\PosPaymentLogPlan;
use TCGStorePlatform\Payments\PosPaymentLogPlanner;
use TCGStorePlatform\Payments\PosPaymentLogQueryBuilder;
use TCGStorePlatform\Tests\TestCase;

final class PosPaymentLogQueryBuilderTest extends TestCase {
	public function test_builder_creates_prepared_pos_and_payment_insert_templates(): void {
		$build           = ( new PosPaymentLogQueryBuilder() )->build( $this->log_plan(), 'wp_' );
		$audit           = $build->audit_payload();
		$pos_queries     = $build->pos_sync_queries();
		$payment_queries = $build->payment_provider_queries();

		$this->assert_true( $build->is_valid() );
		$this->assert_same( 'wp_tcg_pos_sync_log', $build->table_names()['pos_sync_log'] );
		$this->assert_same( 'wp_tcg_payment_provider_log', $build->table_names()['payment_provider_log'] );
		$this->assert_same( 2, count( $pos_queries ) );
		$this->assert_same( 1, count( $payment_queries ) );
		$this->assert_contains( 'INSERT INTO `wp_tcg_pos_sync_log`', $pos_queries[0]['sql_template'] );
		$this->assert_contains( '`reconciliation_status`', $pos_queries[0]['sql_template'] );
		$this->assert_contains( 'NULL', $pos_queries[0]['sql_template'] );
		$this->assert_same( 'square-sandbox:evt-square-sandbox-sale-001:pos:line-0', $pos_queries[0]['idempotency_key'] );
		$this->assert_same( 'reconciled', $pos_queries[0]['reconciliation_status'] );
		$this->assert_true( $pos_queries[0]['has_inventory_item'] );
		$this->assert_same( 16, count( $pos_queries[0]['prepare_args'] ) );
		$this->assert_same( '2026-06-06 14:00:00.000000', $pos_queries[0]['prepare_args'][12] );
		$this->assert_contains( 'INSERT INTO `wp_tcg_payment_provider_log`', $payment_queries[0]['sql_template'] );
		$this->assert_contains( '`masked_request_json`', $payment_queries[0]['sql_template'] );
		$this->assert_same( 'capture', $payment_queries[0]['operation'] );
		$this->assert_same( 'approved', $payment_queries[0]['status'] );
		$this->assert_same( 16, count( $payment_queries[0]['prepare_args'] ) );
		$this->assert_same( 48, $audit['prepare_arg_count'] );
		$this->assert_same( 'pos_payment_log_sql_planned', $audit['action'] );
		$this->assert_same( 2, $audit['pos_sync_query_count'] );
		$this->assert_same( 1, $audit['payment_provider_query_count'] );
		$this->assert_true( $audit['payment_log_repository_deferred'] );
		$this->assert_true( $audit['production_capture_deferred'] );
	}

	public function test_builder_creates_summary_template_for_conflict_without_inventory(): void {
		$build       = ( new PosPaymentLogQueryBuilder() )->build( $this->conflict_plan(), 'wp_' );
		$pos_queries = $build->pos_sync_queries();

		$this->assert_true( $build->is_valid() );
		$this->assert_same( 1, count( $pos_queries ) );
		$this->assert_same( 'conflict', $pos_queries[0]['reconciliation_status'] );
		$this->assert_false( $pos_queries[0]['has_inventory_item'] );
		$this->assert_contains( 'NULL', $pos_queries[0]['sql_template'] );
	}

	public function test_builder_rejects_failed_source_plan_bad_prefix_and_tampered_rows(): void {
		$build  = ( new PosPaymentLogQueryBuilder() )->build(
			PosPaymentLogPlan::ready(
				'fixture',
				array(
					array(
						'public_id'             => 'bad',
						'provider'              => 'bad provider',
						'inventory_item_id'     => 0,
						'reconciliation_status' => 'bad',
						'result_code'           => 'bad code',
						'result_details_json'   => '{bad',
						'idempotency_key'       => 'bad id',
						'received_at'           => 'bad',
						'created_at'            => 'bad',
						'updated_at'            => 'bad',
						'row_version'           => 0,
					),
				),
				array(
					array(
						'public_id'            => 'bad',
						'provider'             => 'bad provider',
						'channel'              => 'bad channel',
						'operation'            => 'bad',
						'woo_order_id'         => 0,
						'amount_minor_units'   => -1,
						'currency'             => 'usd',
						'status'               => 'bad status',
						'masked_request_json'  => '{bad',
						'masked_response_json' => '{bad',
						'idempotency_key'      => 'bad id',
						'received_at'          => 'bad',
						'created_at'           => 'bad',
						'updated_at'           => 'bad',
						'row_version'          => 0,
					),
				),
				array()
			),
			'wp-bad_'
		);
		$errors = $build->errors();

		$this->assert_false( $build->is_valid() );
		$this->assert_true( in_array( 'table_prefix_invalid', $errors, true ) );
		$this->assert_true( in_array( 'pos_sync_row_0_public_id_invalid', $errors, true ) );
		$this->assert_true( in_array( 'pos_sync_row_0_reconciliation_status_invalid', $errors, true ) );
		$this->assert_true( in_array( 'pos_sync_row_0_result_details_json_invalid', $errors, true ) );
		$this->assert_true( in_array( 'payment_provider_row_0_operation_invalid', $errors, true ) );
		$this->assert_true( in_array( 'payment_provider_row_0_currency_invalid', $errors, true ) );
		$this->assert_true( in_array( 'payment_provider_row_0_masked_request_json_invalid', $errors, true ) );

		$failed_build = ( new PosPaymentLogQueryBuilder() )->build(
			PosPaymentLogPlan::failed( 'fixture_failed', array( 'bad_fixture' ) ),
			'wp_'
		);

		$this->assert_false( $failed_build->is_valid() );
		$this->assert_true( in_array( 'source_plan_failed', $failed_build->errors(), true ) );
	}

	private function log_plan(): PosPaymentLogPlan {
		return ( new PosPaymentLogPlanner() )->plan_transaction(
			$this->accepted_sale_plan(),
			array(
				'woo_order_id'         => '1001',
				'provider_location_id' => 'loc-sandbox-1',
				'received_at'          => '2026-06-06 14:00:00',
			)
		);
	}

	private function conflict_plan(): PosPaymentLogPlan {
		return ( new PosPaymentLogPlanner() )->plan_transaction(
			array(
				'status'  => 'conflict',
				'code'    => 'unmapped_pos_line',
				'details' => array(
					'ingestion'            => $this->sale_ingestion(),
					'inventoryTransitions' => array(),
				),
			),
			array(
				'received_at' => '2026-06-06 14:05:00',
			)
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
				'status'           => 'approved',
				'transactionId'    => 'sandbox-pos-txn-001',
				'amountMinorUnits' => 12500,
				'currency'         => 'USD',
			),
		);
	}
}
