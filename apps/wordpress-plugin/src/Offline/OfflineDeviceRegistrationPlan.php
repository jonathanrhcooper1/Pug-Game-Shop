<?php
/**
 * Planned offline device registration output.
 *
 * @package TCGStorePlatform
 */

namespace TCGStorePlatform\Offline;

final class OfflineDeviceRegistrationPlan {
	/**
	 * @param array<string, mixed> $device_row Device row payload.
	 * @param array<string, mixed> $response_payload One-time response payload.
	 * @param array<string, mixed> $audit_payload Audit payload without secrets.
	 */
	public function __construct(
		private array $device_row,
		private array $response_payload,
		private array $audit_payload
	) {
	}

	/**
	 * @return array<string, mixed>
	 */
	public function device_row(): array {
		return $this->device_row;
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
