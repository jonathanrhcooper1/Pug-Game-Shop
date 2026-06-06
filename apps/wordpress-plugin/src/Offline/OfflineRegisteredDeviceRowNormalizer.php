<?php
/**
 * Registered offline device row normalizer.
 *
 * @package TCGStorePlatform
 */

namespace TCGStorePlatform\Offline;

final class OfflineRegisteredDeviceRowNormalizer {
	private const SUPPORTED_MODES = array( 'kiosk', 'staff', 'admin' );

	/**
	 * @param array<string, mixed> $row Raw repository row.
	 */
	public function normalize( array $row ): OfflineRegisteredDeviceRowNormalizationResult {
		$errors                = array();
		$offline_device_id     = $this->positive_int( $row['offline_device_id'] ?? null );
		$public_id             = trim( (string) ( $row['public_id'] ?? '' ) );
		$location_id           = $this->positive_int( $row['location_id'] ?? null );
		$manager_user_id       = $this->optional_positive_int( $row['manager_user_id'] ?? null );
		$device_label          = trim( (string) ( $row['device_label'] ?? '' ) );
		$device_mode           = strtolower( trim( (string) ( $row['device_mode'] ?? '' ) ) );
		$status                = strtolower( trim( (string) ( $row['status'] ?? '' ) ) );
		$token_hash            = strtolower( trim( (string) ( $row['token_hash'] ?? '' ) ) );
		$token_expires_at_utc  = $this->datetime_utc( $this->field_value( $row, 'token_expires_at_utc', 'token_expires_at' ) );
		$revoked_at_utc        = $this->optional_datetime_utc( $this->field_value( $row, 'revoked_at_utc', 'revoked_at' ) );
		$last_seen_at_utc      = $this->optional_datetime_utc( $this->field_value( $row, 'last_seen_at_utc', 'last_seen_at' ) );
		$issued_at_utc         = $this->datetime_utc( $this->field_value( $row, 'issued_at_utc', 'issued_at' ) );
		$created_at_utc        = $this->datetime_utc( $this->field_value( $row, 'created_at_utc', 'created_at' ) );
		$updated_at_utc        = $this->datetime_utc( $this->field_value( $row, 'updated_at_utc', 'updated_at' ) );
		$row_version           = $this->positive_int( $row['row_version'] ?? null );
		$scopes                = $this->parse_string_list( $row['scopes'] ?? ( $row['scopes_json'] ?? null ), 'scopes', $errors );
		$capabilities          = $this->parse_capabilities( $row['capabilities'] ?? ( $row['capabilities_json'] ?? null ), $errors );

		if ( null === $offline_device_id ) {
			$errors[] = 'offline_device_id_invalid';
		}

		if ( '' === $public_id || ! $this->is_public_id( $public_id ) ) {
			$errors[] = 'public_id_invalid';
		}

		if ( null === $location_id ) {
			$errors[] = 'location_id_invalid';
		}

		if ( '' === $device_label ) {
			$errors[] = 'device_label_required';
		}

		if ( ! in_array( $device_mode, self::SUPPORTED_MODES, true ) ) {
			$errors[] = 'device_mode_unsupported';
		}

		if ( '' === $status ) {
			$errors[] = 'status_required';
		}

		if ( 1 !== preg_match( '/^[a-f0-9]{64}$/', $token_hash ) ) {
			$errors[] = 'token_hash_invalid';
		}

		if ( null === $token_expires_at_utc ) {
			$errors[] = 'token_expires_at_invalid';
		}

		if ( false === $revoked_at_utc ) {
			$errors[] = 'revoked_at_invalid';
		}

		if ( false === $last_seen_at_utc ) {
			$errors[] = 'last_seen_at_invalid';
		}

		if ( null === $issued_at_utc ) {
			$errors[] = 'issued_at_invalid';
		}

		if ( null === $created_at_utc ) {
			$errors[] = 'created_at_invalid';
		}

		if ( null === $updated_at_utc ) {
			$errors[] = 'updated_at_invalid';
		}

		if ( null === $row_version ) {
			$errors[] = 'row_version_invalid';
		}

		$audit_payload = $this->audit_payload(
			$offline_device_id,
			$public_id,
			$device_mode,
			$location_id,
			$status,
			$row_version,
			$token_hash,
			$scopes,
			$capabilities,
			$errors
		);

		if ( array() !== $errors ) {
			return OfflineRegisteredDeviceRowNormalizationResult::rejected( $errors, $audit_payload );
		}

		return OfflineRegisteredDeviceRowNormalizationResult::accepted(
			array(
				'offline_device_id'    => $offline_device_id,
				'public_id'            => $public_id,
				'location_id'          => $location_id,
				'manager_user_id'      => $manager_user_id,
				'device_label'         => $device_label,
				'device_mode'          => $device_mode,
				'status'               => $status,
				'token_hash'           => $token_hash,
				'token_expires_at_utc' => $token_expires_at_utc,
				'revoked_at_utc'       => $revoked_at_utc ?: null,
				'last_seen_at_utc'     => $last_seen_at_utc ?: null,
				'issued_at_utc'        => $issued_at_utc,
				'created_at_utc'       => $created_at_utc,
				'updated_at_utc'       => $updated_at_utc,
				'scopes'               => $scopes,
				'capabilities'         => $capabilities,
				'app_version'          => trim( (string) ( $row['app_version'] ?? '' ) ),
				'platform'             => strtolower( trim( (string) ( $row['platform'] ?? '' ) ) ),
				'row_version'          => $row_version,
			),
			$audit_payload
		);
	}

