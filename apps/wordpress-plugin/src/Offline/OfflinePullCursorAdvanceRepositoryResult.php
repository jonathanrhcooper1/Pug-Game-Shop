<?php
/**
 * Offline pull cursor advancement repository result.
 *
 * @package TCGStorePlatform
 */

namespace TCGStorePlatform\Offline;

final class OfflinePullCursorAdvanceRepositoryResult {
	public const STATUS_ADVANCED = 'advanced';
	public const STATUS_REJECTED = 'rejected';

	/**
	 * @param list<array<string, mixed>> $cursor_results Per-cursor execution results.
	 * @param list<string>              $errors         Repository errors.
	 * @param array<string, mixed>      $query_audit    Cursor query build audit.
	 */
	private function __construct(
		private string $status,
		private int $rows_affected,
		private array $cursor_results,
		private array $errors,
		private array $query_audit
	) {
	}

	/**
	 * @param list<array<string, mixed>> $cursor_results Per-cursor execution results.
	 */
	public static function advanced(
		OfflinePullCursorAdvanceQueryBuildPlan $query_plan,
		array $cursor_results,
		int $rows_affected
	): self {
		return new self(
			self::STATUS_ADVANCED,
			$rows_affected,
			array_values( $cursor_results ),
			array(),
			$query_plan->audit_payload()
		);
	}

	/**
	 * @param list<string>              $errors         Repository errors.
	 * @param list<array<string, mixed>> $cursor_results Per-cursor execution results.
	 */
	public static function rejected(
		OfflinePullCursorAdvanceQueryBuildPlan $query_plan,
		array $errors,
		array $cursor_results = array(),
		int $rows_affected = 0
	): self {
		return new self(
			self::STATUS_REJECTED,
			$rows_affected,
			array_values( $cursor_results ),
			array_values( array_unique( $errors ) ),
			$query_plan->audit_payload()
		);
	}

	public function status(): string {
		return $this->status;
	}

	public function is_advanced(): bool {
		return self::STATUS_ADVANCED === $this->status;
	}

	public function is_rejected(): bool {
		return self::STATUS_REJECTED === $this->status;
	}

	public function rows_affected(): int {
		return $this->rows_affected;
	}

	/**
	 * @return list<array<string, mixed>>
	 */
	public function cursor_results(): array {
		return $this->cursor_results;
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
			'action'                           => 'offline_pull_cursor_advance_repository',
			'status'                           => $this->status,
			'is_advanced'                      => $this->is_advanced(),
			'is_rejected'                      => $this->is_rejected(),
			'cursor_query_count'               => count( $this->cursor_results ),
			'rows_affected'                    => $this->rows_affected,
			'query'                            => $this->query_audit,
			'cursor_results'                   => $this->cursor_results,
			'explicit_execution_required'      => true,
			'default_route_execution_deferred' => true,
			'route_connected_writes_deferred'  => true,
			'errors'                           => $this->errors,
		);
	}
}
