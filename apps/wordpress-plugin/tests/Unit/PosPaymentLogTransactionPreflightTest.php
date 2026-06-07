<?php
/**
 * POS/payment log transaction preflight tests.
 *
 * @package TCGStorePlatform
 */

namespace TCGStorePlatform\Tests\Unit;

use TCGStorePlatform\Payments\PosPaymentLogPlan;
use TCGStorePlatform\Payments\PosPaymentLogQueryBuildPlan;
use TCGStorePlatform\Payments\PosPaymentLogRepository;
use TCGStorePlatform\Payments\PosPaymentLogRepositoryExecutionGate;
use TCGStorePlatform\Payments\PosPaymentLogRepositoryResult;
use TCGStorePlatform\Payments\PosPaymentLogTransactionPreflight;
use TCGStorePlatform\Tests\TestCase;

final class PosPaymentLogTransactionPreflightTest extends TestCase {
	public function test_preflight_inherits_default_execution_gate_blocks(): void {
		$repository_result = ( new PosPaymentLogRepository() )->stage( $this->query_plan() );
		$execution_result  = ( new PosPaymentLogRepositoryExecutionGate() )->evaluate( $repository_result );
		$result            = ( new PosPaymentLogTransactionPreflight() )->evaluate( $repository_result, $execution_result );
		$audit             = $result->audit_payload();

		$this->assert_same( 'blocked', $result->status() );
		$this->assert_true( $result->is_blocked() );
		$this->assert_false( $result->is_ready() );
		$this->assert_same( 2, $result->total_log_count() );
		$this->assert_same( 1, $result->pos_sync_log_count() );
		$this->assert_same( 1, $result->payment_provider_log_count() );
		$this->assert_same( 2, $result->ready_log_count() );
		$this->assert_same( 0, $result->blocked_log_count() );
		$this->assert_true( in_array( 'payment_log_repository_execution_disabled', $result->block_reasons(), true ) );
		$this->assert_same( 'pos_payment_log_transaction_preflight', $audit['action'] );
		$this->assert_same( 'ready', $audit['log_preflights'][0]['preflight_status'] );
		$this->assert_true( $audit['transaction_execution_deferred'] );
		$this->assert_true( $audit['production_capture_deferred'] );
	}

	public function test_preflight_reports_ready_for_supported_logs_when_gate_is_open(): void {
		$repository_result = ( new PosPaymentLogRepository() )->stage( $this->query_plan() );
		$execution_result  = ( new PosPaymentLogRepositoryExecutionGate( true, true ) )->evaluate( $repository_result );
		$result            = ( new PosPaymentLogTransactionPreflight() )->evaluate( $repository_result, $execution_result );

		$this->assert_same( 'ready', $result->status() );
		$this->assert_true( $result->is_ready() );
		$this->assert_same( array(), $result->block_reasons() );
		$this->assert_same( 2, $result->ready_log_count() );
		$this->assert_same( 0, $result->blocked_log_count() );
		$this->assert_same(
			array(
				'square-sandbox:evt-square-sandbox-sale-001:pos:line-0',
				'square-sandbox:evt-square-sandbox-sale-001:payment:capture',
			),
			$result->log_idempotency_keys()
		);
	}

	public function test_preflight_blocks_unsupported_query_kinds_even_when_gate_is_open(): void {
		$repository_result = PosPaymentLogRepositoryResult::deferred(
			$this->empty_query_plan(),
			array(
				array(
					'idempotency_key'   => 'fixture:unsupported',
					'query_kind'        => 'unsupported_insert',
					'prepare_arg_count' => 1,
				),
			),
			array()
		);
		$execution_result  = ( new PosPaymentLogRepositoryExecutionGate( true, true ) )->evaluate( $repository_result );
		$result            = ( new PosPaymentLogTransactionPreflight() )->evaluate( $repository_result, $execution_result );

		$this->assert_same( 'blocked', $result->status() );
		$this->assert_same( 0, $result->ready_log_count() );
		$this->assert_same( 1, $result->blocked_log_count() );
		$this->assert_true( in_array( 'pos_payment_log_query_kind_unsupported', $result->block_reasons(), true ) );
	}

	public function test_preflight_rejects_failed_repository_staging(): void {
		$repository_result = ( new PosPaymentLogRepository() )->stage( $this->rejected_query_plan() );
		$execution_result  = ( new PosPaymentLogRepositoryExecutionGate( true, true ) )->evaluate( $repository_result );
		$result            = ( new PosPaymentLogTransactionPreflight() )->evaluate( $repository_result, $execution_result );

		$this->assert_same( 'rejected', $result->status() );
		$this->assert_true( $result->is_rejected() );
		$this->assert_true( in_array( 'fixture_query_rejected', $result->errors(), true ) );
		$this->assert_true( in_array( 'pos_payment_log_transaction_preflight_rejected', $result->errors(), true ) );
	}

	private function query_plan(): PosPaymentLogQueryBuildPlan {
		return PosPaymentLogQueryBuildPlan::accepted(
			$this->log_plan(),
			array(
				'pos_sync_log'         => 'wp_tcg_pos_sync_log',
				'payment_provider_log' => 'wp_tcg_payment_provider_log',
			),
			array(
				array(
					'idempotency_key'       => 'square-sandbox:evt-square-sandbox-sale-001:pos:line-0',
					'reconciliation_status' => 'reconciled',
					'prepare_args'          => array_fill( 0, 18, 'arg' ),
				),
			),
			array(
				array(
					'idempotency_key' => 'square-sandbox:evt-square-sandbox-sale-001:payment:capture',
					'operation'       => 'capture',
					'status'          => 'approved',
					'prepare_args'    => array_fill( 0, 18, 'arg' ),
				),
			)
		);
	}

	private function empty_query_plan(): PosPaymentLogQueryBuildPlan {
		return PosPaymentLogQueryBuildPlan::accepted(
			$this->log_plan(),
			array(
				'pos_sync_log'         => 'wp_tcg_pos_sync_log',
				'payment_provider_log' => 'wp_tcg_payment_provider_log',
			),
			array(),
			array()
		);
	}

	private function rejected_query_plan(): PosPaymentLogQueryBuildPlan {
		return PosPaymentLogQueryBuildPlan::rejected(
			$this->log_plan(),
			array(),
			array( 'fixture_query_rejected' )
		);
	}

	private function log_plan(): PosPaymentLogPlan {
		return PosPaymentLogPlan::ready(
			'fixture_ready',
			array(),
			array(),
			array(
				array( 'action' => 'fixture_ready' ),
			)
		);
	}
}
