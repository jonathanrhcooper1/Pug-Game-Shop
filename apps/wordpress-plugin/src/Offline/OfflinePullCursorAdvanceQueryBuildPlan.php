<?php
/**
 * Planned offline pull cursor advancement SQL.
 *
 * @package TCGStorePlatform
 */

namespace TCGStorePlatform\Offline;

final class OfflinePullCursorAdvanceQueryBuildPlan {
	/**
	 * @param list<array<string, mixed>> $cursor_queries Prepared cursor queries.
	 * @param list<string>              $errors         Build errors.
	 * @param array<string, mixed>      $source_audit   Cursor advancement plan audit.
	 */
	private function __construct(
		private bool $is_valid,
		private string $table_name,
		private array $cursor_queries,
		private array $errors,
		private array $source_audit
	) {
	}

	/**
	 * @param list<array<string, mixed>> $cursor_queries Prepared cursor queries.
	 */
	public static function accepted(
		OfflinePullCursorAdvancePlan $advance_plan,
		array $cursor_queries
	): self {
		return new self(
			true,
			$advance_plan->table_name(),
			array_values( $cursor_queries ),
			array(),
			$advance_plan->audit_payload()
		);
	}

	/**
	 * @param list<string> $errors Build errors.
	 */
	public static function rejected(
		OfflinePullCursorAdvancePlan $advance_plan,
		array $errors
	): self {
		return new self(
			false,
			$advance_plan->table_name(),
			array(),
			array_values( array_unique( $errors ) ),
			$advance_plan->audit_payload()
		);
	}

	public function is_valid(): bool {
		return $this->is_valid;
	}

	public function table_name(): string {
		return $this->table_name;
	}

	/**
	 * @return list<array<string, mixed>>
	 */
	public function cursor_queries(): array {
		return $this->cursor_queries;
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
			'action'                          => 'offline_pull_cursor_advance_sql_planned',
			'is_valid'                        => $this->is_valid,
			'table_name'                      => $this->table_name,
			'query_count'                     => count( $this->cursor_queries ),
			'prepare_arg_count'               => $this->prepare_arg_count(),
			'source'                          => $this->source_audit,
			'cursor_write_execution_deferred' => true,
			'route_connected_writes_deferred' => true,
			'cursor_repository_deferred'      => true,
			'errors'                          => $this->errors,
		);
	}

	private function prepare_arg_count(): int {
		$count = 0;

		foreach ( $this->cursor_queries as $query ) {
			$count += count( $query['prepare_args'] ?? array() );
		}

		return $count;
	}
}
