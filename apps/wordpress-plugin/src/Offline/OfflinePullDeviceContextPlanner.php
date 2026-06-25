<?php
/**
 * Offline pull trusted-device context planner.
 *
 * @package TCGStorePlatform
 */

namespace TCGStorePlatform\Offline;

final class OfflinePullDeviceContextPlanner {
	public function plan(
		OfflinePullRequest $request,
		OfflineRegisteredDevicePermissionResolution $resolution,
		string $table_prefix
	): OfflinePullDeviceContextPlan {
		$errors          = array();
		$table_prefix    = trim( $table_prefix );
		$session_plan    = $resolution->session_plan();
		$session_context = null !== $session_plan ? $session_plan->session_context() : array();

		if ( ! $resolution->is_authorized() ) {
			$errors[] = 'registered_device_not_authorized';
		}

		if ( null === $session_plan ) {
			$errors[] = 'registered_device_session_missing';
		}

		$offline_device_id = $this->positive_int( $session_context['offline_device_id'] ?? null );
		$device_id         = trim( (string) ( $session_context['device_id'] ?? '' ) );
		$required_scope    = strtolower( trim( (string) ( $session_context['required_scope'] ?? '' ) ) );

		if ( null === $offline_device_id ) {
			$errors[] = 'offline_device_id_invalid';
		}

		if ( '' === $device_id || ! $this->is_device_id( $device_id ) ) {
			$errors[] = 'device_id_invalid';
		} elseif ( $request->device_id() !== $device_id ) {
			$errors[] = 'device_id_mismatch';
		}

		if ( 'offline_pull' !== $required_scope ) {
			$errors[] = 'required_scope_not_offline_pull';
		}

		if ( '' === $table_prefix || 1 !== preg_match( '/^[A-Za-z0-9_]+$/', $table_prefix ) ) {
			$errors[] = 'table_prefix_invalid';
		}

		if ( array() !== $errors ) {
			return OfflinePullDeviceContextPlan::rejected(
				$request->device_id(),
				$errors
			);
		}

		return OfflinePullDeviceContextPlan::accepted(
			$device_id,
			(int) $offline_device_id,
			$table_prefix,
			$session_context
		);
	}

	private function positive_int( mixed $value ): ?int {
		if ( is_int( $value ) && 0 < $value ) {
			return $value;
		}

		if ( is_string( $value ) && 1 === preg_match( '/^\d+$/', $value ) && 0 < (int) $value ) {
			return (int) $value;
		}

		return null;
	}

	private function is_device_id( string $value ): bool {
		return 1 === preg_match( '/^[a-zA-Z0-9._:-]{8,128}$/', $value );
	}
}
