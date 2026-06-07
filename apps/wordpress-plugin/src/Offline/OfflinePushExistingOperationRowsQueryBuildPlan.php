<?php
/**
 * Prepared SQL templates for offline push existing operation row lookups.
 *
 * @package TCGStorePlatform
 */

namespace TCGStorePlatform\Offline;

final class OfflinePushExistingOperationRowsQueryBuildPlan {
	/**
	 * @param array<string, mixed> $query  Prepared existing operation rows query.
	 * @param list<string>        $errors Query build errors.
	 */
	private function __construct(
		private bool $is_valid,
		private string $batch_id,
		private string $device_id,
		private int $offline_device_id,
		private array $query,
		private array $errors
	) {
	}

	/**
	 * @param array<string, mixed> $query Prepared existing operation rows query.
	 */
	public static function accepted(
		OfflinePushExistingOperationRowsQueryPlan $query_plan,
		array $query
	): self {
		return new self(
			true,
			$query_plan->batch_id(),
			$query_plan->device_id(),
			$query_plan->offline_device_id(),
			$query,
			array()
		);
	}

	/**
	 * @param list<string> $errors Query build errors.
	 */
	public static function rejected(
		OfflinePushExistingOperationRowsQueryPlan $query_plan,
		array $errors
	): self {
		return new self(
			false,
			$query_plan->batch_id(),
			$query_plan->device_id(),
			$query_plan->offline_device_id(),
			array(),
			array_values( array_unique( $errors ) )
		);
	}

	public function is_valid(): bool {
		return $this->is_valid;
	}

	public function batch_id(): string {
		return $this->batch_id;
	}

	public function device_id(): string {
		return $this->device_id;
	}

	public function offline_device_id(): int {
		return $this->offline_device_id;
	}

	/**
	 * @return array<string, mixed>
	 */
	public function query(): array {
		return $this->query;
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
		$prepare_args = is_array( $this->query['prepare_args'] ?? null )
			? $this->query['prepare_args']
			: array();

		return array(
			'action'                                    => 'offline_push_existing_operation_rows_query_sql_planned',
			'is_valid'                                  => $this->is_valid,
			'batch_id'                                  => $this->batch_id,
			'device_id'                                 => $this->device_id,
			'offline_device_id'                         => $this->offline_device_id,
			'operation_count'                           => count( $this->query['operation_ids'] ?? array() ),
			'prepare_arg_count'                         => count( $prepare_args ),
			'sql_query_ready'                           => $this->is_valid,
			'execution_deferred'                        => true,
			'existing_operation_rows_repository_next'   => true,
			'route_connected_reads_deferred'            => true,
			'queue_replay_deferred'                     => true,
			'canonical_mutations_deferred'              => true,
			'errors'                                    => $this->errors,
		);
	}
}
