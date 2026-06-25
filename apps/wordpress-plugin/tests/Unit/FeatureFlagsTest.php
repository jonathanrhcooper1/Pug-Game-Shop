<?php
/**
 * Feature flag tests.
 *
 * @package TCGStorePlatform
 */

namespace TCGStorePlatform\Tests\Unit;

use TCGStorePlatform\FeatureFlags\FeatureFlagRegistry;
use TCGStorePlatform\FeatureFlags\FeatureFlags;
use TCGStorePlatform\Tests\TestCase;

final class FeatureFlagsTest extends TestCase {
	public function test_only_production_hardened_modules_are_available_in_production(): void {
		foreach ( array_keys( FeatureFlagRegistry::definitions() ) as $flag ) {
			if ( in_array( $flag, array( 'core', 'inventory_pricing', 'scrydex_sync' ), true ) ) {
				$this->assert_true( FeatureFlags::is_available( $flag, 'production' ) );
				continue;
			}

			$this->assert_false( FeatureFlags::is_available( $flag, 'production' ), $flag . ' must remain unavailable.' );
		}
	}

	public function test_inventory_and_scrydex_are_available_in_production_for_cache_first_launch(): void {
		foreach ( array( 'inventory_pricing', 'scrydex_sync' ) as $flag ) {
			$this->assert_true( FeatureFlags::is_available( $flag, 'local' ) );
			$this->assert_true( FeatureFlags::is_available( $flag, 'development' ) );
			$this->assert_true( FeatureFlags::is_available( $flag, 'staging' ) );
			$this->assert_true( FeatureFlags::is_available( $flag, 'production' ) );
		}
	}

	public function test_offline_sync_stays_outside_production_until_conflict_path_is_hardened(): void {
		$this->assert_true( FeatureFlags::is_available( 'offline_sync', 'local' ) );
		$this->assert_true( FeatureFlags::is_available( 'offline_sync', 'development' ) );
		$this->assert_true( FeatureFlags::is_available( 'offline_sync', 'staging' ) );
		$this->assert_false( FeatureFlags::is_available( 'offline_sync', 'production' ) );
	}

	public function test_sanitizer_forces_unavailable_modules_off_in_production(): void {
		$requested = array_fill_keys( array_keys( FeatureFlagRegistry::definitions() ), true );
		$result    = FeatureFlags::sanitize( $requested, 'production' );

		$this->assert_true( $result['core'] );
		$this->assert_true( $result['inventory_pricing'] );
		$this->assert_true( $result['scrydex_sync'] );
		$this->assert_false( $result['offline_sync'] );
		$this->assert_false( $result['events'] );
	}

	public function test_sanitizer_allows_inventory_pricing_in_staging(): void {
		$requested = array_fill_keys( array_keys( FeatureFlagRegistry::definitions() ), true );
		$result    = FeatureFlags::sanitize( $requested, 'staging' );

		$this->assert_true( $result['core'] );
		$this->assert_true( $result['inventory_pricing'] );
		$this->assert_true( $result['scrydex_sync'] );
		$this->assert_true( $result['offline_sync'] );
		$this->assert_false( $result['events'] );
	}

	public function test_core_cannot_be_disabled(): void {
		$result = FeatureFlags::sanitize( array( 'core' => false ) );

		$this->assert_true( $result['core'] );
	}
}
