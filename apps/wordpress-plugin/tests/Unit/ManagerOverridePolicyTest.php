<?php
/**
 * Manager override policy tests.
 *
 * @package TCGStorePlatform
 */

namespace TCGStorePlatform\Tests\Unit;

use TCGStorePlatform\Overrides\ManagerOverridePolicy;
use TCGStorePlatform\Overrides\ManagerOverrideRequest;
use TCGStorePlatform\Tests\TestCase;

final class ManagerOverridePolicyTest extends TestCase {
	public function test_sale_at_or_above_minimum_does_not_require_override_row(): void {
		$decision = ( new ManagerOverridePolicy() )->authorize_below_minimum_sale(
			new ManagerOverrideRequest( 10, 0, 1500, 1200, 1200, 'USD', '' )
		);

		$this->assert_true( $decision->is_accepted() );
		$this->assert_same( 'override_not_required', $decision->code() );
		$this->assert_false( $decision->requires_override_row() );
	}

	public function test_below_minimum_sale_requires_manager_approval(): void {
		$decision = ( new ManagerOverridePolicy() )->authorize_below_minimum_sale(
			new ManagerOverrideRequest( 10, 0, 1500, 900, 1200, 'USD', 'Customer recovery.' )
		);

		$this->assert_false( $decision->is_accepted() );
		$this->assert_same( 'missing_manager_approval', $decision->code() );
	}

	public function test_manager_must_be_distinct_from_employee(): void {
		$decision = ( new ManagerOverridePolicy() )->authorize_below_minimum_sale(
			new ManagerOverrideRequest( 10, 10, 1500, 900, 1200, 'USD', 'Damaged case.' )
		);

		$this->assert_false( $decision->is_accepted() );
		$this->assert_same( 'manager_must_be_distinct', $decision->code() );
	}

	public function test_below_minimum_sale_requires_reason(): void {
		$decision = ( new ManagerOverridePolicy() )->authorize_below_minimum_sale(
			new ManagerOverrideRequest( 10, 22, 1500, 900, 1200, 'USD', '' )
		);

		$this->assert_false( $decision->is_accepted() );
		$this->assert_same( 'missing_reason', $decision->code() );
	}

	public function test_manager_can_approve_below_minimum_sale_with_reason(): void {
		$decision = ( new ManagerOverridePolicy() )->authorize_below_minimum_sale(
			new ManagerOverrideRequest(
				10,
				22,
				1500,
				900,
				1200,
				'USD',
				'Customer recovery.',
				true,
				'2026-06-07 14:00:00'
			)
		);

		$this->assert_true( $decision->is_accepted() );
		$this->assert_same( 'manager_override_approved', $decision->code() );
		$this->assert_true( $decision->requires_override_row() );
	}

	public function test_below_minimum_sale_requires_manager_reauthentication(): void {
		$decision = ( new ManagerOverridePolicy() )->authorize_below_minimum_sale(
			new ManagerOverrideRequest( 10, 22, 1500, 900, 1200, 'USD', 'Customer recovery.' )
		);

		$this->assert_false( $decision->is_accepted() );
		$this->assert_same( 'manager_reauthentication_required', $decision->code() );
	}

	public function test_manager_reauthentication_requires_timestamp(): void {
		$decision = ( new ManagerOverridePolicy() )->authorize_below_minimum_sale(
			new ManagerOverrideRequest( 10, 22, 1500, 900, 1200, 'USD', 'Customer recovery.', true )
		);

		$this->assert_false( $decision->is_accepted() );
		$this->assert_same( 'manager_reauthentication_timestamp_required', $decision->code() );
	}

	public function test_invalid_amounts_are_rejected(): void {
		$decision = ( new ManagerOverridePolicy() )->authorize_below_minimum_sale(
			new ManagerOverrideRequest( 10, 22, 1500, -1, 1200, 'USD', 'Customer recovery.' )
		);

		$this->assert_false( $decision->is_accepted() );
		$this->assert_same( 'invalid_amount', $decision->code() );
	}
}
