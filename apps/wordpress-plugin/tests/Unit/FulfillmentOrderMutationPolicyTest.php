<?php
/**
 * Fulfillment order mutation policy tests.
 *
 * @package TCGStorePlatform
 */

namespace TCGStorePlatform\Tests\Unit;

use TCGStorePlatform\Api\V1\FulfillmentOrderMutationPolicy;
use TCGStorePlatform\Tests\TestCase;

final class FulfillmentOrderMutationPolicyTest extends TestCase {
	public function test_mutation_requires_paid_local_pickup_with_serialized_lines(): void {
		$this->assert_same(
			array( 'eligible' => false, 'code' => 'order_not_paid' ),
			FulfillmentOrderMutationPolicy::eligibility( false, true, 1 )
		);
		$this->assert_same(
			array( 'eligible' => false, 'code' => 'order_not_local_pickup' ),
			FulfillmentOrderMutationPolicy::eligibility( true, false, 1 )
		);
		$this->assert_same(
			array( 'eligible' => false, 'code' => 'order_has_no_serialized_lines' ),
			FulfillmentOrderMutationPolicy::eligibility( true, true, 0 )
		);
		$this->assert_true( FulfillmentOrderMutationPolicy::eligibility( true, true, 1 )['eligible'] );
	}

	public function test_missing_state_is_derived_from_woocommerce_status(): void {
		$this->assert_same( 'ready_for_pickup', FulfillmentOrderMutationPolicy::derive_status( '', 'ready-pickup' ) );
		$this->assert_same( 'ready_for_pickup', FulfillmentOrderMutationPolicy::derive_status( '', 'wc-ready-pickup' ) );
		$this->assert_same( 'completed', FulfillmentOrderMutationPolicy::derive_status( '', 'completed' ) );
		$this->assert_same( 'awaiting_pull', FulfillmentOrderMutationPolicy::derive_status( '', 'processing' ) );
		$this->assert_same( 'pulling', FulfillmentOrderMutationPolicy::derive_status( 'pulling', 'completed' ) );
	}

	public function test_transitions_are_forward_only_and_same_state_is_idempotent(): void {
		$forward = FulfillmentOrderMutationPolicy::transition( 'awaiting_pull', 'ready_for_pickup' );
		$replay  = FulfillmentOrderMutationPolicy::transition( 'ready_for_pickup', 'ready_for_pickup' );
		$reverse = FulfillmentOrderMutationPolicy::transition( 'completed', 'pulling' );

		$this->assert_true( $forward['accepted'] );
		$this->assert_false( $forward['idempotent'] );
		$this->assert_same( 'fulfillment_status_updated', $forward['code'] );
		$this->assert_true( $replay['accepted'] );
		$this->assert_true( $replay['idempotent'] );
		$this->assert_same( 'fulfillment_status_unchanged', $replay['code'] );
		$this->assert_false( $reverse['accepted'] );
		$this->assert_same( 'fulfillment_status_regression', $reverse['code'] );
	}
}
