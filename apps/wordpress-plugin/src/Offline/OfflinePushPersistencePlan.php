<?php
/**
 * Planned offline push persistence output.
 *
 * @package TCGStorePlatform
 */

namespace TCGStorePlatform\Offline;

final class OfflinePushPersistencePlan {
	/**
	 * @param list<array<string, mixed>> $operation_insert_rows Future queue/result inserts.
	 * @param list<array<string, mixed>> $operation_replay_rows Existing operation rows for idempotent replay.
	 * @param list<array<string, mixed>> $conflict_insert_rows Future conflict inserts.
	 * @param array<string, mixed>       $audit_payload Redacted persistence audit payload.
	 */
	public function __construct(
		private string $batch_id,
		private string $device_id,
		private int $offline_device_id,
		private array $operation_insert_rows,
		private array $operation_replay_rows,
		private array $conflict_insert_rows,
		private array $audit_payload
	) {
		$this->batch_id  = trim( $batch_id );
		$this->device_id = trim( $device_id );
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
	 * @return list<array<string, mixed>>
	 */
	public function operation_insert_rows(): array {
		return $this->operation_insert_rows;
	}

	/**
	 * @return list<array<string, mixed>>
	 */
	public function operation_replay_rows(): array {
		return $this->operation_replay_rows;
	}

	/**
	 * @return list<array<string, mixed>>
	 */
	public function conflict_insert_rows(): array {
		return $this->conflict_insert_rows;
	}

	/**
	 * @return array<string, mixed>
	 */
	public function audit_payload(): array {
		return $this->audit_payload;
	}
}
