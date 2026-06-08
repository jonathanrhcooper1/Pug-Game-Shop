<?php
/**
 * Secret-free offline app connector manifest planning.
 *
 * @package TCGStorePlatform
 */

namespace TCGStorePlatform\Api\V1;

use TCGStorePlatform\Settings\BrandingSettings;
use TCGStorePlatform\Settings\ScryDexProviderSettings;
use TCGStorePlatform\Settings\Settings;

final class OfflineConnectorManifestPlanner {
	private const REST_NAMESPACE = 'tcg-store/v1';
	private const REST_BASE_PATH = '/wp-json/tcg-store/v1';

	/**
	 * @param array<string, mixed>|null $settings Full platform settings.
	 * @param array<string, mixed>      $context Optional site/environment context.
	 * @return array<string, mixed>
	 */
	public function plan( ?array $settings = null, array $context = array() ): array {
		$settings      = $settings ?? Settings::all();
		$branding      = BrandingSettings::public_config( $settings );
		$scrydex       = ScryDexProviderSettings::public_status( $settings );
		$site_url      = $this->site_url( $context );
		$environment   = $this->environment( $context );
		$site_is_https = str_starts_with( $site_url, 'https://' );
		$route_plans   = $this->offline_routes();

		return array(
			'status'                          => $this->status( $environment, $site_is_https ),
			'action'                          => 'offline_connector_manifest',
			'profile_manifest_ready'          => true,
			'profile_id'                      => $this->profile_id(
				(string) ( $branding['company']['short_name'] ?? $branding['company']['name'] ?? 'tcg-store' ),
				$environment,
				$site_url
			),
			'environment'                     => $environment,
			'company'                         => $branding['company'],
			'theme'                           => $branding['theme'],
			'wordpress'                       => array(
				'site_url'                          => $site_url,
				'site_url_secure'                   => $site_is_https,
				'rest_namespace'                    => self::REST_NAMESPACE,
				'rest_base_path'                    => self::REST_BASE_PATH,
				'rest_base_url'                     => $this->join_url( $site_url, self::REST_BASE_PATH ),
				'connector_manifest_url'            => $this->join_url( $site_url, self::REST_BASE_PATH . '/offline/connector-manifest' ),
				'auth_mode'                         => 'offline_device_token',
				'device_pairing_required'           => true,
				'credential_storage'                => 'desktop_secure_store',
				'network_requests_deferred'         => true,
				'route_registration_deferred'       => true,
				'https_required_for_remote_pairing' => true,
			),
			'offline_routes'                  => $route_plans,
			'offline_route_count'             => count( $route_plans ),
			'square'                          => array(
				'inventory_authority'                 => 'tcg_store_platform',
				'payment_authority'                   => 'official_woocommerce_square_extension',
				'provider_inventory_writes_deferred'  => true,
				'payment_capture_deferred'            => true,
				'production_provider_writes_deferred' => true,
				'production_payment_capture_deferred' => true,
			),
			'scrydex'                         => array(
				'configured'                 => true === $scrydex['configured'],
				'environment'                => (string) $scrydex['environment'],
				'base_url'                   => (string) $scrydex['base_url'],
				'team_id_configured'         => true === $scrydex['team_id_configured'],
				'active_key_slot'            => (string) $scrydex['active_key_slot'],
				'credential_storage'         => 'wordpress_server_settings',
				'credential_values_redacted' => true,
				'credentials_synced_to_app'  => false,
				'network_requests_deferred'  => true,
				'database_writes_deferred'   => true,
				'configuration_issues'       => $this->list_values( $scrydex['configuration_issues'] ?? array() ),
			),
			'credentials_synced_to_app'       => false,
			'production_credentials_deferred' => true,
			'manifest_public_safe'            => true,
		);
	}

