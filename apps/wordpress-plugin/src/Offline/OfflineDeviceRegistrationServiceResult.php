<?php
/**
 * Offline device registration service result.
 *
 * @package TCGStorePlatform
 */

namespace TCGStorePlatform\Offline;

final class OfflineDeviceRegistrationServiceResult {
	public const STATUS_REGISTERED = 'registered';
	public const STATUS_INVALID    = 'invalid';
	public const STATUS_REJECTED   = 'rejected';

	/**
	 * @param array<string, mixed> $response_payload One-time response payload.
	 * @param list<string>         $errors Service errors.
	 * @param array<string, mixed> $audit_payload Secret-free audit payload.
	 */
	private function __construct(
		private string $status,
		private int $status_code,
		private array $response_payload,
		private array $errors,
		private array $audit_payload
	) {
	}

	public static function invalid( array $errors ): self {
		return new self(
			self::STATUS_INVALID,
			400,
			array(),
			self::unique_errors( $errors ),
			self::build_audit_payload(
				self::STATUS_INVALID,
				400,
				$errors
			)
		);
	}

	public static function registered(
		OfflineDeviceRegistrationCredentials $credentials,
		OfflineDeviceRegistrationPlan $registration_plan,
		OfflineDeviceRegistrationRepositoryResult $repository_result
	): self {
		return new self(
			self::STATUS_REGISTERED,
			201,
			$repository_result->response_payload(),
			array(),
			self::build_audit_payload(
				self::STATUS_REGISTERED,
				201,
				array(),
				$credentials,
				$registration_plan,
				$repository_result
			)
		);
	}

	/**
	 * @param list<string> $errors Rejection errors.
	 */
	public static function rejected(
		array $errors,
		?OfflineDeviceRegistrationCredentials $credentials = null,
		?OfflineDeviceRegistrationPlan $registration_plan = null,
		?OfflineDeviceRegistrationRepositoryResult $repository_result = null,
		int $status_code = 500
	): self {
		return new self(
			self::STATUS_REJECTED,
			$status_code,
			array(),
			self::unique_errors( $errors ),
			self::build_audit_payload(
				self::STATUS_REJECTED,
				$status_code,
				$errors,
				$credentials,
				$registration_plan,
				$repository_result
			)
		);
	}

	public function status(): string {
		return $this->status;
	}

	public function status_code(): int {
		return $this->status_code;
	}

	public function is_registered(): bool {
		return self::STATUS_REGISTERED === $this->status;
	}

	public function is_invalid(): bool {
		return self::STATUS_INVALID === $this->status;
	}

	public function is_rejected(): bool {
		return self::STATUS_REJECTED === $this->status;
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
		return $this->audit_payload;
	}

	/**
	 * @param list<string> $errors Service errors.
	 * @return list<string>
	 */
	private static function unique_errors( array $errors ): array {
		return array_values( array_unique( $errors ) );
	}

	/**
	 * @param list<string> $errors Service errors.
	 * @return array<string, mixed>
	 */
	private static function build_audit_payload(
		string $status,
		int $status_code,
		array $errors,
		?OfflineDeviceRegistrationCredentials $credentials = null,
		?OfflineDeviceRegistrationPlan $registration_plan = null,
		?OfflineDeviceRegistrationRepositoryResult $repository_result = null
	): array {
		return array(
			'action'            => 'offline_device_registration_service',
			'status'            => $status,
			'status_code'       => $status_code,
			'is_registered'     => self::STATUS_REGISTERED === $status,
			'is_invalid'        => self::STATUS_INVALID === $status,
			'is_rejected'       => self::STATUS_REJECTED === $status,
			'credentials'       => null !== $credentials
				? $credentials->audit_payload()
				: array(),
			'registration_plan' => null !== $registration_plan
				? $registration_plan->audit_payload()
				: array(),
			'repository'        => null !== $repository_result
				? $repository_result->audit_payload()
				: array(),
			'errors'            => self::unique_errors( $errors ),
		);
	}
}
