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
	public function test_only_foundation_is_available_in_phase_one(): void {
		foreach ( FeatureFlagRegistry::definitions() as $flag => $definition ) {
			if ( 'core' === $flag ) {
				$this->assert_true( $definition['available'] );
				continue;
			}

			$this->assert_false( $definition['available'], $flag . ' must remain unavailable.' );
		}
	}

	public function test_sanitizer_forces_unfinished_modules_off(): void {
		$requested = array_fill_keys( array_keys( FeatureFlagRegistry::definitions() ), true );
		$result    = FeatureFlags::sanitize( $requested );

		$this->assert_true( $result['core'] );
		$this->assert_false( $result['inventory_pricing'] );
		$this->assert_false( $result['offline_sync'] );
		$this->assert_false( $result['events'] );
	}

	public function test_core_cannot_be_disabled(): void {
		$result = FeatureFlags::sanitize( array( 'core' => false ) );

		$this->assert_true( $result['core'] );
	}
}
