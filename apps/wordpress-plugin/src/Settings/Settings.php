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
			'offline_route_runtime'         => OfflineRouteRuntimeSettings::defaults(),
			'inventory_route_runtime'       => InventoryRouteRuntimeSettings::defaults(),
			'scrydex_provider'              => ScryDexProviderSettings::defaults(),
			'scrydex_usage_budget'          => ScryDexUsageBudgetSettings::defaults(),
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
		$settings['offline_route_runtime']         = OfflineRouteRuntimeSettings::sanitize(
			$settings['offline_route_runtime'] ?? array()
		);
		$settings['inventory_route_runtime']       = InventoryRouteRuntimeSettings::sanitize(
			$settings['inventory_route_runtime'] ?? array()
		);
		$settings['scrydex_provider']              = ScryDexProviderSettings::sanitize(
			$settings['scrydex_provider'] ?? array(),
			is_array( $settings['scrydex_provider'] ?? null ) ? $settings['scrydex_provider'] : array()
		);
		$settings['scrydex_usage_budget']          = ScryDexUsageBudgetSettings::sanitize(
			$settings['scrydex_usage_budget'] ?? array(),
			is_array( $settings['scrydex_usage_budget'] ?? null ) ? $settings['scrydex_usage_budget'] : array()
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

		$offline_pairing_input         = self::prepare_offline_pairing_authorization_input(
			$value['offline_pairing_authorization'] ?? ( $existing['offline_pairing_authorization'] ?? array() ),
			is_array( $existing['offline_pairing_authorization'] ?? null )
				? $existing['offline_pairing_authorization']
				: OfflinePairingAuthorizationSettings::defaults()
		);
		$offline_pairing_authorization = OfflinePairingAuthorizationSettings::sanitize(
			$offline_pairing_input,
			is_array( $existing['offline_pairing_authorization'] ?? null )
			? $existing['offline_pairing_authorization']
				: OfflinePairingAuthorizationSettings::defaults()
		);
		$offline_route_runtime         = OfflineRouteRuntimeSettings::sanitize(
			$value['offline_route_runtime'] ?? array()
		);
		$inventory_route_runtime       = InventoryRouteRuntimeSettings::sanitize(
			$value['inventory_route_runtime'] ?? array()
		);
		$scrydex_provider              = ScryDexProviderSettings::sanitize(
			$value['scrydex_provider'] ?? ( $existing['scrydex_provider'] ?? array() ),
			is_array( $existing['scrydex_provider'] ?? null )
				? $existing['scrydex_provider']
				: ScryDexProviderSettings::defaults()
		);
		$scrydex_usage_budget          = ScryDexUsageBudgetSettings::sanitize(
			$value['scrydex_usage_budget'] ?? ( $existing['scrydex_usage_budget'] ?? array() ),
			is_array( $existing['scrydex_usage_budget'] ?? null )
				? $existing['scrydex_usage_budget']
				: ScryDexUsageBudgetSettings::defaults()
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
			'offline_route_runtime'         => $offline_route_runtime,
			'inventory_route_runtime'       => $inventory_route_runtime,
			'scrydex_provider'              => $scrydex_provider,
			'scrydex_usage_budget'          => $scrydex_usage_budget,
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

	/**
	 * Hash one-time pairing codes submitted through the trusted Settings API.
	 *
	 * Direct settings providers intentionally cannot pass raw pairing codes to
	 * the authorizer factory; this save path converts them into hashes and
	 * discards the raw value before sanitization/storage.
	 *
	 * @param mixed                $value Submitted pairing settings.
	 * @param array<string, mixed> $existing Existing pairing settings.
	 * @return array<string, mixed>
	 */
	private static function prepare_offline_pairing_authorization_input( mixed $value, array $existing ): array {
		$value = is_array( $value ) ? $value : array();
		$code  = strtoupper( trim( (string) ( $value['pairing_code'] ?? '' ) ) );

		unset( $value['pairing_code'] );

		if ( 1 !== preg_match( '/^[A-Z0-9-]{6,32}$/', $code ) ) {
			return $value;
		}

		$hashes = $value['pairing_code_hashes'] ?? ( $existing['pairing_code_hashes'] ?? array() );
		$hashes = is_array( $hashes ) ? $hashes : preg_split( '/[\s,]+/', trim( (string) $hashes ) );

		if ( ! is_array( $hashes ) ) {
			$hashes = array();
		}

		$value['pairing_code_hashes'] = array_merge(
			$hashes,
			array( hash( 'sha256', $code ) )
		);

		return $value;
	}

	private function __construct() {
	}
}
