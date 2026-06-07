<?php
/**
 * Offline push canonical mutation transaction preflight result.
 *
 * @package TCGStorePlatform
 */

namespace TCGStorePlatform\Offline;

final class OfflinePushCanonicalMutationTransactionPreflightResult {
	public const STATUS_BLOCKED  = 'blocked';
	public const STATUS_READY    = 'ready';
	public const STATUS_REJECTED = 'rejected';

	/**
	 * @param list<array<string, mixed>> $mutation_preflights Per-mutation preflight results.
	 * @param list<string>              $block_reasons Preflight block reasons.
	 * @param list<string>              $errors Preflight errors.
	 * @param array<string, mixed>      $repository_audit Repository staging audit.
	 * @param array<string, mixed>      $execution_audit Execution gate audit.
	 */
	private function __construct(
		private string $status,
		private array $mutation_preflights,
		private array $block_reasons,
		private array $errors,
		private array $repository_audit,
		private array $execution_audit
	) {
	}

	/**
	 * @param list<array<string, mixed>> $mutation_preflights Per-mutation preflight results.
	 * @param list<string>              $block_reasons Preflight block reasons.
	 */
	public static function blocked(
		OfflinePushCanonicalMutationRepositoryResult $repository_result,
		OfflinePushCanonicalMutationRepositoryExecutionResult $execution_result,
		array $mutation_preflights,
		array $block_reasons
	): self {
		return new self(
			self::STATUS_BLOCKED,
			array_values( $mutation_preflights ),
			array_values( array_unique( $block_reasons ) ),
			array(),
			$repository_result->audit_payload(),
			$execution_result->audit_payload()
		);
	}

	/**
	 * @param list<array<string, mixed>> $mutation_preflights Per-mutation preflight results.
	 */
	public static function ready(
		OfflinePushCanonicalMutationRepositoryResult $repository_result,
		OfflinePushCanonicalMutationRepositoryExecutionResult $execution_result,
		array $mutation_preflights
	): self {
		return new self(
			self::STATUS_READY,
			array_values( $mutation_preflights ),
			array(),
			array(),
			$repository_result->audit_payload(),
			$execution_result->audit_payload()
		);
	}

	/**
	 * @param list<string> $errors Preflight errors.
	 */
	public static function rejected(
		OfflinePushCanonicalMutationRepositoryResult $repository_result,
		OfflinePushCanonicalMutationRepositoryExecutionResult $execution_result,
		array $errors
	): self {
		return new self(
			self::STATUS_REJECTED,
			array(),
			array(),
			array_values( array_unique( $errors ) ),
			$repository_result->audit_payload(),
			$execution_result->audit_payload()
		);
	}

	public function status(): string {
		return $this->status;
	}

	public function is_blocked(): bool {
		return self::STATUS_BLOCKED === $this->status;
	}

	public function is_ready(): bool {
		return self::STATUS_READY === $this->status;
	}

	public function is_rejected(): bool {
		return self::STATUS_REJECTED === $this->status;
	}

	/**
	 * @return list<array<string, mixed>>
	 */
	public function mutation_preflights(): array {
		return $this->mutation_preflights;
	}

	/**
	 * @return list<string>
	 */
	public function block_reasons(): array {
		return $this->block_reasons;
	}

	/**
	 * @return list<string>
	 */
	public function errors(): array {
		return $this->errors;
	}

	public function mutation_query_count(): int {
		return count( $this->mutation_preflights );
	}

	public function ready_mutation_count(): int {
		return $this->count_by_status( 'ready' );
	}

	public function blocked_mutation_count(): int {
		return $this->count_by_status( 'blocked' );
	}

	public function rows_affected(): int {
		return 0;
	}

	/**
	 * @return list<string>
	 */
	public function mutation_operation_ids(): array {
		$ids = array();

		foreach ( $this->mutation_preflights as $preflight ) {
			$operation_id = trim( (string) ( $preflight['client_operation_id'] ?? '' ) );

			if ( '' !== $operation_id ) {
				$ids[] = $operation_id;
			}
		}

		return array_values( array_unique( $ids ) );
	}

	/**
	 * @return array<string, mixed>
	 */
	public function audit_payload(): array {
		return array(
			'action'                          => 'offline_push_canonical_mutation_transaction_preflight',
			'status'                          => $this->status,
			'is_blocked'                      => $this->is_blocked(),
			'is_ready'                        => $this->is_ready(),
			'is_rejected'                     => $this->is_rejected(),
			'mutation_query_count'            => $this->mutation_query_count(),
			'ready_mutation_count'            => $this->ready_mutation_count(),
			'blocked_mutation_count'          => $this->blocked_mutation_count(),
			'mutation_operation_ids'          => $this->mutation_operation_ids(),
			'rows_affected'                   => $this->rows_affected(),
			'block_reasons'                   => $this->block_reasons,
			'errors'                          => $this->errors,
			'mutation_preflights'             => $this->mutation_preflights,
			'repository'                      => $this->repository_audit,
			'execution_gate'                  => $this->execution_audit,
			'transaction_execution_deferred'  => true,
			'route_connected_writes_deferred' => true,
			'queue_replay_deferred'           => true,
		);
	}

	private function count_by_status( string $status ): int {
		$count = 0;

		foreach ( $this->mutation_preflights as $preflight ) {
			if ( (string) ( $preflight['preflight_status'] ?? '' ) === $status ) {
				++$count;
			}
		}

		return $count;
	}
}
