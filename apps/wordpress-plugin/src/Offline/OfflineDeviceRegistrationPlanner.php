<?php
/**
 * Offline device registration planner.
 *
 * @package TCGStorePlatform
 */

namespace TCGStorePlatform\Offline;

use DateTimeImmutable;
use InvalidArgumentException;

final class OfflineDeviceRegistrationPlanner {
	private const SYNC_ROUTES = array(
		'pull'      => '/wp-json/tcg-store/v1/offline/pull',
		'push'      => '/wp-json/tcg-store/v1/offline/push',
		'conflicts' => '/wp-json/tcg-store/v1/offline/conflicts',
	);

	public function plan(
		OfflineDevicePairingRequest $request,
		string $device_id,
		string $issued_device_token,
		string $device_token_hash,
		string $issued_at_utc,
		string $token_expires_at_utc
	): OfflineDeviceRegistrationPlan {
		$device_id            = trim( $device_id );
		$issued_device_token  = trim( $issued_device_token );
		$device_token_hash    = strtolower( trim( $device_token_hash ) );
		$issued_at_utc        = trim( $issued_at_utc );
		$token_expires_at_utc = trim( $token_expires_at_utc );

		$this->assert_generated_inputs(
			$device_id,
			$issued_device_token,
			$device_token_hash,
			$issued_at_utc,
			$token_expires_at_utc
		);

		$device_row = array(
			'public_id'            => $device_id,
			'installation_id'      => $request->installation_id(),
			'device_label'         => $request->device_label(),
			'device_mode'          => $request->device_mode(),
			'location_id'          => $request->location_id(),
			'manager_id'           => $request->manager_id(),
			'app_version'          => $request->app_version(),
			'platform'             => $request->platform(),
			'capabilities'         => $request->capabilities(),
			'scopes'               => $request->requested_scopes(),
			'token_hash'           => $device_token_hash,
			'token_expires_at_utc' => $token_expires_at_utc,
			'status'               => 'active',
			'created_at_utc'       => $issued_at_utc,
			'last_seen_at_utc'     => null,
			'revoked_at_utc'       => null,
		);

		$response_payload = array(
			'device_id'              => $device_id,
			'device_token'           => $issued_device_token,
			'token_expires_at_utc'   => $token_expires_at_utc,
			'schema_version'         => $request->schema_version(),
			'scopes'                 => $request->requested_scopes(),
			'sync_routes'            => self::SYNC_ROUTES,
			'first_sync_required'    => true,
			'server_time_utc'        => $issued_at_utc,
			'branding_sync_required' => true,
		);

		$audit_payload = array(
			'action'               => 'offline_device_registration_planned',
			'device_id'            => $device_id,
			'installation_id'      => $request->installation_id(),
			'device_mode'          => $request->device_mode(),
			'location_id'          => $request->location_id(),
			'manager_id'           => $request->manager_id(),
			'app_version'          => $request->app_version(),
			'platform'             => $request->platform(),
			'capabilities'         => $request->capabilities(),
			'scopes'               => $request->requested_scopes(),
			'token_expires_at_utc' => $token_expires_at_utc,
			'created_at_utc'       => $issued_at_utc,
		);

		return new OfflineDeviceRegistrationPlan( $device_row, $response_payload, $audit_payload );
	}

	private function assert_generated_inputs(
		string $device_id,
		string $issued_device_token,
		string $device_token_hash,
		string $issued_at_utc,
		string $token_expires_at_utc
	): void {
		if ( ! $this->is_public_id( $device_id ) ) {
			throw new InvalidArgumentException( 'device_id must be a generated public ID.' );
		}

		if ( ! $this->is_device_token( $issued_device_token ) ) {
			throw new InvalidArgumentException( 'issued_device_token must be an opaque one-time token.' );
		}

		if ( 1 !== preg_match( '/^[a-f0-9]{64}$/', $device_token_hash ) ) {
			throw new InvalidArgumentException( 'device_token_hash must be a lowercase SHA-256 hash.' );
		}

		if ( ! $this->is_utc_timestamp( $issued_at_utc ) ) {
			throw new InvalidArgumentException( 'issued_at_utc must be an ISO-8601 UTC timestamp.' );
		}

		if ( ! $this->is_utc_timestamp( $token_expires_at_utc ) ) {
			throw new InvalidArgumentException( 'token_expires_at_utc must be an ISO-8601 UTC timestamp.' );
		}

		if ( ! $this->expires_after_issue( $issued_at_utc, $token_expires_at_utc ) ) {
			throw new InvalidArgumentException( 'token_expires_at_utc must be after issued_at_utc.' );
		}
	}

	private function expires_after_issue( string $issued_at_utc, string $token_expires_at_utc ): bool {
		$issued_at  = new DateTimeImmutable( $issued_at_utc );
		$expires_at = new DateTimeImmutable( $token_expires_at_utc );

		return $expires_at > $issued_at;
	}

	private function is_public_id( string $value ): bool {
		return 1 === preg_match( '/^[a-zA-Z0-9._:-]{8,128}$/', $value );
	}

	private function is_device_token( string $value ): bool {
		return 1 === preg_match( '/^[a-zA-Z0-9._:-]{32,256}$/', $value );
	}

	private function is_utc_timestamp( string $value ): bool {
		return 1 === preg_match( '/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d+)?Z$/', $value );
	}
}
