<?php
/**
 * Offline device pairing request parser.
 *
 * @package TCGStorePlatform
 */

namespace TCGStorePlatform\Offline;

final class OfflineDevicePairingRequestParser {
	private const SUPPORTED_SCHEMA_VERSION = 1;
	private const SUPPORTED_PLATFORM       = 'windows';
	private const SUPPORTED_MODES          = array( 'kiosk', 'staff', 'admin' );
	private const SUPPORTED_CAPABILITIES   = array(
		'barcode_scanner',
		'label_printer',
		'receipt_printer',
		'touchscreen',
		'cash_drawer',
	);
	private const SUPPORTED_SCOPES         = array(
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
	 * @param array<string, mixed> $payload Request body.
	 */
	public function parse( array $payload ): OfflineDevicePairingValidationResult {
		$errors             = array();
		$pairing_code       = strtoupper( trim( (string) ( $payload['pairing_code'] ?? '' ) ) );
		$installation_id    = trim( (string) ( $payload['installation_id'] ?? '' ) );
		$device_label       = $this->normalize_label( (string) ( $payload['device_label'] ?? '' ) );
		$device_mode        = strtolower( trim( (string) ( $payload['device_mode'] ?? '' ) ) );
		$app_version        = trim( (string) ( $payload['app_version'] ?? '' ) );
		$platform           = strtolower( trim( (string) ( $payload['platform'] ?? '' ) ) );
		$capabilities       = $this->parse_capabilities( $payload['capabilities'] ?? null, $errors );
		$requested_scopes   = $this->parse_scopes( $payload['requested_scopes'] ?? null, $errors );
		$location_id        = $this->required_positive_int(
			$payload['location_id'] ?? null,
			'location_id',
			$errors
		);
		$manager_id         = $this->required_positive_int(
			$payload['manager_id'] ?? null,
			'manager_id',
			$errors
		);
		$schema_version     = $this->required_positive_int(
			$payload['schema_version'] ?? null,
			'schema_version',
			$errors
		);

		if ( '' === $pairing_code ) {
			$errors[] = 'pairing_code_required';
		} elseif ( ! $this->is_pairing_code( $pairing_code ) ) {
			$errors[] = 'pairing_code_invalid';
		}

		if ( '' === $installation_id ) {
			$errors[] = 'installation_id_required';
		} elseif ( ! $this->is_public_id( $installation_id ) ) {
			$errors[] = 'installation_id_invalid';
		}

		if ( '' === $device_label ) {
			$errors[] = 'device_label_required';
		} elseif ( strlen( $device_label ) < 3 || strlen( $device_label ) > 80 ) {
			$errors[] = 'device_label_invalid';
		}

		if ( ! in_array( $device_mode, self::SUPPORTED_MODES, true ) ) {
			$errors[] = 'device_mode_unsupported';
		}

		if ( '' === $app_version ) {
			$errors[] = 'app_version_required';
		} elseif ( ! $this->is_semver( $app_version ) ) {
			$errors[] = 'app_version_invalid';
		}

		if ( self::SUPPORTED_PLATFORM !== $platform ) {
			$errors[] = 'platform_unsupported';
		}

		if ( null !== $schema_version && self::SUPPORTED_SCHEMA_VERSION !== $schema_version ) {
			$errors[] = 'schema_version_unsupported';
		}

		if ( $errors ) {
			return OfflineDevicePairingValidationResult::rejected( array_values( array_unique( $errors ) ) );
		}

		return OfflineDevicePairingValidationResult::accepted(
			new OfflineDevicePairingRequest(
				$pairing_code,
				$installation_id,
				$device_label,
				$device_mode,
				$location_id ?? 0,
				$manager_id ?? 0,
				$app_version,
				$platform,
				$capabilities,
				$requested_scopes,
				$schema_version ?? 0
			)
		);
	}

	/**
	 * @param list<string> $errors Validation errors.
	 * @return array<string, bool>
	 */
	private function parse_capabilities( mixed $payload, array &$errors ): array {
		if ( ! is_array( $payload ) || array() === $payload ) {
			$errors[] = 'capabilities_required';

			return array();
		}

		$capabilities = array();

		foreach ( $payload as $name => $enabled ) {
			$name = strtolower( trim( (string) $name ) );

			if ( ! in_array( $name, self::SUPPORTED_CAPABILITIES, true ) ) {
				$errors[] = "capabilities_{$name}_unsupported";
				continue;
			}

			if ( ! is_bool( $enabled ) ) {
				$errors[] = "capabilities_{$name}_invalid";
				continue;
			}

			$capabilities[ $name ] = $enabled;
		}

		return $capabilities;
	}

	/**
	 * @param list<string> $errors Validation errors.
	 * @return list<string>
	 */
	private function parse_scopes( mixed $payload, array &$errors ): array {
		if ( ! is_array( $payload ) || array() === $payload ) {
			$errors[] = 'requested_scopes_required';

			return array();
		}

		$scopes = array();

		foreach ( array_values( $payload ) as $index => $scope ) {
			$scope = strtolower( trim( (string) $scope ) );

			if ( ! in_array( $scope, self::SUPPORTED_SCOPES, true ) ) {
				$errors[] = "requested_scopes_{$index}_unsupported";
				continue;
			}

			if ( ! in_array( $scope, $scopes, true ) ) {
				$scopes[] = $scope;
			}
		}

		return $scopes;
	}

	/**
	 * @param list<string> $errors Validation errors.
	 */
	private function required_positive_int( mixed $value, string $field, array &$errors ): ?int {
		$parsed = $this->positive_int( $value );

		if ( null === $parsed ) {
			$errors[] = null === $value || '' === $value ? $field . '_required' : $field . '_invalid';
		}

		return $parsed;
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

	private function normalize_label( string $label ): string {
		return trim( (string) preg_replace( '/\s+/', ' ', $label ) );
	}

	private function is_pairing_code( string $value ): bool {
		return 1 === preg_match( '/^[A-Z0-9-]{6,32}$/', $value );
	}

	private function is_public_id( string $value ): bool {
		return 1 === preg_match( '/^[a-zA-Z0-9._:-]{8,128}$/', $value );
	}

	private function is_semver( string $value ): bool {
		return 1 === preg_match( '/^\d+\.\d+\.\d+(?:[-+][a-zA-Z0-9.-]+)?$/', $value );
	}
}
