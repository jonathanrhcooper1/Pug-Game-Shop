<?php
/**
 * Offline device access policy.
 *
 * @package TCGStorePlatform
 */

namespace TCGStorePlatform\Offline;

use DateTimeImmutable;

final class OfflineDeviceAccessPolicy {
	private const SUPPORTED_MODES  = array( 'kiosk', 'staff', 'admin' );
	private const SUPPORTED_SCOPES = array(
		'offline_pull',
		'offline_push',
		'inventory',
		'kiosk',
		'customer_credit',
		'events',
		'buylist',
		'conflicts',
	);

	/**
	 * @param array<string, mixed> $device_row Stored device row.
	 */
	public function authorize( array $device_row, string $required_scope, string $now_utc ): OfflineDeviceAccessDecision {
		$errors               = array();
		$public_id            = trim( (string) ( $device_row['public_id'] ?? '' ) );
		$device_mode          = strtolower( trim( (string) ( $device_row['device_mode'] ?? '' ) ) );
		$status               = strtolower( trim( (string) ( $device_row['status'] ?? '' ) ) );
		$token_expires_at_utc = trim( (string) ( $device_row['token_expires_at_utc'] ?? '' ) );
		$revoked_at_utc       = trim( (string) ( $device_row['revoked_at_utc'] ?? '' ) );
		$location_id          = $this->positive_int( $device_row['location_id'] ?? null );
		$scopes               = $this->parse_scopes( $device_row['scopes'] ?? null, $errors );
		$required_scope       = strtolower( trim( $required_scope ) );
		$now_utc              = trim( $now_utc );

		if ( '' === $public_id ) {
			$errors[] = 'device_id_required';
		} elseif ( ! $this->is_public_id( $public_id ) ) {
			$errors[] = 'device_id_invalid';
		}

		if ( ! in_array( $device_mode, self::SUPPORTED_MODES, true ) ) {
			$errors[] = 'device_mode_unsupported';
		}

		if ( null === $location_id ) {
			$errors[] = 'location_id_invalid';
		}

		if ( 'active' !== $status ) {
			$errors[] = 'device_not_active';
		}

		if ( '' !== $revoked_at_utc ) {
			if ( ! $this->is_utc_timestamp( $revoked_at_utc ) ) {
				$errors[] = 'revoked_at_utc_invalid';
			}

			$errors[] = 'device_revoked';
		}

		if ( ! in_array( $required_scope, self::SUPPORTED_SCOPES, true ) ) {
			$errors[] = 'required_scope_unsupported';
		} elseif ( ! in_array( $required_scope, $scopes, true ) ) {
			$errors[] = 'required_scope_denied';
		}

		if ( ! $this->is_utc_timestamp( $now_utc ) ) {
			$errors[] = 'now_utc_invalid';
		}

		if ( ! $this->is_utc_timestamp( $token_expires_at_utc ) ) {
			$errors[] = 'token_expires_at_utc_invalid';
		} elseif ( $this->is_utc_timestamp( $now_utc ) && ! $this->token_is_active( $now_utc, $token_expires_at_utc ) ) {
			$errors[] = 'device_token_expired';
		}

		if ( $errors ) {
			return OfflineDeviceAccessDecision::rejected( array_values( array_unique( $errors ) ) );
		}

		return OfflineDeviceAccessDecision::accepted(
			array(
				'device_id'      => $public_id,
				'device_mode'    => $device_mode,
				'location_id'    => $location_id,
				'scopes'         => $scopes,
				'required_scope' => $required_scope,
			)
		);
	}

	/**
	 * @param list<string> $errors Rejection errors.
	 * @return list<string>
	 */
	private function parse_scopes( mixed $payload, array &$errors ): array {
		if ( ! is_array( $payload ) || array() === $payload ) {
			$errors[] = 'scopes_required';

			return array();
		}

		$scopes = array();

		foreach ( array_values( $payload ) as $index => $scope ) {
			$scope = strtolower( trim( (string) $scope ) );

			if ( ! in_array( $scope, self::SUPPORTED_SCOPES, true ) ) {
				$errors[] = "scopes_{$index}_unsupported";
				continue;
			}

			if ( ! in_array( $scope, $scopes, true ) ) {
				$scopes[] = $scope;
			}
		}

		return $scopes;
	}

	private function token_is_active( string $now_utc, string $token_expires_at_utc ): bool {
		$now        = new DateTimeImmutable( $now_utc );
		$expires_at = new DateTimeImmutable( $token_expires_at_utc );

		return $expires_at > $now;
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
