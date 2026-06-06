<?php
/**
 * Planned offline device session update.
 *
 * @package TCGStorePlatform
 */

namespace TCGStorePlatform\Offline;

final class OfflineDeviceSessionPlan {
	/**
	 * @param array<string, mixed> $device_update_row Future device row update.
	 * @param array<string, mixed> $session_context Authenticated session context.
	 * @param array<string, mixed> $audit_payload Audit payload without secrets.
	 */
	public function __construct(
		private array $device_update_row,
		private array $session_context,
		private array $audit_payload
	) {
	}

	/**
	 * @return array<string, mixed>
	 */
	public function device_update_row(): array {
		return $this->device_update_row;
	}

	/**
	 * @return array<string, mixed>
	 */
	public function session_context(): array {
		return $this->session_context;
	}

	/**
	 * @return array<string, mixed>
	 */
	public function audit_payload(): array {
		return $this->audit_payload;
	}
}
