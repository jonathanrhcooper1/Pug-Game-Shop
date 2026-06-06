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
		private ?OfflineDeviceSessionUpdateRepositoryResult $session_update_result,
		private array $errors
	) {
	}

	public static function permission_only(
		OfflineRegisteredDevicePermissionPlan $permission_plan
	): self {
		return new self( $permission_plan, null, null, null, $permission_plan->errors() );
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
			null,
			$final_permission_plan->errors()
		);
	}

	public function is_authorized(): bool {
		if ( null === $this->final_permission_plan || ! $this->final_permission_plan->is_authorized() ) {
			return false;
		}

		if ( null !== $this->session_update_result ) {
			return $this->session_update_result->is_applied();
		}

		return true;
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

	public function session_update_result(): ?OfflineDeviceSessionUpdateRepositoryResult {
		return $this->session_update_result;
	}

	public function session_update_attempted(): bool {
		return null !== $this->session_update_result;
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
			'action'                   => 'offline_registered_device_permission_resolved',
			'status'                   => $this->is_authorized() ? 'authorized' : 'denied',
			'stage'                    => $this->stage(),
			'is_authorized'            => $this->is_authorized(),
			'lookup_attempted'         => $this->lookup_attempted(),
			'repository_status'        => null !== $this->repository_result ? $this->repository_result->status() : '',
			'has_session_plan'         => null !== $this->session_plan(),
			'session_update_attempted' => $this->session_update_attempted(),
			'session_updated'          => null !== $this->session_update_result && $this->session_update_result->is_applied(),
			'session_update_status'    => null !== $this->session_update_result ? $this->session_update_result->status() : '',
			'initial_permission'       => $this->initial_permission_plan->audit_payload(),
			'repository'               => null !== $this->repository_result ? $this->repository_result->audit_payload() : array(),
			'final_permission'         => null !== $this->final_permission_plan ? $this->final_permission_plan->audit_payload() : array(),
			'session_update'           => null !== $this->session_update_result ? $this->session_update_result->audit_payload() : array(),
			'errors'                   => $this->errors,
		);
	}

	public function with_session_update_result(
		OfflineDeviceSessionUpdateRepositoryResult $session_update_result
	): self {
		return new self(
			$this->initial_permission_plan,
			$this->repository_result,
			$this->final_permission_plan,
			$session_update_result,
			$this->session_update_errors( $session_update_result )
		);
	}

	private function stage(): string {
		if ( null !== $this->session_update_result ) {
			if ( $this->session_update_result->is_stale() ) {
				return 'session_update_stale';
			}

			if ( $this->session_update_result->is_rejected() ) {
				return 'session_update_rejected';
			}
		}

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

	/**
	 * @return list<string>
	 */
	private function session_update_errors(
		OfflineDeviceSessionUpdateRepositoryResult $session_update_result
	): array {
		if ( $session_update_result->is_applied() ) {
			return $this->errors;
		}

		$errors = $this->errors;

		if ( $session_update_result->is_stale() ) {
			$errors[] = 'session_update_stale';
		}

		return array_values(
			array_unique(
				array_merge(
					$errors,
					$session_update_result->errors()
				)
			)
		);
	}
}
