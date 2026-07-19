<?php
/**
 * Parsed offline push request payload.
 *
 * @package TCGStorePlatform
 */

namespace TCGStorePlatform\Offline;

final class OfflinePushPayload {
	/**
	 * @param list<OfflineOperationEnvelope> $operations Queued operations.
	 */
	public function __construct(
		private string $batch_id,
		private string $device_id,
		private array $operations
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

	/**
	 * @return list<OfflineOperationEnvelope>
	 */
	public function operations(): array {
		return $this->operations;
	}
}
