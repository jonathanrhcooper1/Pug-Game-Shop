<?php
/**
 * POS/payment log repository execution gate.
 *
 * @package TCGStorePlatform
 */

namespace TCGStorePlatform\Payments;

final class PosPaymentLogRepositoryExecutionGate {
	public function __construct(
		private bool $execution_enabled = false,
		private bool $transaction_adapter_configured = false
	) {
	}

	public function evaluate( PosPaymentLogRepositoryResult $repository_result ): PosPaymentLogRepositoryExecutionResult {
		if ( $repository_result->is_rejected() ) {
			return PosPaymentLogRepositoryExecutionResult::rejected(
				$repository_result,
				array_merge(
					array( 'payment_log_repository_staging_rejected' ),
					$repository_result->errors()
				)
			);
		}

		$block_reasons = array();

		if ( ! $this->execution_enabled ) {
			$block_reasons[] = 'payment_log_repository_execution_disabled';
			$block_reasons[] = 'explicit_payment_log_execution_required';
		}

		if ( ! $this->transaction_adapter_configured ) {
			$block_reasons[] = 'payment_log_repository_transaction_adapter_deferred';
		}

		if ( 0 === $repository_result->total_query_count() ) {
			$block_reasons[] = 'payment_log_repository_no_log_queries';
		}

		if ( array() !== $block_reasons ) {
			return PosPaymentLogRepositoryExecutionResult::blocked(
				$repository_result,
				$block_reasons
			);
		}

		return PosPaymentLogRepositoryExecutionResult::ready( $repository_result );
	}

	public function execution_enabled(): bool {
		return $this->execution_enabled;
	}

	public function transaction_adapter_configured(): bool {
		return $this->transaction_adapter_configured;
	}
}
