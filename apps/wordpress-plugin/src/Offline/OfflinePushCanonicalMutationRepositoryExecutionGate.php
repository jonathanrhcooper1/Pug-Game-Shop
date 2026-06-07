<?php
/**
 * Offline push canonical mutation repository execution gate.
 *
 * @package TCGStorePlatform
 */

namespace TCGStorePlatform\Offline;

final class OfflinePushCanonicalMutationRepositoryExecutionGate {
	public function __construct(
		private bool $execution_enabled = false,
		private bool $transaction_adapter_configured = false
	) {
	}

	public function evaluate(
		OfflinePushCanonicalMutationRepositoryResult $repository_result
	): OfflinePushCanonicalMutationRepositoryExecutionResult {
		if ( $repository_result->is_rejected() ) {
			return OfflinePushCanonicalMutationRepositoryExecutionResult::rejected(
				$repository_result,
				array_merge(
					array( 'canonical_mutation_repository_staging_rejected' ),
					$repository_result->errors()
				)
			);
		}

		$block_reasons = array();

		if ( ! $this->execution_enabled ) {
			$block_reasons[] = 'canonical_mutation_repository_execution_disabled';
			$block_reasons[] = 'explicit_canonical_mutation_execution_required';
		}

		if ( ! $this->transaction_adapter_configured ) {
			$block_reasons[] = 'canonical_mutation_repository_transaction_adapter_deferred';
		}

		if ( 0 === $repository_result->mutation_query_count() ) {
			$block_reasons[] = 'canonical_mutation_repository_no_mutation_queries';
		}

		if ( array() !== $block_reasons ) {
			return OfflinePushCanonicalMutationRepositoryExecutionResult::blocked(
				$repository_result,
				$block_reasons
			);
		}

		return OfflinePushCanonicalMutationRepositoryExecutionResult::ready( $repository_result );
	}

	public function execution_enabled(): bool {
		return $this->execution_enabled;
	}

	public function transaction_adapter_configured(): bool {
		return $this->transaction_adapter_configured;
	}
}
