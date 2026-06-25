<?php
/**
 * POS/payment log staged transaction executor.
 *
 * @package TCGStorePlatform
 */

namespace TCGStorePlatform\Payments;

final class PosPaymentLogTransactionExecutor {
	private PosPaymentLogExecutionRepository $log_repository;

	public function __construct(
		private \wpdb $database,
		?PosPaymentLogExecutionRepository $log_repository = null
	) {
		$this->log_repository = $log_repository ?? new PosPaymentLogExecutionRepository( $database );
	}

	public function execute(
		PosPaymentLogQueryBuildPlan $query_plan,
		PosPaymentLogTransactionPreflightResult $preflight_result
	): PosPaymentLogTransactionExecutionResult {
		if ( ! $query_plan->is_valid() ) {
			return PosPaymentLogTransactionExecutionResult::rejected(
				$query_plan,
				$preflight_result,
				$query_plan->errors()
			);
		}

		if ( ! $preflight_result->is_ready() ) {
			return PosPaymentLogTransactionExecutionResult::rejected(
				$query_plan,
				$preflight_result,
				array_merge(
					$preflight_result->errors(),
					$preflight_result->block_reasons(),
					array( 'pos_payment_log_transaction_not_ready' )
				)
			);
		}

		$commands = array();

		if ( false === $this->run_transaction_command( 'START TRANSACTION', $commands ) ) {
			return PosPaymentLogTransactionExecutionResult::rejected(
				$query_plan,
				$preflight_result,
				array( 'pos_payment_log_transaction_begin_failed' ),
				$commands
			);
		}

		$repository_result = $this->log_repository->execute( $query_plan, $preflight_result );

		if ( ! $repository_result->is_persisted() ) {
			$rollback_result = $this->run_transaction_command( 'ROLLBACK', $commands );
			$errors          = array_merge(
				$repository_result->errors(),
				array( 'pos_payment_log_transaction_repository_rejected' )
			);

			if ( false === $rollback_result ) {
				$errors[] = 'pos_payment_log_transaction_rollback_failed';
			}

			return PosPaymentLogTransactionExecutionResult::rolled_back(
				$query_plan,
				$preflight_result,
				$repository_result,
				$errors,
				$commands
			);
		}

		if ( false === $this->run_transaction_command( 'COMMIT', $commands ) ) {
			$rollback_result = $this->run_transaction_command( 'ROLLBACK', $commands );
			$errors          = array( 'pos_payment_log_transaction_commit_failed' );

			if ( false === $rollback_result ) {
				$errors[] = 'pos_payment_log_transaction_rollback_failed';
			}

			return PosPaymentLogTransactionExecutionResult::rolled_back(
				$query_plan,
				$preflight_result,
				$repository_result,
				$errors,
				$commands
			);
		}

		return PosPaymentLogTransactionExecutionResult::committed(
			$query_plan,
			$preflight_result,
			$repository_result,
			$commands
		);
	}

	/**
	 * @param list<string> $commands Transaction commands already attempted.
	 */
	private function run_transaction_command( string $command, array &$commands ): int|false {
		$commands[] = $command;
		$result     = $this->database->query( $command ); // phpcs:ignore WordPress.DB.PreparedSQL.NotPrepared

		return false === $result ? false : (int) $result;
	}
}
