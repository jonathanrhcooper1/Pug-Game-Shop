<?php
/**
 * Registered offline device permission planner.
 *
 * @package TCGStorePlatform
 */

namespace TCGStorePlatform\Offline;

use InvalidArgumentException;

final class OfflineRegisteredDevicePermissionPlanner {
	private OfflineDeviceTokenLookupPlanner $lookup_planner;
	private OfflineRegisteredDeviceLookupPlanner $device_lookup_planner;
	private OfflineDeviceTokenAuthenticator $authenticator;
	private OfflineDeviceSessionPlanner $session_planner;

	public function __construct(
		?OfflineDeviceTokenLookupPlanner $lookup_planner = null,
		?OfflineRegisteredDeviceLookupPlanner $device_lookup_planner = null,
		?OfflineDeviceTokenAuthenticator $authenticator = null,
		?OfflineDeviceSessionPlanner $session_planner = null
	) {
		$this->lookup_planner        = $lookup_planner ?? new OfflineDeviceTokenLookupPlanner();
		$this->device_lookup_planner = $device_lookup_planner ?? new OfflineRegisteredDeviceLookupPlanner();
		$this->authenticator         = $authenticator ?? new OfflineDeviceTokenAuthenticator();
		$this->session_planner       = $session_planner ?? new OfflineDeviceSessionPlanner();
	}

	/**
	 * @param array<string, mixed>      $headers REST request headers.
	 * @param null|array<string, mixed> $device_row Loaded registered device row, when available.
	 */
	public function plan(
		array $headers,
		?array $device_row,
		string $required_scope,
		string $server_time_utc
	): OfflineRegisteredDevicePermissionPlan {
		$required_scope  = strtolower( trim( $required_scope ) );
		$server_time_utc = trim( $server_time_utc );
		$lookup_plan     = $this->lookup_planner->plan( $headers );

		if ( ! $lookup_plan->is_valid() ) {
			return OfflineRegisteredDevicePermissionPlan::denied(
				$lookup_plan,
				$lookup_plan->errors(),
				$this->audit_payload( 'token_lookup_rejected', $required_scope, $lookup_plan, null, null, null, $lookup_plan->errors() )
			);
		}

		$device_lookup_plan = $this->device_lookup_planner->plan( $lookup_plan, $required_scope, $server_time_utc );

		if ( ! $device_lookup_plan->is_valid() ) {
			return OfflineRegisteredDevicePermissionPlan::denied(
				$lookup_plan,
				$device_lookup_plan->errors(),
				$this->audit_payload( 'device_lookup_rejected', $required_scope, $lookup_plan, $device_lookup_plan, null, null, $device_lookup_plan->errors() ),
				$device_lookup_plan
			);
		}

		if ( null === $device_row ) {
			return OfflineRegisteredDevicePermissionPlan::lookup_required(
				$lookup_plan,
				$device_lookup_plan,
				$this->audit_payload( 'device_lookup_required', $required_scope, $lookup_plan, $device_lookup_plan, null, null, array() )
			);
		}

		$decision = $this->authenticator->authenticate( $headers, $device_row, $required_scope, $server_time_utc );

		if ( ! $decision->is_allowed() ) {
			return OfflineRegisteredDevicePermissionPlan::denied(
				$lookup_plan,
				$decision->errors(),
				$this->audit_payload( 'device_authorization_denied', $required_scope, $lookup_plan, null, $decision, null, $decision->errors() ),
				null,
				$decision
			);
		}

		try {
			$session_plan = $this->session_planner->plan( $decision, $device_row, $server_time_utc );
		} catch ( InvalidArgumentException ) {
			$errors = array( 'device_session_plan_invalid' );

			return OfflineRegisteredDevicePermissionPlan::denied(
				$lookup_plan,
				$errors,
				$this->audit_payload( 'device_session_rejected', $required_scope, $lookup_plan, null, $decision, null, $errors ),
				null,
				$decision
			);
		}

		return OfflineRegisteredDevicePermissionPlan::authorized(
			$lookup_plan,
			$decision,
			$session_plan,
			$this->audit_payload( 'authorized', $required_scope, $lookup_plan, null, $decision, $session_plan, array() )
		);
	}

	/**
	 * @param list<string> $errors Permission errors.
	 * @return array<string, mixed>
	 */
	private function audit_payload(
		string $stage,
		string $required_scope,
		OfflineDeviceTokenLookupPlan $lookup_plan,
		?OfflineRegisteredDeviceLookupPlan $device_lookup_plan,
		?OfflineDeviceAccessDecision $decision,
		?OfflineDeviceSessionPlan $session_plan,
		array $errors
	): array {
		$context      = null !== $decision ? $decision->context() : array();
		$session      = null !== $session_plan ? $session_plan->audit_payload() : array();
		$lookup_audit = null !== $device_lookup_plan ? $device_lookup_plan->audit_payload() : array();

		return array(
			'action'                 => 'offline_registered_device_permission_planned',
			'stage'                  => $stage,
			'is_authorized'          => 'authorized' === $stage,
			'requires_device_lookup' => 'device_lookup_required' === $stage,
			'required_scope'         => $required_scope,
			'token_fingerprint'      => $lookup_plan->token_fingerprint(),
			'has_lookup_filter'      => array() !== $lookup_plan->lookup_filters(),
			'has_lookup_query_plan'  => null !== $device_lookup_plan && $device_lookup_plan->is_valid(),
			'selected_column_count'  => $this->positive_int( $lookup_audit['selected_column_count'] ?? null ),
			'lock_intent'            => trim( (string) ( $lookup_audit['lock_intent'] ?? '' ) ),
			'scope_check_deferred'   => true === ( $lookup_audit['scope_check_deferred'] ?? false ),
			'offline_device_id'      => $this->positive_int( $context['offline_device_id'] ?? null ),
			'device_id'              => trim( (string) ( $context['device_id'] ?? '' ) ),
			'device_mode'            => strtolower( trim( (string) ( $context['device_mode'] ?? '' ) ) ),
			'location_id'            => $this->positive_int( $context['location_id'] ?? null ),
			'next_row_version'       => $this->positive_int( $session['next_row_version'] ?? null ),
			'has_session_plan'       => null !== $session_plan,
			'errors'                 => array_values( array_unique( $errors ) ),
		);
	}

	private function positive_int( mixed $value ): ?int {
		if ( is_int( $value ) && $value > 0 ) {
			return $value;
		}

		if ( is_string( $value ) && 1 === preg_match( '/^\d+$/', $value ) && (int) $value > 0 ) {
			return (int) $value;
		}

		return null;
	}
}
