<?php
/**
 * Offline push canonical mutation repository staging result.
 *
 * @package TCGStorePlatform
 */

namespace TCGStorePlatform\Offline;

final class OfflinePushCanonicalMutationRepositoryResult {
	public const STATUS_DEFERRED = 'deferred';
	public const STATUS_REJECTED = 'rejected';

	/**
	 * @param list<array<string, mixed>> $mutation_results Per-query repository staging results.
	 * @param list<string>              $errors Repository errors.
	 * @param array<string, mixed>      $query_audit Canonical mutation SQL query audit.
	 */
	private function __construct(
		private string $status,
		private array $mutation_results,
		private array $errors,
		private array $query_audit
	) {
	}

	/**
	 * @param list<array<string, mixed>> $mutation_results Per-query repository staging results.
	 */
	public static function deferred(
		OfflinePushCanonicalMutationQueryBuildPlan $query_plan,
		array $mutation_results
	): self {
		return new self(
			self::STATUS_DEFERRED,
			array_values( $mutation_results ),
			array(),
			$query_plan->audit_payload()
		);
	}

	/**
	 * @param list<string> $errors Repository errors.
	 */
	public static function rejected(
		OfflinePushCanonicalMutationQueryBuildPlan $query_plan,
		array $errors
	): self {
		return new self(
			self::STATUS_REJECTED,
			array(),
			array_values( array_unique( $errors ) ),
			$query_plan->audit_payload()
		);
	}

	public function status(): string {
		return $this->status;
	}

	public function is_deferred(): bool {
		return self::STATUS_DEFERRED === $this->status;
	}

	public function is_rejected(): bool {
		return self::STATUS_REJECTED === $this->status;
	}

	public function rows_affected(): int {
		return 0;
	}

	public function mutation_query_count(): int {
		return count( $this->mutation_results );
	}

	public function prepare_arg_count(): int {
		$count = 0;

		foreach ( $this->mutation_results as $result ) {
			$count += $this->non_negative_int( $result['prepare_arg_count'] ?? 0 );
		}

		return $count;
	}

	/**
	 * @return list<string>
	 */
	public function mutation_operation_ids(): array {
		$ids = array();

		foreach ( $this->mutation_results as $result ) {
			$operation_id = trim( (string) ( $result['client_operation_id'] ?? '' ) );

			if ( '' !== $operation_id ) {
				$ids[] = $operation_id;
			}
		}

		return array_values( array_unique( $ids ) );
	}

	/**
	 * @return list<array<string, mixed>>
	 */
	public function mutation_results(): array {
		return $this->mutation_results;
	}

	/**
	 * @return list<string>
	 */
	public function errors(): array {
		return $this->errors;
	}

	/**
	 * @return array<string, mixed>
	 */
	public function audit_payload(): array {
		return array(
			'action'                                 => 'offline_push_canonical_mutation_repository',
			'status'                                 => $this->status,
			'is_deferred'                            => $this->is_deferred(),
			'is_rejected'                            => $this->is_rejected(),
			'mutation_query_count'                   => $this->mutation_query_count(),
			'mutation_operation_ids'                 => $this->mutation_operation_ids(),
			'prepare_arg_count'                      => $this->prepare_arg_count(),
			'rows_affected'                          => $this->rows_affected(),
			'query'                                  => $this->query_audit,
			'mutation_results'                       => $this->mutation_results,
			'explicit_execution_required'            => true,
			'inventory_write_execution_deferred'     => true,
			'event_registration_write_deferred'      => true,
			'customer_credit_ledger_write_deferred'  => true,
			'canonical_mutation_repository_deferred' => true,
			'route_connected_writes_deferred'        => true,
			'queue_replay_deferred'                  => true,
			'errors'                                 => $this->errors,
		);
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
