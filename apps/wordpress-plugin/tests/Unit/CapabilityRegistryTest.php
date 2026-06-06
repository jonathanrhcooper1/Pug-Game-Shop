<?php
/**
 * Capability registry tests.
 *
 * @package TCGStorePlatform
 */

namespace TCGStorePlatform\Tests\Unit;

use TCGStorePlatform\Auth\CapabilityRegistry;
use TCGStorePlatform\Tests\TestCase;

final class CapabilityRegistryTest extends TestCase {
	public function test_manager_contains_every_staff_capability(): void {
		$manager = CapabilityRegistry::manager();

		foreach ( CapabilityRegistry::staff() as $capability ) {
			$this->assert_true( in_array( $capability, $manager, true ) );
		}
	}

	public function test_sensitive_capabilities_are_not_granted_to_staff(): void {
		$staff = CapabilityRegistry::staff();

		$this->assert_false( in_array( 'override_minimum_price', $staff, true ) );
		$this->assert_false( in_array( 'adjust_credit', $staff, true ) );
		$this->assert_false( in_array( 'resolve_conflicts', $staff, true ) );
		$this->assert_false( in_array( 'manage_settings', $staff, true ) );
	}
}
