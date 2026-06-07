<?php
/**
 * Registered offline device repository lookup result.
 *
 * @package TCGStorePlatform
 */

namespace TCGStorePlatform\Offline;

final class OfflineRegisteredDeviceRepositoryResult {
	public const STATUS_FOUND     = 'found';
	public const STATUS_NOT_FOUND = 'not_found';
	public const STATUS_REJECTED  = 'rejected';

	/**
	 * @param array<string, mixed>|null $device_row Auth-ready device row.
	 * @param list<string>              $errors Repository or row errors.
	 * @param array<string, mixed>      $query_audit Query audit payload.
	 * @param array<string, mixed>      $normalization_audit Normalizer audit payload.
	 */
	private function __construct(
		private string $status,
		private ?array $device_row,
		private array $errors,
		private array $query_audit,
		private array $normalization_audit
	) {
	}

	/**
	 * @param array<string, mixed> $device_row Auth-ready device row.
	 * @param array<string, mixed> $normalization_audit Normalizer audit payload.
	 */
	public static function found(
		array $device_row,
		OfflineRegisteredDeviceLookupQueryPlan $query_plan,
		array $normalization_audit
	): self {
		return new self(
			self::STATUS_FOUND,
			$device_row,
			array(),
			$query_plan->audit_payload(),
			$normalization_audit
		);
	}

	public static function not_found( OfflineRegisteredDeviceLookupQueryPlan $query_plan ): self {
		return new self(
			self::STATUS_NOT_FOUND,
			null,
			array(),
			$query_plan->audit_payload(),
			array()
		);
	}

	/**
	 * @param list<string>         $errors Repository or row errors.
	 * @param array<string, mixed> $normalization_audit Normalizer audit payload.
	 */
	public static function rejected(
		OfflineRegisteredDeviceLookupQueryPlan $query_plan,
		array $errors,
		array $normalization_audit = array()
	): self {
		return new self(
			self::STATUS_REJECTED,
			null,
			array_values( array_unique( $errors ) ),
			$query_plan->audit_payload(),
			$normalization_audit
		);
	}

	public function status(): string {
		return $this->status;
	}

	public function is_found(): bool {
		return self::STATUS_FOUND === $this->status;
	}

	public function is_not_found(): bool {
		return self::STATUS_NOT_FOUND === $this->status;
	}

	public function is_rejected(): bool {
		return self::STATUS_REJECTED === $this->status;
	}

	/**
	 * @return array<string, mixed>|null
	 */
	public function device_row(): ?array {
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
		return array(
			'action'              => 'offline_registered_device_repository_lookup',
			'status'              => $this->status,
			'found'               => $this->is_found(),
			'is_rejected'         => $this->is_rejected(),
			'query'               => $this->query_audit,
			'normalization_audit' => $this->normalization_audit,
			'errors'              => $this->errors,
		);
	}
}