	/**
	 * @param array<string, mixed>|null $settings Full platform settings.
	 * @param array<string, mixed>      $context Optional site/environment context.
	 * @return array{value:string,status:string}
	 */
	public function admin_summary( ?array $settings = null, array $context = array() ): array {
		$plan = $this->plan( $settings, $context );

		return array(
			'value'  => sprintf(
				'%s; %s; %d offline routes; secrets redacted',
				(string) ( $plan['company']['name'] ?? 'TCG Store Platform' ),
				(string) $plan['environment'],
				(int) $plan['offline_route_count']
			),
			'status' => 'ready' === $plan['status'] ? 'ready' : 'degraded',
		);
	}

	/**
	 * @return list<array<string, mixed>>
	 */
	private function offline_routes(): array {
		return array_values(
			array_map(
				static fn ( array $route ): array => array(
					'path'                    => (string) $route['path'],
					'method'                  => (string) $route['method'],
					'required_scope'          => (string) $route['required_scope'],
					'permission_strategy'     => (string) $route['permission_strategy'],
					'live_enabled_by_default' => true === $route['live_enabled_by_default'],
				),
				OfflineRouteContracts::route_contracts()
			)
		);
	}

	/**
	 * @param array<string, mixed> $context Site/environment context.
	 */
	private function site_url( array $context ): string {
		if ( isset( $context['site_url'] ) ) {
			return $this->clean_site_url( $context['site_url'] );
		}

		if ( function_exists( 'home_url' ) ) {
			return $this->clean_site_url( home_url() );
		}

		if ( function_exists( 'get_site_url' ) ) {
			return $this->clean_site_url( get_site_url() );
		}

		return 'https://offline.local';
	}

	/**
	 * @param array<string, mixed> $context Site/environment context.
	 */
	private function environment( array $context ): string {
		if ( isset( $context['environment'] ) ) {
			return $this->clean_environment( $context['environment'] );
		}

		if ( function_exists( 'wp_get_environment_type' ) ) {
			return $this->clean_environment( wp_get_environment_type() );
		}

		return 'development';
	}

	private function status( string $environment, bool $site_is_https ): string {
		if ( $site_is_https || in_array( $environment, array( 'local', 'development' ), true ) ) {
			return 'ready';
		}

		return 'degraded';
	}

	private function profile_id( string $company_short_name, string $environment, string $site_url ): string {
		$parsed_host = parse_url( $site_url, PHP_URL_HOST );
		$host        = '' === (string) $parsed_host ? 'offline-local' : (string) $parsed_host;

		return $this->slug( "{$company_short_name}-{$environment}-{$host}" );
	}

	private function join_url( string $site_url, string $path ): string {
		return rtrim( $site_url, '/' ) . '/' . ltrim( $path, '/' );
	}

	private function clean_site_url( mixed $value ): string {
		$url = rtrim( trim( (string) $value ), '/' );

		if ( false === filter_var( $url, FILTER_VALIDATE_URL ) ) {
			return 'https://offline.local';
		}

		return $url;
	}

	private function clean_environment( mixed $value ): string {
		$environment = strtolower( trim( (string) $value ) );

		return in_array( $environment, array( 'local', 'development', 'staging', 'production' ), true )
			? $environment
			: 'development';
	}

	private function slug( string $value ): string {
		$value = strtolower( trim( $value ) );
		$value = preg_replace( '/[^a-z0-9]+/', '-', $value ) ?? '';
		$value = trim( $value, '-' );

		return '' === $value ? 'tcg-store-development-offline-local' : substr( $value, 0, 120 );
	}

	/**
	 * @return list<string>
	 */
	private function list_values( mixed $values ): array {
		if ( ! is_array( $values ) ) {
			return array();
		}

		return array_values(
			array_filter(
				array_map(
					static fn ( mixed $value ): string => is_array( $value ) || is_object( $value )
						? ''
						: trim( (string) $value ),
					$values
				),
				static fn ( string $value ): bool => '' !== $value
			)
		);
	}
}
