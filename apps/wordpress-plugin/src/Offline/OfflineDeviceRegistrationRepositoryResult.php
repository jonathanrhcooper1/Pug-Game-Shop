<?php
/**
 * Offline device registration repository result.
 *
 * @package TCGStorePlatform
 */

namespace TCGStorePlatform\Offline;

final class OfflineDeviceRegistrationRepositoryResult {
	public const STATUS_INSERTED = 'inserted';
	public const STATUS_REJECTED = 'rejected';

	/**
	 * @param array<string, mixed> $response_payload One-time response payload.
	 * @param list<string>         $errors Repository errors.
	 * @param array<string, mixed> $registration_audit Registration audit payload.
	 * @param array<string, mixed> $query_audit Query audit payload.
	 */
	private function __construct(
		private string $status,
		private ?int $rows_affected,
		private ?int $insert_id,
		private array $response_payload,
		private array $errors,
		private array $registration_audit,
		private array $query_audit
	) {
	}

	public static function inserted(
		OfflineDeviceRegistrationPlan $registration_plan,
		OfflineDeviceRegistrationInsertQueryPlan $query_plan,
		int $rows_affected,
		?int $insert_id
	): self {
		return new self(
			self::STATUS_INSERTED,
			$rows_affected,
			$insert_id,
			$registration_plan->response_payload(),
			array(),
			$registration_plan->audit_payload(),
			$query_plan->audit_payload()
		);
	}

	/**
	 * @param list<string> $errors Repository errors.
	 */
	public static function rejected(
		OfflineDeviceRegistrationPlan $registration_plan,
		OfflineDeviceRegistrationInsertQueryPlan $query_plan,
		array $errors,
		?int $rows_affected = null
	): self {
		return new self(
			self::STATUS_REJECTED,
			$rows_affected,
			null,
			array(),
			array_values( array_unique( $errors ) ),
			$registration_plan->audit_payload(),
			$query_plan->audit_payload()
		);
	}

	public function status(): string {
		return $this->status;
	}

	public function is_inserted(): bool {
		return self::STATUS_INSERTED === $this->status;
	}

	public function is_rejected(): bool {
		return self::STATUS_REJECTED === $this->status;
	}

	public function rows_affected(): ?int {
		return $this->rows_affected;
	}

	public function insert_id(): ?int {
		return $this->insert_id;
	}

	/**
	 * @return array<string, mixed>
	 */
	public function response_payload(): array {
		return $this->response_payload;
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
			'action'             => 'offline_device_registration_repository',
			'status'             => $this->status,
			'is_inserted'        => $this->is_inserted(),
			'is_rejected'        => $this->is_rejected(),
			'rows_affected'      => $this->rows_affected,
			'insert_id'          => $this->insert_id,
			'registration_audit' => $this->registration_audit,
			'query'              => $this->query_audit,
			'errors'             => $this->errors,
		);
	}
}
