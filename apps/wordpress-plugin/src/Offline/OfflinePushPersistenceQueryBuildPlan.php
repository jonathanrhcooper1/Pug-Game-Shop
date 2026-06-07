<?php
/**
 * Planned offline push persistence SQL.
 *
 * @package TCGStorePlatform
 */

namespace TCGStorePlatform\Offline;

final class OfflinePushPersistenceQueryBuildPlan {
	/**
	 * @param list<array<string, mixed>> $operation_queries Prepared queue insert queries.
	 * @param list<array<string, mixed>> $conflict_queries Prepared conflict insert queries.
	 * @param list<string>              $errors Query planning errors.
	 * @param array<string, mixed>      $source_audit Persistence plan audit.
	 */
	private function __construct(
		private bool $is_valid,
		private string $queue_table_name,
		private string $conflict_table_name,
		private array $operation_queries,
		private array $conflict_queries,
		private array $errors,
		private array $source_audit
	) {
	}

	/**
	 * @param list<array<string, mixed>> $operation_queries Prepared queue insert queries.
	 * @param list<array<string, mixed>> $conflict_queries Prepared conflict insert queries.
	 */
	public static function accepted(
		OfflinePushPersistencePlan $persistence_plan,
		string $queue_table_name,
		string $conflict_table_name,
		array $operation_queries,
		array $conflict_queries
	): self {
		return new self(
			true,
			$queue_table_name,
			$conflict_table_name,
			array_values( $operation_queries ),
			array_values( $conflict_queries ),
			array(),
			$persistence_plan->audit_payload()
		);
	}

	/**
	 * @param list<string> $errors Query planning errors.
	 */
	public static function rejected(
		OfflinePushPersistencePlan $persistence_plan,
		string $queue_table_name,
		string $conflict_table_name,
		array $errors
	): self {
		return new self(
			false,
			$queue_table_name,
			$conflict_table_name,
			array(),
			array(),
			array_values( array_unique( $errors ) ),
			$persistence_plan->audit_payload()
		);
	}

	public function is_valid(): bool {
		return $this->is_valid;
	}

	public function queue_table_name(): string {
		return $this->queue_table_name;
	}

	public function conflict_table_name(): string {
		return $this->conflict_table_name;
	}

	/**
	 * @return list<array<string, mixed>>
	 */
	public function operation_queries(): array {
		return $this->operation_queries;
	}

	/**
	 * @return list<array<string, mixed>>
	 */
	public function conflict_queries(): array {
		return $this->conflict_queries;
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
			'action'                            => 'offline_push_persistence_sql_planned',
			'is_valid'                          => $this->is_valid,
			'queue_table_name'                  => $this->queue_table_name,
			'conflict_table_name'               => $this->conflict_table_name,
			'operation_query_count'             => count( $this->operation_queries ),
			'conflict_query_count'              => count( $this->conflict_queries ),
			'prepare_arg_count'                 => $this->prepare_arg_count(),
			'source'                            => $this->source_audit,
			'queue_write_execution_deferred'    => true,
			'conflict_write_execution_deferred' => true,
			'route_connected_writes_deferred'   => true,
			'push_repository_deferred'          => true,
			'errors'                            => $this->errors,
		);
	}

	private function prepare_arg_count(): int {
		$count = 0;

		foreach ( $this->operation_queries as $query ) {
			$count += count( $query['prepare_args'] ?? array() );
		}

		foreach ( $this->conflict_queries as $query ) {
			$count += count( $query['prepare_args'] ?? array() );
		}

		return $count;
	}
}
