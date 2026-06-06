<?php
/**
 * Manager override persistence planner tests.
 *
 * @package TCGStorePlatform
 */

namespace TCGStorePlatform\Tests\Unit;

use TCGStorePlatform\Overrides\ManagerOverridePersistencePlanner;
use TCGStorePlatform\Overrides\ManagerOverridePolicy;
use TCGStorePlatform\Overrides\ManagerOverrideRequest;
use TCGStorePlatform\Tests\TestCase;

final class ManagerOverridePersistencePlannerTest extends TestCase {
	public function test_planner_builds_row_and_audit_payload_for_approved_override(): void {
		$request  = new ManagerOverrideRequest( 10, 22, 1500, 900, 1200, 'usd', 'Customer recovery.' );
		$decision = ( new ManagerOverridePolicy() )->authorize_below_minimum_sale( $request );
		$plan     = ( new ManagerOverridePersistencePlanner() )->plan(
			$request,
			$decision,
			array(
				'public_id'    => 'override-public-id',
				'inventory_id' => '42',
				'cart_id'      => 'cart-abc',
				'order_id'     => 100,
				'location_id'  => '7',
				'expires_at'   => '2026-06-06 13:30:00',
				'created_at'   => '2026-06-06 13:00:00',
			)
		);

		$this->assert_true( $plan->should_persist() );
		$this->assert_same( 'below_minimum_sale', $plan->row_data()['override_type'] );
		$this->assert_same( 42, $plan->row_data()['inventory_id'] );
		$this->assert_same( '15.0000', $plan->row_data()['original_price'] );
		$this->assert_same( '9.0000', $plan->row_data()['override_price'] );
		$this->assert_same( 'USD', $plan->row_data()['currency'] );
		$this->assert_same( 'manager_override.approved', $plan->audit_data()['action'] );
		$this->assert_same( '12.0000', $plan->audit_data()['minimum_sale_price'] );
		$this->assert_same( hash( 'sha256', 'Customer recovery.' ), $plan->audit_data()['reason_hash'] );
	}

	public function test_planner_skips_when_policy_rejects_override(): void {
		$request  = new ManagerOverrideRequest( 10, 0, 1500, 900, 1200, 'USD', 'Customer recovery.' );
		$decision = ( new ManagerOverridePolicy() )->authorize_below_minimum_sale( $request );
		$plan     = ( new ManagerOverridePersistencePlanner() )->plan( $request, $decision );

		$this->assert_false( $plan->should_persist() );
		$this->assert_same( 'override_rejected', $plan->code() );
		$this->assert_same( array(), $plan->row_data() );
	}

	public function test_planner_skips_when_sale_price_meets_minimum(): void {
		$request  = new ManagerOverrideRequest( 10, 0, 1500, 1300, 1200, 'USD', '' );
		$decision = ( new ManagerOverridePolicy() )->authorize_below_minimum_sale( $request );
		$plan     = ( new ManagerOverridePersistencePlanner() )->plan( $request, $decision );

		$this->assert_false( $plan->should_persist() );
		$this->assert_same( 'override_row_not_required', $plan->code() );
	}

	public function test_invalid_optional_context_ids_are_omitted(): void {
		$request  = new ManagerOverrideRequest( 10, 22, 1500, 900, 1200, 'USD', 'Customer recovery.' );
		$decision = ( new ManagerOverridePolicy() )->authorize_below_minimum_sale( $request );
		$plan     = ( new ManagerOverridePersistencePlanner() )->plan(
			$request,
			$decision,
			array(
				'inventory_id' => 0,
				'order_id'     => 'abc',
				'location_id'  => -1,
			)
		);

		$this->assert_true( $plan->should_persist() );
		$this->assert_same( null, $plan->row_data()['inventory_id'] );
		$this->assert_same( null, $plan->row_data()['order_id'] );
		$this->assert_same( null, $plan->row_data()['location_id'] );
	}
}
