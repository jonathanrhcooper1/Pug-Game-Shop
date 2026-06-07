<?php
/**
 * Platform settings.
 *
 * @package TCGStorePlatform
 */

namespace TCGStorePlatform\Settings;

final class Settings {
	public const OPTION_NAME = 'tcg_store_platform_settings';

	public static function install_defaults(): void {
		add_option( self::OPTION_NAME, self::defaults(), '', false );
	}

	/**
	 * @return array<string, mixed>
	 */
	public static function defaults(): array {
		return array(
			'logging_level'                 => 'warning',
			'delete_data_on_uninstall'      => false,
			'daily_run_time'                => '09:00',
			'daily_timezone'                => 'America/New_York',
			'branding'                      => BrandingSettings::defaults(),
			'offline_pairing_authorization' => OfflinePairingAuthorizationSettings::defaults(),
		);
	}

	/**
	 * @return array<string, mixed>
	 */
	public static function all(): array {
		$value = get_option( self::OPTION_NAME, self::defaults() );

		$settings             = array_merge( self::defaults(), is_array( $value ) ? $value : array() );
		$settings['branding'] = BrandingSettings::sanitize(
			$settings['branding'] ?? array(),
			BrandingSettings::defaults()
		);

		$settings['offline_pairing_authorization'] = OfflinePairingAuthorizationSettings::sanitize(
			$settings['offline_pairing_authorization'] ?? array(),
			OfflinePairingAuthorizationSettings::defaults()
		);

		return $settings;
	}

	public static function get( string $key, mixed $fallback = null ): mixed {
		$settings = self::all();

		return array_key_exists( $key, $settings ) ? $settings[ $key ] : $fallback;
	}

	/**
	 * Sanitize administrator-controlled settings.
	 *
	 * The mandated 9:00 AM Eastern schedule is intentionally immutable here.
	 *
	 * @param mixed $value Submitted setting collection.
	 * @return array<string, mixed>
	 */
	public static function sanitize( mixed $value ): array {
		$value          = is_array( $value ) ? $value : array();
		$existing       = self::existing_values();
		$allowed_levels = array( 'debug', 'info', 'warning', 'error' );
		$level          = isset( $value['logging_level'] ) ? strtolower( (string) $value['logging_level'] ) : 'warning';
		$branding       = BrandingSettings::sanitize(
			$value['branding'] ?? array(),
			is_array( $existing['branding'] ?? null ) ? $existing['branding'] : BrandingSettings::defaults()
		);

		$offline_pairing_authorization = OfflinePairingAuthorizationSettings::sanitize(
			$value['offline_pairing_authorization'] ?? ( $existing['offline_pairing_authorization'] ?? array() ),
			is_array( $existing['offline_pairing_authorization'] ?? null )
				? $existing['offline_pairing_authorization']
				: OfflinePairingAuthorizationSettings::defaults()
		);

		if ( ! in_array( $level, $allowed_levels, true ) ) {
			$level = 'warning';
		}

		return array(
			'logging_level'                 => $level,
			'delete_data_on_uninstall'      => ! empty( $value['delete_data_on_uninstall'] ),
			'daily_run_time'                => '09:00',
			'daily_timezone'                => 'America/New_York',
			'branding'                      => $branding,
			'offline_pairing_authorization' => $offline_pairing_authorization,
		);
	}

	/**
	 * @return array<string, mixed>
	 */
	private static function existing_values(): array {
		if ( ! function_exists( 'get_option' ) ) {
			return array();
		}

		$value = get_option( self::OPTION_NAME, array() );

		return is_array( $value ) ? $value : array();
	}

	private function __construct() {
	}
}
