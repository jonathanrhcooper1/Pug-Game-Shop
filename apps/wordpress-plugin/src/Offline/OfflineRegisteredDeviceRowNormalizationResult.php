<?php
/**
 * Normalized registered offline device row result.
 *
 * @package TCGStorePlatform
 */

namespace TCGStorePlatform\Offline;

final class OfflineRegisteredDeviceRowNormalizationResult {
	/**
	 * @param array<string, mixed> $device_row Normalized device row.
	 * @param list<string>         $errors Normalization errors.
	 * @param array<string, mixed> $audit_payload Secret-free audit payload.
	 */
	private function __construct(
		private array $device_row,
		private array $errors,
		private array $audit_payload
	) {
	}

	/**
	 * @param array<string, mixed> $device_row Normalized device row.
	 * @param array<string, mixed> $audit_payload Secret-free audit payload.
	 */
	public static function accepted( array $device_row, array $audit_payload ): self {
		return new self( $device_row, array(), $audit_payload );
	}

	/**
	 * @param list<string>         $errors Normalization errors.
	 * @param array<string, mixed> $audit_payload Secret-free audit payload.
	 */
	public static function rejected( array $errors, array $audit_payload ): self {
		return new self( array(), array_values( array_unique( $errors ) ), $audit_payload );
	}

	public function is_valid(): bool {
		return array() !== $this->device_row && array() === $this->errors;
	}

	/**
	 * @return array<string, mixed>
	 */
	public function device_row(): array {
		return $this->device_row;
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
		return $this->audit_payload;
	}
}
