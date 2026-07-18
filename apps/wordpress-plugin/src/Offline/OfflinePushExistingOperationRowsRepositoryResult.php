<?php
/**
 * Offline push existing operation rows repository result.
 *
 * @package TCGStorePlatform
 */

namespace TCGStorePlatform\Offline;

final class OfflinePushExistingOperationRowsRepositoryResult {
	public const STATUS_FETCHED  = 'fetched';
	public const STATUS_REJECTED = 'rejected';

	/**
	 * @param array<string, array<string, mixed>> $existing_operation_rows Existing rows keyed by client operation ID.
	 * @param list<array<string, mixed>>          $row_results Per-row fetch audits.
	 * @param list<string>                       $errors Repository or row errors.
	 * @param array<string, mixed>               $query_audit Existing operation rows query audit.
	 */
	private function __construct(
		private string $status,
		private array $existing_operation_rows,
		private array $row_results,
		private array $errors,
		private array $query_audit
	) {
	}

	/**
	 * @param array<string, array<string, mixed>> $existing_operation_rows Existing rows keyed by client operation ID.
	 * @param list<array<string, mixed>>          $row_results Per-row fetch audits.
	 */
	public static function fetched(
		OfflinePushExistingOperationRowsQueryBuildPlan $query_plan,
		array $existing_operation_rows,
		array $row_results
	): self {
		return new self(
			self::STATUS_FETCHED,
			$existing_operation_rows,
			array_values( $row_results ),
			array(),
			$query_plan->audit_payload()
		);
	}

	/**
	 * @param list<string>                       $errors Repository or row errors.
	 * @param array<string, array<string, mixed>> $existing_operation_rows Existing rows keyed by client operation ID.
	 * @param list<array<string, mixed>>          $row_results Per-row fetch audits.
	 */
	public static function rejected(
		OfflinePushExistingOperationRowsQueryBuildPlan $query_plan,
		array $errors,
		array $existing_operation_rows = array(),
		array $row_results = array()
	): self {
		return new self(
			self::STATUS_REJECTED,
			$existing_operation_rows,
			array_values( $row_results ),
			array_values( array_unique( $errors ) ),
			$query_plan->audit_payload()
		);
	}

	public function status(): string {
		return $this->status;
	}

	public function is_fetched(): bool {
		return self::STATUS_FETCHED === $this->status;
	}

	public function is_rejected(): bool {
		return self::STATUS_REJECTED === $this->status;
	}

	/**
	 * @return array<string, array<string, mixed>>
	 */
	public function existing_operation_rows(): array {
		return $this->existing_operation_rows;
	}

	/**
	 * @return array<string, mixed>|null
	 */
	public function existing_operation_row( string $client_operation_id ): ?array {
		$client_operation_id = trim( $client_operation_id );

		return $this->existing_operation_rows[ $client_operation_id ] ?? null;
	}

	/**
	 * @return list<array<string, mixed>>
	 */
	public function row_results(): array {
		return $this->row_results;
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
			'action'                           => 'offline_push_existing_operation_rows_repository',
			'status'                           => $this->status,
			'is_fetched'                       => $this->is_fetched(),
			'is_rejected'                      => $this->is_rejected(),
			'existing_operation_row_count'     => count( $this->existing_operation_rows ),
			'row_result_count'                 => count( $this->row_results ),
			'query'                            => $this->query_audit,
			'row_results'                      => $this->row_results,
			'explicit_execution_required'      => true,
			'default_route_execution_deferred' => true,
			'route_connected_reads_deferred'   => true,
			'queue_replay_deferred'            => true,
			'canonical_mutations_deferred'     => true,
			'errors'                           => $this->errors,
		);
	}
}
