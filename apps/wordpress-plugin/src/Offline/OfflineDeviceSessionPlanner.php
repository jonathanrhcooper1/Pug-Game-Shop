<?php
/**
 * Offline device session update planner.
 *
 * @package TCGStorePlatform
 */

namespace TCGStorePlatform\Offline;

use InvalidArgumentException;

final class OfflineDeviceSessionPlanner {
	/**
	 * @param array<string, mixed> $device_row Loaded registered device row.
	 */
	public function plan(
		OfflineDeviceAccessDecision $decision,
		array $device_row,
		string $server_time_utc
	): OfflineDeviceSessionPlan {
		$server_time_utc = trim( $server_time_utc );

		if ( ! $decision->is_allowed() ) {
			throw new InvalidArgumentException( 'device access decision must be accepted.' );
		}

		if ( ! $this->is_utc_timestamp( $server_time_utc ) ) {
			throw new InvalidArgumentException( 'server_time_utc must be an ISO-8601 UTC timestamp.' );
		}

		$context           = $decision->context();
		$offline_device_id = $this->positive_int( $device_row['offline_device_id'] ?? null );
		$public_id         = trim( (string) ( $device_row['public_id'] ?? '' ) );
		$row_version       = $this->positive_int( $device_row['row_version'] ?? null );

		if ( null === $offline_device_id ) {
			throw new InvalidArgumentException( 'device row has an invalid offline_device_id.' );
		}

		if ( '' === $public_id || ! $this->is_public_id( $public_id ) ) {
			throw new InvalidArgumentException( 'device row has an invalid public_id.' );
		}

		if ( null === $row_version ) {
			throw new InvalidArgumentException( 'device row has an invalid row_version.' );
		}

		if ( $this->positive_int( $context['offline_device_id'] ?? null ) !== $offline_device_id ) {
			throw new InvalidArgumentException( 'device row does not match authenticated offline_device_id.' );
		}

		if ( $public_id !== trim( (string) ( $context['device_id'] ?? '' ) ) ) {
			throw new InvalidArgumentException( 'device row does not match authenticated device_id.' );
		}

		$next_row_version = $row_version + 1;
		$device_mode      = strtolower( trim( (string) ( $context['device_mode'] ?? '' ) ) );
		$required_scope   = strtolower( trim( (string) ( $context['required_scope'] ?? '' ) ) );

		$device_update_row = array(
			'offline_device_id'    => $offline_device_id,
			'public_id'            => $public_id,
			'last_seen_at'         => $server_time_utc,
			'updated_at'           => $server_time_utc,
			'row_version'          => $next_row_version,
			'previous_row_version' => $row_version,
			'expected_row_version' => $row_version,
		);

		$session_context = array_merge(
			$context,
			array(
				'server_time_utc'    => $server_time_utc,
				'device_row_version' => $next_row_version,
			)
		);

		$audit_payload = array(
			'action'               => 'offline_device_session_planned',
			'offline_device_id'    => $offline_device_id,
			'device_id'            => $public_id,
			'device_mode'          => $device_mode,
			'location_id'          => $this->positive_int( $context['location_id'] ?? null ),
			'required_scope'       => $required_scope,
			'previous_row_version' => $row_version,
			'next_row_version'     => $next_row_version,
			'last_seen_at_utc'     => $server_time_utc,
			'server_time_utc'      => $server_time_utc,
		);

		return new OfflineDeviceSessionPlan( $device_update_row, $session_context, $audit_payload );
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

	private function is_public_id( string $value ): bool {
		return 1 === preg_match( '/^[a-zA-Z0-9._:-]{8,128}$/', $value );
	}

	private function is_utc_timestamp( string $value ): bool {
		return 1 === preg_match( '/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d+)?Z$/', $value );
	}
}
