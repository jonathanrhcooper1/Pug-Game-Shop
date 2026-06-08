<?php
/**
 * ScryDex provider credential settings.
 *
 * @package TCGStorePlatform
 */

namespace TCGStorePlatform\Settings;

final class ScryDexProviderSettings {
	public const KEY = 'scrydex_provider';

	private const ENVIRONMENTS = array( 'disabled', 'sandbox', 'staging' );

	/**
	 * @return array<string, mixed>
	 */
	public static function defaults(): array {
		return array(
			'enabled'                      => false,
			'environment'                  => 'disabled',
			'base_url'                     => 'https://api.scrydex.com',
			'team_id'                      => '',
			'primary_api_key'              => '',
			'secondary_api_key'            => '',
			'request_timeout_seconds'      => 15,
			'webhook_registration_enabled' => false,
		);
	}

	/**
	 * @param array<string, mixed> $settings Full platform settings or ScryDex settings.
	 * @return array<string, mixed>
	 */
	public static function from_settings( array $settings ): array {
		return self::sanitize( $settings[ self::KEY ] ?? $settings );
	}

	/**
	 * @param mixed                $value Submitted ScryDex settings.
	 * @param array<string, mixed> $existing Existing stored ScryDex settings.
	 * @return array<string, mixed>
	 */
	public static function sanitize( mixed $value, array $existing = array() ): array {
		$value       = is_array( $value ) ? $value : array();
		$existing    = array_merge( self::defaults(), $existing );
		$environment = self::environment( $value['environment'] ?? $existing['environment'] );
		$enabled     = 'disabled' !== $environment && ! empty( $value['enabled'] );

		return array(
			'enabled'                      => $enabled,
			'environment'                  => $environment,
			'base_url'                     => self::https_url(
				$value['base_url'] ?? $existing['base_url'],
				(string) $existing['base_url']
			),
			'team_id'                      => self::secret_value(
				$value['team_id'] ?? null,
				(string) $existing['team_id'],
				! empty( $value['clear_team_id'] )
			),
			'primary_api_key'              => self::secret_value(
				$value['primary_api_key'] ?? null,
				(string) $existing['primary_api_key'],
				! empty( $value['clear_primary_api_key'] )
			),
			'secondary_api_key'            => self::secret_value(
				$value['secondary_api_key'] ?? null,
				(string) $existing['secondary_api_key'],
				! empty( $value['clear_secondary_api_key'] )
			),
			'request_timeout_seconds'      => self::timeout_seconds(
				$value['request_timeout_seconds'] ?? $existing['request_timeout_seconds']
			),
			'webhook_registration_enabled' => false,
		);
	}

	/**
	 * Secret-bearing context for server-side provider construction only.
	 *
	 * @param array<string, mixed> $settings Full platform settings or ScryDex settings.
	 * @return array<string, mixed>
	 */
	public static function provider_context( array $settings ): array {
		$settings = self::from_settings( $settings );
		$key      = '' !== $settings['primary_api_key']
			? (string) $settings['primary_api_key']
			: (string) $settings['secondary_api_key'];

		return array(
			'configured'              => true === self::public_status( $settings )['configured'],
			'environment'             => $settings['environment'],
			'base_url'                => $settings['base_url'],
			'api_key'                 => $key,
			'team_id'                 => $settings['team_id'],
			'request_timeout_seconds' => $settings['request_timeout_seconds'],
		);
	}

