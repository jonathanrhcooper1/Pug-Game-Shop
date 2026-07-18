<?php
/**
 * Offline push canonical mutation transaction preflight.
 *
 * @package TCGStorePlatform
 */

namespace TCGStorePlatform\Offline;

final class OfflinePushCanonicalMutationTransactionPreflight {
	public function evaluate(
		OfflinePushCanonicalMutationRepositoryResult $repository_result,
		OfflinePushCanonicalMutationRepositoryExecutionResult $execution_result
	): OfflinePushCanonicalMutationTransactionPreflightResult {
		if ( $repository_result->is_rejected() || $execution_result->is_rejected() ) {
			return OfflinePushCanonicalMutationTransactionPreflightResult::rejected(
				$repository_result,
				$execution_result,
				array_merge(
					$repository_result->errors(),
					$execution_result->errors(),
					array( 'canonical_mutation_transaction_preflight_rejected' )
				)
			);
		}

		$mutation_preflights = array();
		$block_reasons       = $execution_result->block_reasons();

		foreach ( $repository_result->mutation_results() as $index => $mutation_result ) {
			$preflight             = $this->preflight_mutation( $mutation_result, $index );
			$mutation_preflights[] = $preflight;

			foreach ( $preflight['block_reasons'] as $reason ) {
				$block_reasons[] = (string) $reason;
			}
		}

		if ( array() !== $block_reasons ) {
			return OfflinePushCanonicalMutationTransactionPreflightResult::blocked(
				$repository_result,
				$execution_result,
				$mutation_preflights,
				$block_reasons
			);
		}

		return OfflinePushCanonicalMutationTransactionPreflightResult::ready(
			$repository_result,
			$execution_result,
			$mutation_preflights
		);
	}

	/**
	 * @param array<string, mixed> $mutation_result Repository mutation staging result.
	 * @return array<string, mixed>
	 */
	private function preflight_mutation( array $mutation_result, int $index ): array {
		$query_kind    = (string) ( $mutation_result['query_kind'] ?? '' );
		$mutation_type = (string) ( $mutation_result['mutation_type'] ?? '' );
		$block_reasons = $this->block_reasons_for_query_kind( $query_kind );

		return array(
			'client_operation_id'             => (string) ( $mutation_result['client_operation_id'] ?? '' ),
			'mutation_type'                   => $mutation_type,
			'query_kind'                      => $query_kind,
			'mutation_query_index'            => $index,
			'preflight_status'                => array() === $block_reasons ? 'ready' : 'blocked',
			'block_reasons'                   => $block_reasons,
			'prepare_arg_count'               => $this->non_negative_int( $mutation_result['prepare_arg_count'] ?? 0 ),
			'rows_affected'                   => 0,
			'transaction_execution_deferred'  => true,
			'route_connected_writes_deferred' => true,
		);
	}

	/**
	 * @return list<string>
	 */
	private function block_reasons_for_query_kind( string $query_kind ): array {
		return match ( $query_kind ) {
			'inventory_status_guarded_update' => array(),
			'event_registration_guard_lookup' => array( 'event_registration_write_plan_deferred' ),
			'customer_credit_guard_lookup'    => array( 'customer_credit_ledger_write_plan_deferred' ),
			default                           => array( 'canonical_mutation_query_kind_unsupported' ),
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
