<?php
/**
 * POS/payment log transaction preflight.
 *
 * @package TCGStorePlatform
 */

namespace TCGStorePlatform\Payments;

final class PosPaymentLogTransactionPreflight {
	public function evaluate(
		PosPaymentLogRepositoryResult $repository_result,
		PosPaymentLogRepositoryExecutionResult $execution_result
	): PosPaymentLogTransactionPreflightResult {
		if ( $repository_result->is_rejected() || $execution_result->is_rejected() ) {
			return PosPaymentLogTransactionPreflightResult::rejected(
				$repository_result,
				$execution_result,
				array_merge(
					$repository_result->errors(),
					$execution_result->errors(),
					array( 'pos_payment_log_transaction_preflight_rejected' )
				)
			);
		}

		$log_preflights = array();
		$block_reasons  = $execution_result->block_reasons();

		foreach ( $repository_result->pos_sync_results() as $index => $pos_sync_result ) {
			$preflight       = $this->preflight_log( $pos_sync_result, 'pos_sync', $index );
			$log_preflights[] = $preflight;

			foreach ( $preflight['block_reasons'] as $reason ) {
				$block_reasons[] = (string) $reason;
			}
		}

		foreach ( $repository_result->payment_provider_results() as $index => $payment_provider_result ) {
			$preflight       = $this->preflight_log( $payment_provider_result, 'payment_provider', $index );
			$log_preflights[] = $preflight;

			foreach ( $preflight['block_reasons'] as $reason ) {
				$block_reasons[] = (string) $reason;
			}
		}

		if ( array() !== $block_reasons ) {
			return PosPaymentLogTransactionPreflightResult::blocked(
				$repository_result,
				$execution_result,
				$log_preflights,
				$block_reasons
			);
		}

		return PosPaymentLogTransactionPreflightResult::ready(
			$repository_result,
			$execution_result,
			$log_preflights
		);
	}

	/**
	 * @param array<string, mixed> $log_result Repository log staging result.
	 * @return array<string, mixed>
	 */
	private function preflight_log( array $log_result, string $log_type, int $index ): array {
		$query_kind    = (string) ( $log_result['query_kind'] ?? '' );
		$block_reasons = $this->block_reasons_for_query_kind( $query_kind );

		return array(
			'idempotency_key'                           => (string) ( $log_result['idempotency_key'] ?? '' ),
			'log_type'                                  => $log_type,
			'query_kind'                                => $query_kind,
			'query_index'                               => $index,
			'preflight_status'                          => array() === $block_reasons ? 'ready' : 'blocked',
			'block_reasons'                             => $block_reasons,
			'prepare_arg_count'                         => $this->non_negative_int( $log_result['prepare_arg_count'] ?? 0 ),
			'rows_affected'                             => 0,
			'transaction_execution_deferred'            => true,
			'pos_sync_write_execution_deferred'         => true,
			'payment_provider_write_execution_deferred' => true,
			'route_connected_writes_deferred'           => true,
			'provider_inventory_write_deferred'         => true,
			'payment_capture_execution_deferred'        => true,
			'production_capture_deferred'               => true,
		);
	}

	/**
	 * @return list<string>
	 */
	private function block_reasons_for_query_kind( string $query_kind ): array {
		return match ( $query_kind ) {
			'pos_sync_insert',
			'payment_provider_insert' => array(),
			default                   => array( 'pos_payment_log_query_kind_unsupported' ),
		};
	}

	private function non_negative_int( mixed $value ): int {
		if ( is_int( $value ) && 0 <= $value ) {
			return $value;
		}

		if ( is_string( $value ) && 1 === preg_match( '/^\d+$/', $value ) ) {
			return (int) $value;
		}

		return 0;
	}
}
