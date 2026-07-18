<?php
/**
 * Planned offline conflict resolution output.
 *
 * @package TCGStorePlatform
 */

namespace TCGStorePlatform\Offline;

final class OfflineConflictResolutionPlan {
	/**
	 * @param array<string, mixed> $conflict_update_row Future conflict update.
	 * @param array<string, mixed> $response_payload API response payload.
	 * @param array<string, mixed> $audit_payload Audit payload without full adjustment details.
	 */
	public function __construct(
		private array $conflict_update_row,
		private array $response_payload,
		private array $audit_payload
	) {
	}

	/**
	 * @return array<string, mixed>
	 */
	public function conflict_update_row(): array {
		return $this->conflict_update_row;
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
