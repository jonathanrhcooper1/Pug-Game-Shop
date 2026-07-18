<?php
/**
 * POS/payment log repository execution gate tests.
 *
 * @package TCGStorePlatform
 */

namespace TCGStorePlatform\Tests\Unit;

use TCGStorePlatform\Payments\PosPaymentLogPlan;
use TCGStorePlatform\Payments\PosPaymentLogQueryBuilder;
use TCGStorePlatform\Payments\PosPaymentLogRepository;
use TCGStorePlatform\Payments\PosPaymentLogRepositoryExecutionGate;
use TCGStorePlatform\Tests\TestCase;

final class PosPaymentLogRepositoryExecutionGateTest extends TestCase {
	public function test_gate_blocks_staged_logs_by_default(): void {
		$repository_result = ( new PosPaymentLogRepository() )->stage( $this->accepted_query_plan() );
		$result            = ( new PosPaymentLogRepositoryExecutionGate() )->evaluate( $repository_result );
		$audit             = $result->audit_payload();

		$this->assert_same( 'blocked', $result->status() );
		$this->assert_true( $result->is_blocked() );
		$this->assert_false( $result->is_ready() );
		$this->assert_false( $result->is_rejected() );
		$this->assert_same( 1, $result->pos_sync_query_count() );
		$this->assert_same( 1, $result->payment_provider_query_count() );
		$this->assert_same( 2, $result->total_query_count() );
		$this->assert_same( 36, $result->prepare_arg_count() );
		$this->assert_same( 0, $result->rows_affected() );
		$this->assert_true( in_array( 'payment_log_repository_execution_disabled', $result->block_reasons(), true ) );
		$this->assert_true( in_array( 'explicit_payment_log_execution_required', $result->block_reasons(), true ) );
		$this->assert_true( in_array( 'payment_log_repository_transaction_adapter_deferred', $result->block_reasons(), true ) );
		$this->assert_same( 'pos_payment_log_repository_execution_gate', $audit['action'] );
		$this->assert_true( $audit['payment_log_repository_execution_deferred'] );
		$this->assert_true( $audit['payment_log_repository_transaction_deferred'] );
		$this->assert_true( $audit['route_connected_writes_deferred'] );
		$this->assert_true( $audit['production_capture_deferred'] );
	}

	public function test_gate_reports_ready_when_execution_and_transaction_adapter_are_explicitly_enabled(): void {
		$repository_result = ( new PosPaymentLogRepository() )->stage( $this->accepted_query_plan() );
		$result            = ( new PosPaymentLogRepositoryExecutionGate( true, true ) )->evaluate( $repository_result );
		$audit             = $result->audit_payload();

		$this->assert_same( 'ready', $result->status() );
		$this->assert_false( $result->is_blocked() );
		$this->assert_true( $result->is_ready() );
		$this->assert_same( array(), $result->block_reasons() );
		$this->assert_same( 2, $result->total_query_count() );
		$this->assert_true( $audit['payment_log_repository_execution_deferred'] );
		$this->assert_false( $audit['payment_log_repository_transaction_deferred'] );
	}

	public function test_gate_blocks_empty_plans_without_log_queries(): void {
		$repository_result = ( new PosPaymentLogRepository() )->stage( $this->empty_query_plan() );
		$result            = ( new PosPaymentLogRepositoryExecutionGate( true, true ) )->evaluate( $repository_result );

		$this->assert_same( 'blocked', $result->status() );
		$this->assert_same( 0, $result->total_query_count() );
		$this->assert_true( in_array( 'payment_log_repository_no_log_queries', $result->block_reasons(), true ) );
	}

	public function test_gate_rejects_failed_repository_staging(): void {
		$repository_result = ( new PosPaymentLogRepository() )->stage( $this->rejected_query_plan() );
		$result            = ( new PosPaymentLogRepositoryExecutionGate( true, true ) )->evaluate( $repository_result );
		$audit             = $result->audit_payload();

		$this->assert_same( 'rejected', $result->status() );
		$this->assert_true( $result->is_rejected() );
		$this->assert_same( 0, $result->total_query_count() );
		$this->assert_true( in_array( 'payment_log_repository_staging_rejected', $result->errors(), true ) );
		$this->assert_true( in_array( 'fixture_query_rejected', $result->errors(), true ) );
		$this->assert_same( 'rejected', $audit['status'] );
		$this->assert_true( $audit['is_rejected'] );
	}

	private function accepted_query_plan(): \TCGStorePlatform\Payments\PosPaymentLogQueryBuildPlan {
		return ( new PosPaymentLogQueryBuilder() )->build(
			PosPaymentLogPlan::ready(
				'fixture_ready',
				array(
					array(
						'public_id'                => '11111111-1111-4111-8111-111111111111',
						'provider'                 => 'square-sandbox',
						'provider_location_id'     => 'loc-sandbox-1',
						'external_transaction_id'  => 'sandbox-pos-txn-001',
						'external_order_id'        => 'sandbox-order-001',
						'external_line_item_id'    => 'line-0',
						'inventory_item_id'        => 42,
						'barcode'                  => 'PKM-BASE-004-HOLO',
						'reconciliation_status'    => 'reconciled',
						'result_code'              => 'pos_sale_reconciled',
						'result_details_json'      => '{}',
						'idempotency_key'          => 'square-sandbox:evt-square-sandbox-sale-001:pos:line-0',
						'occurred_at'              => '2026-06-06 14:00:00',
						'received_at'              => '2026-06-06 14:00:00',
						'reconciled_at'            => '2026-06-06 14:00:00',
						'created_at'               => '2026-06-06 14:00:00',
						'updated_at'               => '2026-06-06 14:00:00',
						'row_version'              => 1,
					),
				),
				array(
					array(
						'public_id'               => '22222222-2222-4222-8222-222222222222',
						'provider'                => 'square-sandbox',
						'channel'                 => 'pos',
						'operation'               => 'capture',
						'woo_order_id'            => 1001,
						'external_transaction_id' => 'sandbox-pos-txn-001',
						'external_payment_id'     => 'sandbox-payment-001',
						'external_refund_id'      => null,
						'amount_minor_units'      => 12500,
						'currency'                => 'USD',
						'status'                  => 'approved',
						'masked_request_json'     => '{}',
						'masked_response_json'    => '{}',
						'idempotency_key'         => 'square-sandbox:evt-square-sandbox-sale-001:payment:capture',
						'occurred_at'             => '2026-06-06 14:00:00',
						'received_at'             => '2026-06-06 14:00:00',
						'created_at'              => '2026-06-06 14:00:00',
						'updated_at'              => '2026-06-06 14:00:00',
						'row_version'             => 1,
					),
				),
				array(
					array( 'action' => 'fixture_ready' ),
				)
			),
			'wp_'
		);
	}

	private function empty_query_plan(): \TCGStorePlatform\Payments\PosPaymentLogQueryBuildPlan {
		return ( new PosPaymentLogQueryBuilder() )->build(
			PosPaymentLogPlan::ready( 'fixture_empty', array(), array(), array() ),
			'wp_'
		);
	}

	private function rejected_query_plan(): \TCGStorePlatform\Payments\PosPaymentLogQueryBuildPlan {
		return \TCGStorePlatform\Payments\PosPaymentLogQueryBuildPlan::rejected(
			PosPaymentLogPlan::ready( 'fixture_rejected', array(), array(), array() ),
			array(),
			array( 'fixture_query_rejected' )
		);
	}
}
