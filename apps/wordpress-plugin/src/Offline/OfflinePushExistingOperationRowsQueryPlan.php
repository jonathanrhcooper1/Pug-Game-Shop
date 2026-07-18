<?php
/**
 * Planned offline push existing operation row lookup contracts.
 *
 * @package TCGStorePlatform
 */

namespace TCGStorePlatform\Offline;

final class OfflinePushExistingOperationRowsQueryPlan {
	/**
	 * @param array<string, mixed> $query  Planned existing operation rows query.
	 * @param list<string>        $errors Planning errors.
	 */
	private function __construct(
		private bool $is_valid,
		private string $batch_id,
		private string $device_id,
		private int $offline_device_id,
		private string $table_prefix,
		private array $query,
		private array $errors
	) {
	}

	/**
	 * @param array<string, mixed> $query Planned existing operation rows query.
	 */
	public static function accepted(
		string $batch_id,
		string $device_id,
		int $offline_device_id,
		string $table_prefix,
		array $query
	): self {
		return new self(
			true,
			trim( $batch_id ),
			trim( $device_id ),
			$offline_device_id,
			trim( $table_prefix ),
			$query,
			array()
		);
	}

	/**
	 * @param list<string> $errors Planning errors.
	 */
	public static function rejected(
		string $batch_id,
		string $device_id,
		int $offline_device_id,
		array $errors
	): self {
		return new self(
			false,
			trim( $batch_id ),
			trim( $device_id ),
			$offline_device_id,
			'',
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

	public function table_prefix(): string {
		return $this->table_prefix;
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
	public function operation_ids(): array {
		return array_values(
			array_filter(
				$this->query['operation_ids'] ?? array(),
				static fn ( mixed $value ): bool => is_string( $value ) && '' !== $value
			)
		);
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
			'action'                                  => 'offline_push_existing_operation_rows_query_planned',
			'is_valid'                                => $this->is_valid,
			'batch_id'                                => $this->batch_id,
			'device_id'                               => $this->device_id,
			'offline_device_id'                       => $this->offline_device_id,
			'operation_count'                         => count( $this->operation_ids() ),
			'query_ready'                             => $this->is_valid,
			'execution_deferred'                      => true,
			'existing_operation_rows_repository_next' => true,
			'route_connected_reads_deferred'          => true,
			'queue_replay_deferred'                   => true,
			'canonical_mutations_deferred'            => true,
			'errors'                                  => $this->errors,
		);
	}
}