	/**
	 * @param list<string>         $scopes Normalized scopes.
	 * @param array<string, bool>  $capabilities Normalized capabilities.
	 * @param list<string>         $errors Normalization errors.
	 * @return array<string, mixed>
	 */
	private function audit_payload(
		?int $offline_device_id,
		string $public_id,
		string $device_mode,
		?int $location_id,
		string $status,
		?int $row_version,
		string $token_hash,
		array $scopes,
		array $capabilities,
		array $errors
	): array {
		return array(
			'action'            => 'offline_registered_device_row_normalized',
			'is_valid'          => array() === $errors,
			'offline_device_id' => $offline_device_id,
			'device_id'         => $public_id,
			'device_mode'       => $device_mode,
			'location_id'       => $location_id,
			'status'            => $status,
			'row_version'       => $row_version,
			'has_token_hash'    => '' !== $token_hash,
			'scope_count'       => count( $scopes ),
			'capability_count'  => count( $capabilities ),
			'errors'            => array_values( array_unique( $errors ) ),
		);
	}

	/**
	 * @param list<string> $errors Normalization errors.
	 * @return list<string>
	 */
	private function parse_string_list( mixed $payload, string $field, array &$errors ): array {
		$value = $this->decode_json( $payload, $field, $errors );

		if ( ! is_array( $value ) || array() === $value ) {
			$errors[] = "{$field}_required";

			return array();
		}

		if ( ! array_is_list( $value ) ) {
			$errors[] = "{$field}_invalid";

			return array();
		}

		$normalized = array();

		foreach ( array_values( $value ) as $index => $item ) {
			$item = strtolower( trim( (string) $item ) );

			if ( '' === $item ) {
				$errors[] = "{$field}_{$index}_invalid";
				continue;
			}

			if ( ! in_array( $item, $normalized, true ) ) {
				$normalized[] = $item;
			}
		}

		return $normalized;
	}

	/**
	 * @param list<string> $errors Normalization errors.
	 * @return array<string, bool>
	 */
	private function parse_capabilities( mixed $payload, array &$errors ): array {
		$value = $this->decode_json( $payload, 'capabilities', $errors );

		if ( ! is_array( $value ) || array() === $value ) {
			$errors[] = 'capabilities_required';

			return array();
		}

		$normalized = array();

		foreach ( $value as $key => $enabled ) {
			$key = strtolower( trim( (string) $key ) );

			if ( '' === $key || ! is_bool( $enabled ) ) {
				$errors[] = "capabilities_{$key}_invalid";
				continue;
			}

			$normalized[ $key ] = $enabled;
		}

		return $normalized;
	}

	/**
	 * @param list<string> $errors Normalization errors.
	 */
	private function decode_json( mixed $payload, string $field, array &$errors ): mixed {
		if ( is_array( $payload ) ) {
			return $payload;
		}

		if ( ! is_string( $payload ) ) {
			return null;
		}

		$payload = trim( $payload );

		if ( '' === $payload ) {
			return null;
		}

		$decoded = json_decode( $payload, true );

		if ( JSON_ERROR_NONE !== json_last_error() ) {
			$errors[] = "{$field}_json_invalid";

			return null;
		}

		return $decoded;
	}

	private function datetime_utc( mixed $value ): ?string {
		$value = trim( (string) $value );

		if ( 1 === preg_match( '/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d+)?Z$/', $value ) ) {
			return $value;
		}

		if ( 1 !== preg_match( '/^\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}(?:\.\d+)?$/', $value ) ) {
			return null;
		}

		return str_replace( ' ', 'T', $value ) . 'Z';
	}

	private function optional_datetime_utc( mixed $value ): string|false|null {
		if ( null === $value || '' === trim( (string) $value ) ) {
			return null;
		}

		return $this->datetime_utc( $value ) ?? false;
	}

	/**
	 * @param array<string, mixed> $row Raw repository row.
	 */
	private function field_value( array $row, string $preferred, string $fallback ): mixed {
		if ( array_key_exists( $preferred, $row ) ) {
			return $row[ $preferred ];
		}

		return $row[ $fallback ] ?? null;
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

	private function optional_positive_int( mixed $value ): ?int {
		if ( null === $value || '' === trim( (string) $value ) ) {
			return null;
		}

		return $this->positive_int( $value );
	}

	private function is_public_id( string $value ): bool {
		return 1 === preg_match( '/^[a-zA-Z0-9._:-]{8,128}$/', $value );
	}
}
