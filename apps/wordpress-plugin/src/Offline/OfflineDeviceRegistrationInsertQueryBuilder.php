<?php
/**
 * Offline device registration insert query builder.
 *
 * @package TCGStorePlatform
 */

namespace TCGStorePlatform\Offline;

use DateTimeImmutable;
use DateTimeZone;
use Exception;

final class OfflineDeviceRegistrationInsertQueryBuilder {
	private const DEVICE_TABLE    = 'tcg_offline_devices';
	private const COLUMNS         = array(
		'public_id',
		'location_id',
		'manager_user_id',
		'device_label',
		'device_mode',
		'token_hash',
		'token_expires_at',
		'scopes_json',
		'capabilities_json',
		'app_version',
		'platform',
		'status',
		'last_seen_at',
		'revoked_at',
		'issued_at',
		'created_at',
		'updated_at',
		'row_version',
	);
	private const SUPPORTED_MODES = array( 'kiosk', 'staff', 'admin' );

	public function build(
		OfflineDeviceRegistrationPlan $registration_plan,
		string $table_prefix
	): OfflineDeviceRegistrationInsertQueryPlan {
		$errors       = array();
		$table_prefix = trim( $table_prefix );

		if (
			'' === $table_prefix
			|| 1 !== preg_match( '/^[A-Za-z0-9_]+$/', $table_prefix )
		) {
			$errors[] = 'table_prefix_invalid';
		}

		$row                    = $registration_plan->device_row();
		$public_id              = trim( (string) ( $row['public_id'] ?? '' ) );
		$location_id            = $this->positive_int( $row['location_id'] ?? null );
		$manager_user_id        = $this->positive_int( $row['manager_id'] ?? null );
		$device_label           = $this->bounded_string( $row['device_label'] ?? null, 1, 191 );
		$device_mode            = strtolower( trim( (string) ( $row['device_mode'] ?? '' ) ) );
		$token_hash             = strtolower( trim( (string) ( $row['token_hash'] ?? '' ) ) );
		$token_expires_at       = $this->mysql_datetime_utc( (string) ( $row['token_expires_at_utc'] ?? '' ) );
		$scopes_json            = $this->scopes_json( $row['scopes'] ?? null );
		$capabilities_json      = $this->capabilities_json( $row['capabilities'] ?? null );
		$app_version            = trim( (string) ( $row['app_version'] ?? '' ) );
		$platform               = strtolower( trim( (string) ( $row['platform'] ?? '' ) ) );
		$status                 = strtolower( trim( (string) ( $row['status'] ?? '' ) ) );
		$issued_at              = $this->mysql_datetime_utc( (string) ( $row['created_at_utc'] ?? '' ) );
		$created_at             = $issued_at;
		$updated_at             = $issued_at;
		$last_seen_at_is_null   = null === ( $row['last_seen_at_utc'] ?? null );
		$revoked_at_is_null     = null === ( $row['revoked_at_utc'] ?? null );
		$row_version            = 1;
		$token_expires_at_value = (string) ( $row['token_expires_at_utc'] ?? '' );
		$created_at_value       = (string) ( $row['created_at_utc'] ?? '' );

		if ( '' === $public_id || ! $this->is_public_id( $public_id ) ) {
			$errors[] = 'public_id_invalid';
		}

		if ( null === $location_id ) {
			$errors[] = 'location_id_invalid';
		}

		if ( null === $manager_user_id ) {
			$errors[] = 'manager_user_id_invalid';
		}

		if ( null === $device_label ) {
			$errors[] = 'device_label_invalid';
		}

		if ( ! in_array( $device_mode, self::SUPPORTED_MODES, true ) ) {
			$errors[] = 'device_mode_invalid';
		}

		if ( 1 !== preg_match( '/^[a-f0-9]{64}$/', $token_hash ) ) {
			$errors[] = 'token_hash_invalid';
		}

		if ( null === $token_expires_at ) {
			$errors[] = 'token_expires_at_invalid';
		}

		if ( null === $scopes_json ) {
			$errors[] = 'scopes_invalid';
		}

		if ( null === $capabilities_json ) {
			$errors[] = 'capabilities_invalid';
		}

		if ( 1 !== preg_match( '/^\d+\.\d+\.\d+(?:[-+][a-zA-Z0-9.-]+)?$/', $app_version ) ) {
			$errors[] = 'app_version_invalid';
		}

		if ( 'windows' !== $platform ) {
			$errors[] = 'platform_invalid';
		}

		if ( 'active' !== $status ) {
			$errors[] = 'status_invalid';
		}

		if ( ! $last_seen_at_is_null ) {
			$errors[] = 'last_seen_at_must_be_null';
		}

		if ( ! $revoked_at_is_null ) {
			$errors[] = 'revoked_at_must_be_null';
		}

		if ( null === $issued_at ) {
			$errors[] = 'created_at_invalid';
		}

		if (
			null !== $token_expires_at
			&& null !== $issued_at
			&& ! $this->expires_after_issue( $created_at_value, $token_expires_at_value )
		) {
			$errors[] = 'token_expiry_window_invalid';
		}

		if ( array() !== $errors ) {
			return OfflineDeviceRegistrationInsertQueryPlan::rejected( $errors );
		}

		$table_name   = $table_prefix . self::DEVICE_TABLE;
		$sql_template = sprintf(
			'INSERT INTO `%s` (%s) VALUES '
				. '(%%s, %%d, %%d, %%s, %%s, %%s, %%s, %%s, %%s, %%s, %%s, %%s, NULL, NULL, %%s, %%s, %%s, %%d)',
			$table_name,
			implode( ', ', array_map( array( $this, 'quote_identifier' ), self::COLUMNS ) )
		);
		$prepare_args = array(
			$public_id,
			$location_id,
			$manager_user_id,
			$device_label,
			$device_mode,
			$token_hash,
			$token_expires_at,
			$scopes_json,
			$capabilities_json,
			$app_version,
			$platform,
			$status,
			$issued_at,
			$created_at,
			$updated_at,
			$row_version,
		);

		return OfflineDeviceRegistrationInsertQueryPlan::accepted(
			$table_name,
			self::COLUMNS,
			$sql_template,
			$prepare_args,
			$public_id
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

	private function bounded_string( mixed $value, int $min_length, int $max_length ): ?string {
		if ( ! is_string( $value ) ) {
			return null;
		}

		$value  = trim( $value );
		$length = strlen( $value );

		if ( $length < $min_length || $length > $max_length ) {
			return null;
		}

		return $value;
	}

	private function is_public_id( string $value ): bool {
		return 1 === preg_match( '/^[a-zA-Z0-9._:-]{8,36}$/', $value );
	}

	private function scopes_json( mixed $value ): ?string {
		if ( ! is_array( $value ) || array() === $value ) {
			return null;
		}

		$scopes = array();
		foreach ( array_values( $value ) as $scope ) {
			if ( ! is_string( $scope ) || 1 !== preg_match( '/^[a-z0-9_]+$/', $scope ) ) {
				return null;
			}

			if ( ! in_array( $scope, $scopes, true ) ) {
				$scopes[] = $scope;
			}
		}

		return $this->json( $scopes );
	}

	private function capabilities_json( mixed $value ): ?string {
		if ( ! is_array( $value ) ) {
			return null;
		}

		$capabilities = array();
		foreach ( $value as $capability => $enabled ) {
			if ( ! is_string( $capability ) || 1 !== preg_match( '/^[a-z0-9_]+$/', $capability ) ) {
				return null;
			}

			if ( ! is_bool( $enabled ) ) {
				return null;
			}

			$capabilities[ $capability ] = $enabled;
		}

		return $this->json( $capabilities );
	}

	private function json( array $value ): string {
		if ( function_exists( 'wp_json_encode' ) ) {
			$json = wp_json_encode( $value, JSON_UNESCAPED_SLASHES );
		} else {
			$json = json_encode( $value, JSON_UNESCAPED_SLASHES );
		}

		return false === $json ? '[]' : (string) $json;
	}

	private function quote_identifier( string $identifier ): string {
		return '`' . $identifier . '`';
	}

	private function expires_after_issue( string $issued_at_utc, string $token_expires_at_utc ): bool {
		try {
			$issued_at  = new DateTimeImmutable( $issued_at_utc );
			$expires_at = new DateTimeImmutable( $token_expires_at_utc );
		} catch ( Exception ) {
			return false;
		}

		return $expires_at > $issued_at;
	}

	private function mysql_datetime_utc( string $value ): ?string {
		try {
			$date = new DateTimeImmutable( $value, new DateTimeZone( 'UTC' ) );
		} catch ( Exception ) {
			return null;
		}

		return $date->setTimezone( new DateTimeZone( 'UTC' ) )->format( 'Y-m-d H:i:s.u' );
	}
}
