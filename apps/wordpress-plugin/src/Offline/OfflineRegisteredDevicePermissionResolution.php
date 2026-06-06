<?php
/**
 * Repository-backed registered offline device permission resolution.
 *
 * @package TCGStorePlatform
 */

namespace TCGStorePlatform\Offline;

final class OfflineRegisteredDevicePermissionResolution {
	/**
	 * @param list<string> $errors Resolution errors.
	 */
	private function __construct(
		private OfflineRegisteredDevicePermissionPlan $initial_permission_plan,
		private ?OfflineRegisteredDeviceRepositoryResult $repository_result,
		private ?OfflineRegisteredDevicePermissionPlan $final_permission_plan,
		private array $errors
	) {
	}

	public static function permission_only(
		OfflineRegisteredDevicePermissionPlan $permission_plan
	): self {
		return new self( $permission_plan, null, null, $permission_plan->errors() );
	}

	/**
	 * @param list<string> $errors Resolution errors.
	 */
	public static function repository_denied(
		OfflineRegisteredDevicePermissionPlan $initial_permission_plan,
		OfflineRegisteredDeviceRepositoryResult $repository_result,
		array $errors
	): self {
		return new self(
			$initial_permission_plan,
			$repository_result,
			null,
			array_values( array_unique( $errors ) )
		);
	}

	public static function resolved(
		OfflineRegisteredDevicePermissionPlan $initial_permission_plan,
		OfflineRegisteredDeviceRepositoryResult $repository_result,
		OfflineRegisteredDevicePermissionPlan $final_permission_plan
	): self {
		return new self(
			$initial_permission_plan,
			$repository_result,
			$final_permission_plan,
			$final_permission_plan->errors()
		);
	}

	public function is_authorized(): bool {
		return null !== $this->final_permission_plan && $this->final_permission_plan->is_authorized();
	}

	public function lookup_attempted(): bool {
		return null !== $this->repository_result;
	}

	public function initial_permission_plan(): OfflineRegisteredDevicePermissionPlan {
		return $this->initial_permission_plan;
	}

	public function repository_result(): ?OfflineRegisteredDeviceRepositoryResult {
		return $this->repository_result;
	}

	public function final_permission_plan(): ?OfflineRegisteredDevicePermissionPlan {
		return $this->final_permission_plan;
	}

	public function session_plan(): ?OfflineDeviceSessionPlan {
		return $this->final_permission_plan?->session_plan();
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
			'action'             => 'offline_registered_device_permission_resolved',
			'status'             => $this->is_authorized() ? 'authorized' : 'denied',
			'stage'              => $this->stage(),
			'is_authorized'      => $this->is_authorized(),
			'lookup_attempted'   => $this->lookup_attempted(),
			'repository_status'  => null !== $this->repository_result ? $this->repository_result->status() : '',
			'has_session_plan'   => null !== $this->session_plan(),
			'initial_permission' => $this->initial_permission_plan->audit_payload(),
			'repository'         => null !== $this->repository_result ? $this->repository_result->audit_payload() : array(),
			'final_permission'   => null !== $this->final_permission_plan ? $this->final_permission_plan->audit_payload() : array(),
			'errors'             => $this->errors,
		);
	}

	private function stage(): string {
		if ( null !== $this->final_permission_plan ) {
			return (string) ( $this->final_permission_plan->audit_payload()['stage'] ?? '' );
		}

		if ( null !== $this->repository_result ) {
			if ( $this->repository_result->is_not_found() ) {
				return 'repository_not_found';
			}

			if ( $this->repository_result->is_rejected() ) {
				return 'repository_rejected';
			}
		}

		return (string) ( $this->initial_permission_plan->audit_payload()['stage'] ?? '' );
	}
}
