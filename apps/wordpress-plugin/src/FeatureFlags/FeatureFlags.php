<?php
/**
 * Feature flag storage and evaluation.
 *
 * @package TCGStorePlatform
 */

namespace TCGStorePlatform\FeatureFlags;

final class FeatureFlags {
	public const OPTION_NAME = 'tcg_store_platform_feature_flags';

	public static function install_defaults(): void {
		add_option( self::OPTION_NAME, self::defaults(), '', false );
	}

	/**
	 * @return array<string, bool>
	 */
	public static function defaults(): array {
		$defaults = array();

		foreach ( FeatureFlagRegistry::definitions() as $flag => $definition ) {
			$defaults[ $flag ] = $definition['default'];
		}

		return $defaults;
	}

	public static function is_enabled( string $flag ): bool {
		$definitions = FeatureFlagRegistry::definitions();

		if ( ! isset( $definitions[ $flag ] ) || ! self::is_available( $flag ) ) {
			return false;
		}

		$values = get_option( self::OPTION_NAME, self::defaults() );

		return ! empty( $values[ $flag ] );
	}

	public static function is_available( string $flag, ?string $environment_type = null ): bool {
		$definitions = FeatureFlagRegistry::definitions();

		if ( ! isset( $definitions[ $flag ] ) || true !== $definitions[ $flag ]['available'] ) {
			return false;
		}

		$allowed_environments = $definitions[ $flag ]['available_environments'] ?? array(
			'local',
			'development',
			'staging',
			'production',
		);

		return in_array(
			self::environment_type( $environment_type ),
			$allowed_environments,
			true
		);
	}

	/**
	 * @return list<string>
	 */
	public static function enabled_flags(): array {
		$enabled = array();

		foreach ( array_keys( FeatureFlagRegistry::definitions() ) as $flag ) {
			if ( self::is_enabled( $flag ) ) {
				$enabled[] = $flag;
			}
		}

		return $enabled;
	}

	/**
	 * Prevent unfinished modules from being enabled through option mutation.
	 *
	 * @param mixed $value Submitted value.
	 * @return array<string, bool>
	 */
	public static function sanitize( mixed $value, ?string $environment_type = null ): array {
		$value     = is_array( $value ) ? $value : array();
		$sanitized = array();

		foreach ( FeatureFlagRegistry::definitions() as $flag => $definition ) {
			if ( 'core' === $flag ) {
				$sanitized[ $flag ] = true;
				continue;
			}

			$sanitized[ $flag ] = self::is_available( $flag, $environment_type )
				&& ! empty( $value[ $flag ] );
		}

		return $sanitized;
	}

	private static function environment_type( ?string $environment_type = null ): string {
		$environment_type = null !== $environment_type ? $environment_type : self::current_environment_type();
		$environment_type = strtolower( trim( $environment_type ) );
		$allowed          = array( 'local', 'development', 'staging', 'production' );

		return in_array( $environment_type, $allowed, true ) ? $environment_type : 'production';
	}

	private static function current_environment_type(): string {
		if ( function_exists( 'wp_get_environment_type' ) ) {
			return (string) wp_get_environment_type();
		}

		$environment_type = getenv( 'WP_ENVIRONMENT_TYPE' );

		return is_string( $environment_type ) && '' !== trim( $environment_type )
			? $environment_type
			: 'production';
	}

	private function __construct() {
	}
}
