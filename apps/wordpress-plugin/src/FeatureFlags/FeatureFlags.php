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

		if ( ! isset( $definitions[ $flag ] ) || ! $definitions[ $flag ]['available'] ) {
			return false;
		}

		$values = get_option( self::OPTION_NAME, self::defaults() );

		return ! empty( $values[ $flag ] );
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
	public static function sanitize( mixed $value ): array {
		$value     = is_array( $value ) ? $value : array();
		$sanitized = array();

		foreach ( FeatureFlagRegistry::definitions() as $flag => $definition ) {
			if ( 'core' === $flag ) {
				$sanitized[ $flag ] = true;
				continue;
			}

			$sanitized[ $flag ] = $definition['available'] && ! empty( $value[ $flag ] );
		}

		return $sanitized;
	}

	private function __construct() {
	}
}
