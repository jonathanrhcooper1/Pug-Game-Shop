<?php
/**
 * Offline push persistence repository result.
 *
 * @package TCGStorePlatform
 */

namespace TCGStorePlatform\Offline;

final class OfflinePushPersistenceRepositoryResult {
	public const STATUS_PERSISTED = 'persisted';
	public const STATUS_REJECTED  = 'rejected';

	/**
	 * @param list<array<string, mixed>> $operation_results Per-operation insert results.
	 * @param list<array<string, mixed>> $conflict_results Per-conflict insert results.
	 * @param list<string>              $errors Repository errors.
	 * @param array<string, mixed>      $query_audit Push persistence query audit.
	 */
	private function __construct(
		private string $status,
		private int $operation_rows_affected,
		private int $conflict_rows_affected,
		private array $operation_results,
		private array $conflict_results,
		private array $errors,
		private array $query_audit
	) {
	}

	/**
	 * @param list<array<string, mixed>> $operation_results Per-operation insert results.
	 * @param list<array<string, mixed>> $conflict_results Per-conflict insert results.
	 */
	public static function persisted(
		OfflinePushPersistenceQueryBuildPlan $query_plan,
		array $operation_results,
		array $conflict_results,
		int $operation_rows_affected,
		int $conflict_rows_affected
	): self {
		return new self(
			self::STATUS_PERSISTED,
			$operation_rows_affected,
			$conflict_rows_affected,
			array_values( $operation_results ),
			array_values( $conflict_results ),
			array(),
			$query_plan->audit_payload()
		);
	}

	/**
	 * @param list<string>              $errors Repository errors.
	 * @param list<array<string, mixed>> $operation_results Per-operation insert results.
	 * @param list<array<string, mixed>> $conflict_results Per-conflict insert results.
	 */
	public static function rejected(
		OfflinePushPersistenceQueryBuildPlan $query_plan,
		array $errors,
		array $operation_results = array(),
		array $conflict_results = array(),
		int $operation_rows_affected = 0,
		int $conflict_rows_affected = 0
	): self {
		return new self(
			self::STATUS_REJECTED,
			$operation_rows_affected,
			$conflict_rows_affected,
			array_values( $operation_results ),
			array_values( $conflict_results ),
			array_values( array_unique( $errors ) ),
			$query_plan->audit_payload()
		);
	}

	public function status(): string {
		return $this->status;
	}

	public function is_persisted(): bool {
		return self::STATUS_PERSISTED === $this->status;
	}

	public function is_rejected(): bool {
		return self::STATUS_REJECTED === $this->status;
	}

	public function rows_affected(): int {
		return $this->operation_rows_affected + $this->conflict_rows_affected;
	}

	public function operation_rows_affected(): int {
		return $this->operation_rows_affected;
	}

	public function conflict_rows_affected(): int {
		return $this->conflict_rows_affected;
	}

	public function operation_replay_count(): int {
		return $this->non_negative_int( $this->query_audit['source']['operation_replay_count'] ?? 0 );
	}

	/**
	 * @return list<string>
	 */
	public function operation_replay_ids(): array {
		return $this->string_list( $this->query_audit['source']['operation_replay_ids'] ?? array() );
	}

	/**
	 * @return list<array<string, mixed>>
	 */
	public function operation_results(): array {
		return $this->operation_results;
	}

	/**
	 * @return list<array<string, mixed>>
	 */
	public function conflict_results(): array {
		return $this->conflict_results;
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
			'action'                           => 'offline_push_persistence_repository',
			'status'                           => $this->status,
			'is_persisted'                     => $this->is_persisted(),
			'is_rejected'                      => $this->is_rejected(),
			'operation_query_count'            => count( $this->operation_results ),
			'conflict_query_count'             => count( $this->conflict_results ),
			'operation_replay_count'           => $this->operation_replay_count(),
			'operation_replay_ids'             => $this->operation_replay_ids(),
			'operation_rows_affected'          => $this->operation_rows_affected,
			'conflict_rows_affected'           => $this->conflict_rows_affected,
			'rows_affected'                    => $this->rows_affected(),
			'query'                            => $this->query_audit,
			'operation_results'                => $this->operation_results,
			'conflict_results'                 => $this->conflict_results,
			'explicit_execution_required'      => true,
			'default_route_execution_deferred' => true,
			'route_connected_writes_deferred'  => true,
			'queue_replay_deferred'            => true,
			'canonical_mutations_deferred'     => true,
			'errors'                           => $this->errors,
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

	/**
	 * @return list<string>
	 */
	private function string_list( mixed $value ): array {
		if ( ! is_array( $value ) ) {
			return array();
		}

		$strings = array();

		foreach ( $value as $item ) {
			$item = trim( (string) $item );

			if ( '' !== $item ) {
				$strings[] = $item;
			}
		}

		return array_values( array_unique( $strings ) );
	}
}
