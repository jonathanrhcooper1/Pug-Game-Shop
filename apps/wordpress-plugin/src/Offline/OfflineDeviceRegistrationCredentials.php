<?php
/**
 * Issued offline device registration credentials.
 *
 * @package TCGStorePlatform
 */

namespace TCGStorePlatform\Offline;

final class OfflineDeviceRegistrationCredentials {
	/**
	 * @param array<string, mixed> $audit_payload Secret-free audit payload.
	 */
	public function __construct(
		private string $device_id,
		private string $device_token,
		private string $device_token_hash,
		private string $issued_at_utc,
		private string $token_expires_at_utc,
		private int $token_ttl_seconds,
		private array $audit_payload
	) {
	}

	public function device_id(): string {
		return $this->device_id;
	}

	public function device_token(): string {
		return $this->device_token;
	}

	public function device_token_hash(): string {
		return $this->device_token_hash;
	}

	public function issued_at_utc(): string {
		return $this->issued_at_utc;
	}

	public function token_expires_at_utc(): string {
		return $this->token_expires_at_utc;
	}

	public function token_ttl_seconds(): int {
		return $this->token_ttl_seconds;
	}

	/**
	 * @return array<string, mixed>
	 */
	public function audit_payload(): array {
		return $this->audit_payload;
	}
}
