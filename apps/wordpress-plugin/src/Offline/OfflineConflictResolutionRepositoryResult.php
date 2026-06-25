<?php
/**
 * Offline conflict resolution repository result.
 *
 * @package TCGStorePlatform
 */

namespace TCGStorePlatform\Offline;

final class OfflineConflictResolutionRepositoryResult {
	public const STATUS_APPLIED  = 'applied';
	public const STATUS_STALE    = 'stale';
	public const STATUS_REJECTED = 'rejected';

	/**
	 * @param list<string>         $errors Repository errors.
	 * @param array<string, mixed> $response_payload Response payload.
	 * @param array<string, mixed> $query_audit Query audit payload.
	 */
	private function __construct(
		private string $status,
		private ?int $rows_affected,
		private array $errors,
		private array $response_payload,
		private array $query_audit
	) {
	}

	public static function applied(
		OfflineConflictResolutionPlan $resolution_plan,
		OfflineConflictResolutionQueryPlan $query_plan,
		int $rows_affected
	): self {
		return new self(
			self::STATUS_APPLIED,
			$rows_affected,
			array(),
			$resolution_plan->response_payload(),
			$query_plan->audit_payload()
		);
	}

	public static function stale(
		OfflineConflictResolutionPlan $resolution_plan,
		OfflineConflictResolutionQueryPlan $query_plan,
		int $rows_affected
	): self {
		return new self(
			self::STATUS_STALE,
			$rows_affected,
			array(),
			$resolution_plan->response_payload(),
			$query_plan->audit_payload()
		);
	}

	/**
	 * @param list<string> $errors Repository errors.
	 */
	public static function rejected(
		OfflineConflictResolutionPlan $resolution_plan,
		OfflineConflictResolutionQueryPlan $query_plan,
		array $errors,
		?int $rows_affected = null
	): self {
		return new self(
			self::STATUS_REJECTED,
			$rows_affected,
			array_values( array_unique( $errors ) ),
			$resolution_plan->response_payload(),
			$query_plan->audit_payload()
		);
	}

	public function status(): string {
		return $this->status;
	}

	public function is_applied(): bool {
		return self::STATUS_APPLIED === $this->status;
	}

	public function is_stale(): bool {
		return self::STATUS_STALE === $this->status;
	}

	public function is_rejected(): bool {
		return self::STATUS_REJECTED === $this->status;
	}

	public function rows_affected(): ?int {
		return $this->rows_affected;
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
	public function response_payload(): array {
		return array_merge(
			$this->response_payload,
			array(
				'write_status'   => $this->status,
				'rows_affected'  => $this->rows_affected,
				'write_deferred' => false,
			)
		);
	}

	/**
	 * @return array<string, mixed>
	 */
	public function audit_payload(): array {
		return array(
			'action'        => 'offline_conflict_resolution_repository',
			'status'        => $this->status,
			'is_applied'    => $this->is_applied(),
			'is_stale'      => $this->is_stale(),
			'is_rejected'   => $this->is_rejected(),
			'rows_affected' => $this->rows_affected,
			'query'         => $this->query_audit,
			'errors'        => $this->errors,
		);
	}
}
