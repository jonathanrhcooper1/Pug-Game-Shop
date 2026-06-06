<?php
/**
 * Planned registered-device permission result.
 *
 * @package TCGStorePlatform
 */

namespace TCGStorePlatform\Offline;

final class OfflineRegisteredDevicePermissionPlan {
	/**
	 * @param list<string>         $errors Permission errors.
	 * @param array<string, mixed> $audit_payload Secret-free audit payload.
	 */
	private function __construct(
		private bool $authorized,
		private bool $requires_device_lookup,
		private OfflineDeviceTokenLookupPlan $lookup_plan,
		private ?OfflineRegisteredDeviceLookupPlan $device_lookup_plan,
		private ?OfflineDeviceAccessDecision $access_decision,
		private ?OfflineDeviceSessionPlan $session_plan,
		private array $errors,
		private array $audit_payload
	) {
	}

	/**
	 * @param array<string, mixed> $audit_payload Secret-free audit payload.
	 */
	public static function lookup_required(
		OfflineDeviceTokenLookupPlan $lookup_plan,
		OfflineRegisteredDeviceLookupPlan $device_lookup_plan,
		array $audit_payload
	): self {
		return new self( false, true, $lookup_plan, $device_lookup_plan, null, null, array(), $audit_payload );
	}

	/**
	 * @param list<string>         $errors Permission errors.
	 * @param array<string, mixed> $audit_payload Secret-free audit payload.
	 */
	public static function denied(
		OfflineDeviceTokenLookupPlan $lookup_plan,
		array $errors,
		array $audit_payload,
		?OfflineRegisteredDeviceLookupPlan $device_lookup_plan = null,
		?OfflineDeviceAccessDecision $access_decision = null
	): self {
		return new self(
			false,
			false,
			$lookup_plan,
			$device_lookup_plan,
			$access_decision,
			null,
			array_values( array_unique( $errors ) ),
			$audit_payload
		);
	}

	/**
	 * @param array<string, mixed> $audit_payload Secret-free audit payload.
	 */
	public static function authorized(
		OfflineDeviceTokenLookupPlan $lookup_plan,
		OfflineDeviceAccessDecision $access_decision,
		OfflineDeviceSessionPlan $session_plan,
		array $audit_payload
	): self {
		return new self( true, false, $lookup_plan, null, $access_decision, $session_plan, array(), $audit_payload );
	}

	public function is_authorized(): bool {
		return $this->authorized;
	}

	public function requires_device_lookup(): bool {
		return $this->requires_device_lookup;
	}

	public function lookup_plan(): OfflineDeviceTokenLookupPlan {
		return $this->lookup_plan;
	}

	public function device_lookup_plan(): ?OfflineRegisteredDeviceLookupPlan {
		return $this->device_lookup_plan;
	}

	public function access_decision(): ?OfflineDeviceAccessDecision {
		return $this->access_decision;
	}

	public function session_plan(): ?OfflineDeviceSessionPlan {
		return $this->session_plan;
	}

	/**
	 * @return array<string, string>
	 */
	public function lookup_filters(): array {
		return $this->lookup_plan->lookup_filters();
	}

	/**
	 * @return array<string, mixed>
	 */
	public function lookup_query_args(): array {
		if ( null === $this->device_lookup_plan ) {
			return array();
		}

		return $this->device_lookup_plan->query_args();
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
