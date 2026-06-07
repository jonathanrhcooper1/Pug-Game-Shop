<?php
/**
 * Offline pairing authorization settings.
 *
 * @package TCGStorePlatform
 */

namespace TCGStorePlatform\Settings;

final class OfflinePairingAuthorizationSettings {
	private const DEVICE_MODES = array( 'kiosk', 'staff', 'admin' );
	private const SCOPES       = array(
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
	 * @return array<string, mixed>
	 */
	public static function defaults(): array {
		return array(
			'pairing_code_hashes'    => array(),
			'manager_ids'            => array(),
			'location_ids'           => array(),
			'allowed_scopes_by_mode' => array(
				'kiosk' => array(),
				'staff' => array(),
				'admin' => array(),
			),
			'expires_at_utc'         => '',
		);
	}

	/**
	 * @param mixed                $value Submitted offline pairing policy.
	 * @param array<string, mixed> $existing Existing stored policy.
	 * @return array<string, mixed>
	 */
	public static function sanitize( mixed $value, array $existing = array() ): array {
		$value    = is_array( $value ) ? $value : array();
		$existing = self::merge_defaults( $existing );

		return array(
			'pairing_code_hashes'    => self::hash_list(
				array_key_exists( 'pairing_code_hashes', $value )
					? $value['pairing_code_hashes']
					: $existing['pairing_code_hashes']
			),
			'manager_ids'            => self::positive_int_list(
				array_key_exists( 'manager_ids', $value )
					? $value['manager_ids']
					: $existing['manager_ids']
			),
			'location_ids'           => self::positive_int_list(
				array_key_exists( 'location_ids', $value )
					? $value['location_ids']
					: $existing['location_ids']
			),
			'allowed_scopes_by_mode' => self::scope_map(
				array_key_exists( 'allowed_scopes_by_mode', $value )
					? $value['allowed_scopes_by_mode']
					: $existing['allowed_scopes_by_mode']
			),
			'expires_at_utc'         => self::utc_timestamp(
				array_key_exists( 'expires_at_utc', $value )
					? $value['expires_at_utc']
					: $existing['expires_at_utc']
			),
		);
	}

	/**
	 * Build the policy array consumed by OfflineDevicePairingAuthorizer.
	 *
	 * @param array<string, mixed> $settings Full settings array or policy array.
	 * @return array<string, mixed>
	 */
	public static function policy( array $settings ): array {
		$value = $settings['offline_pairing_authorization'] ?? $settings;

		return self::sanitize( $value );
	}

	/**
	 * @param array<string, mixed> $existing Existing values.
	 * @return array<string, mixed>
	 */
	private static function merge_defaults( array $existing ): array {
		$merged = array_merge( self::defaults(), $existing );

		$merged['allowed_scopes_by_mode'] = is_array( $merged['allowed_scopes_by_mode'] )
			? $merged['allowed_scopes_by_mode']
			: array();

		return $merged;
	}

	/**
	 * @return list<string>
	 */
	private static function hash_list( mixed $value ): array {
		$hashes = array();

		foreach ( self::string_items( $value ) as $hash ) {
			$hash = strtolower( $hash );

			if ( 1 === preg_match( '/^[a-f0-9]{64}$/', $hash ) && ! in_array( $hash, $hashes, true ) ) {
				$hashes[] = $hash;
			}
		}

		return $hashes;
	}

	/**
	 * @return list<int>
	 */
	private static function positive_int_list( mixed $value ): array {
		$ids = array();

		foreach ( self::string_items( $value ) as $item ) {
			if ( 1 !== preg_match( '/^\d+$/', $item ) ) {
				continue;
			}

			$id = (int) $item;

			if ( $id > 0 && ! in_array( $id, $ids, true ) ) {
				$ids[] = $id;
			}
		}

		return $ids;
	}

	/**
	 * @return array<string, list<string>>
	 */
	private static function scope_map( mixed $value ): array {
		$value = is_array( $value ) ? $value : array();
		$map   = array();

		foreach ( self::DEVICE_MODES as $mode ) {
			$scopes = array();

			foreach ( self::string_items( $value[ $mode ] ?? array() ) as $scope ) {
				$scope = strtolower( $scope );

				if ( in_array( $scope, self::SCOPES, true ) && ! in_array( $scope, $scopes, true ) ) {
					$scopes[] = $scope;
				}
			}

			$map[ $mode ] = $scopes;
		}

		return $map;
	}

	private static function utc_timestamp( mixed $value ): string {
		$value = trim( (string) $value );

		return 1 === preg_match( '/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d+)?Z$/', $value )
			? $value
			: '';
	}

	/**
	 * @return list<string>
	 */
	private static function string_items( mixed $value ): array {
		if ( is_array( $value ) ) {
			$items = array();

			foreach ( array_values( $value ) as $item ) {
				$items = array_merge( $items, self::string_items( $item ) );
			}

			return $items;
		}

		$parts = preg_split( '/[\s,]+/', trim( (string) $value ) );

		return array_values(
			array_filter(
				false === $parts ? array() : $parts,
				static fn ( string $item ): bool => '' !== $item
			)
		);
	}

	private function __construct() {
	}
}
