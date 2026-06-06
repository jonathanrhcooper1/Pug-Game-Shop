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
			'logging_level'            => 'warning',
			'delete_data_on_uninstall' => false,
			'daily_run_time'           => '09:00',
			'daily_timezone'           => 'America/New_York',
			'branding'                 => BrandingSettings::defaults(),
			'topdeck_api_key'          => '',
			'topdeck_base_url'         => 'https://topdeck.gg/api',
			'topdeck_create_enabled'   => false,
			'topdeck_rate_limit'       => 60,
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
		$api_key        = isset( $value['topdeck_api_key'] ) ? trim( (string) $value['topdeck_api_key'] ) : (string) ( $existing['topdeck_api_key'] ?? '' );
		$base_url       = isset( $value['topdeck_base_url'] ) ? trim( (string) $value['topdeck_base_url'] ) : 'https://topdeck.gg/api';
		$rate_limit     = isset( $value['topdeck_rate_limit'] ) ? (int) $value['topdeck_rate_limit'] : 60;
		$branding       = BrandingSettings::sanitize(
			$value['branding'] ?? array(),
			is_array( $existing['branding'] ?? null ) ? $existing['branding'] : BrandingSettings::defaults()
		);

		if ( ! in_array( $level, $allowed_levels, true ) ) {
			$level = 'warning';
		}

		if ( '' === $api_key && ! empty( $existing['topdeck_api_key'] ) ) {
			$api_key = (string) $existing['topdeck_api_key'];
		}

		if ( false === filter_var( $base_url, FILTER_VALIDATE_URL ) || ! str_starts_with( $base_url, 'https://' ) ) {
			$base_url = 'https://topdeck.gg/api';
		}

		if ( $rate_limit < 1 || $rate_limit > 600 ) {
			$rate_limit = 60;
		}

		return array(
			'logging_level'            => $level,
			'delete_data_on_uninstall' => ! empty( $value['delete_data_on_uninstall'] ),
			'daily_run_time'           => '09:00',
			'daily_timezone'           => 'America/New_York',
			'branding'                 => $branding,
			'topdeck_api_key'          => $api_key,
			'topdeck_base_url'         => $base_url,
			'topdeck_create_enabled'   => ! empty( $value['topdeck_create_enabled'] ),
			'topdeck_rate_limit'       => $rate_limit,
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
