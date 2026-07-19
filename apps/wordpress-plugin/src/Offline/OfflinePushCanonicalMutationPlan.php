<?php
/**
 * Planned canonical mutations for accepted offline push operations.
 *
 * @package TCGStorePlatform
 */

namespace TCGStorePlatform\Offline;

final class OfflinePushCanonicalMutationPlan {
	/**
	 * @param list<array<string, mixed>>  $mutation_rows Future canonical mutation descriptors.
	 * @param list<string>               $skipped_operation_ids Operation IDs skipped by status.
	 * @param array<string, string>      $skipped_reasons Skip reasons keyed by operation ID.
	 * @param array<string, mixed>       $response_payload API-safe planning payload.
	 * @param array<string, mixed>       $audit_payload Secret-free audit payload.
	 */
	public function __construct(
		private string $batch_id,
		private string $device_id,
		private string $server_time_utc,
		private array $mutation_rows,
		private array $skipped_operation_ids,
		private array $skipped_reasons,
		private array $response_payload,
		private array $audit_payload
	) {
		$this->batch_id        = trim( $batch_id );
		$this->device_id       = trim( $device_id );
		$this->server_time_utc = trim( $server_time_utc );
	}

	public function batch_id(): string {
		return $this->batch_id;
	}

	public function device_id(): string {
		return $this->device_id;
	}

	public function server_time_utc(): string {
		return $this->server_time_utc;
	}

	/**
	 * @return list<array<string, mixed>>
	 */
	public function mutation_rows(): array {
		return $this->mutation_rows;
	}

	public function mutation_count(): int {
		return count( $this->mutation_rows );
	}

	/**
	 * @return list<string>
	 */
	public function mutation_operation_ids(): array {
		return array_map(
			static fn ( array $mutation ): string => (string) $mutation['client_operation_id'],
			$this->mutation_rows
		);
	}

	/**
	 * @return list<string>
	 */
	public function skipped_operation_ids(): array {
		return $this->skipped_operation_ids;
	}

	/**
	 * @return array<string, string>
	 */
	public function skipped_reasons(): array {
		return $this->skipped_reasons;
	}

	/**
	 * @return array<string, mixed>
	 */
	public function response_payload(): array {
		return $this->response_payload;
	}

	/**
	 * @return array<string, mixed>
	 */
	public function audit_payload(): array {
		return $this->audit_payload;
	}
}