	/**
	 * @param array<string, mixed> $settings Full platform settings or ScryDex settings.
	 * @return array<string, mixed>
	 */
	public static function public_status( array $settings ): array {
		$settings             = self::from_settings( $settings );
		$team_configured      = '' !== $settings['team_id'];
		$primary_configured   = '' !== $settings['primary_api_key'];
		$secondary_configured = '' !== $settings['secondary_api_key'];
		$key_configured       = $primary_configured || $secondary_configured;
		$configured           = true === $settings['enabled']
			&& 'disabled' !== $settings['environment']
			&& $team_configured
			&& $key_configured;
		$issues               = array();

		if ( true !== $settings['enabled'] ) {
			$issues[] = 'scrydex_sync_disabled';
		}

		if ( 'disabled' === $settings['environment'] ) {
			$issues[] = 'scrydex_environment_disabled';
		}

		if ( ! $team_configured ) {
			$issues[] = 'scrydex_team_id_missing';
		}

		if ( ! $key_configured ) {
			$issues[] = 'scrydex_provider_key_missing';
		}

		return array(
			'configured'                    => $configured,
			'status'                        => $configured ? 'ready' : 'blocked',
			'enabled'                       => true === $settings['enabled'],
			'environment'                   => $settings['environment'],
			'base_url'                      => $settings['base_url'],
			'team_id_configured'            => $team_configured,
			'primary_key_configured'        => $primary_configured,
			'secondary_key_configured'      => $secondary_configured,
			'active_key_slot'               => $primary_configured
				? 'primary'
				: ( $secondary_configured ? 'secondary' : 'none' ),
			'active_key_fingerprint'        => self::fingerprint(
				$primary_configured
					? (string) $settings['primary_api_key']
					: (string) $settings['secondary_api_key']
			),
			'request_timeout_seconds'       => $settings['request_timeout_seconds'],
			'credential_values_redacted'    => true,
			'network_requests_deferred'     => true,
			'webhook_registration_deferred' => true,
			'webhook_registration_enabled'  => false,
			'configuration_issues'          => array_values( array_unique( $issues ) ),
		);
	}

	/**
	 * @param array<string, mixed> $settings Full platform settings or ScryDex settings.
	 * @return array{value:string,status:string}
	 */
	public static function admin_summary( array $settings ): array {
		$status = self::public_status( $settings );

		return array(
			'value'  => sprintf(
				'%s; team %s; primary %s; secondary %s; requests deferred',
				(string) $status['environment'],
				true === $status['team_id_configured'] ? 'configured' : 'missing',
				true === $status['primary_key_configured'] ? 'configured' : 'missing',
				true === $status['secondary_key_configured'] ? 'configured' : 'missing'
			),
			'status' => true === $status['configured'] ? 'ready' : 'degraded',
		);
	}

	private static function environment( mixed $value ): string {
		$environment = strtolower( trim( (string) $value ) );

		return in_array( $environment, self::ENVIRONMENTS, true ) ? $environment : 'disabled';
	}

	private static function https_url( mixed $value, string $fallback ): string {
		$url = trim( (string) $value );

		if ( false === filter_var( $url, FILTER_VALIDATE_URL ) || ! str_starts_with( $url, 'https://' ) ) {
			return str_starts_with( $fallback, 'https://' ) ? $fallback : self::defaults()['base_url'];
		}

		return rtrim( $url, '/' );
	}

	private static function secret_value( mixed $value, string $existing, bool $clear ): string {
		if ( $clear ) {
			return '';
		}

		if ( null === $value ) {
			return self::clean_secret( $existing );
		}

		$value = trim( (string) $value );

		if ( '' === $value || '[redacted]' === strtolower( $value ) || '********' === $value ) {
			return self::clean_secret( $existing );
		}

		return self::clean_secret( $value );
	}

	private static function clean_secret( string $value ): string {
		$value = trim( $value );

		if ( '' === $value ) {
			return '';
		}

		$value = preg_replace( '/[\x00-\x20]+/', '', $value ) ?? '';

		if ( strlen( $value ) > 256 ) {
			$value = substr( $value, 0, 256 );
		}

		if ( 1 !== preg_match( '/^[A-Za-z0-9._~:+\/=-]+$/', $value ) ) {
			return '';
		}

		return $value;
	}

	private static function timeout_seconds( mixed $value ): int {
		$value = (int) $value;

		if ( $value < 5 ) {
			return 5;
		}

		if ( $value > 60 ) {
			return 60;
		}

		return $value;
	}

	private static function fingerprint( string $value ): string {
		return '' === $value ? '' : substr( hash( 'sha256', $value ), 0, 12 );
	}

	private function __construct() {
	}
}
