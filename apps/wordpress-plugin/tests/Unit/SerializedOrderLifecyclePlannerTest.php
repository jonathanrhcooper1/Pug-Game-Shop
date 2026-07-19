<?php
/**
 * WooCommerce serialized order lifecycle planner tests.
 *
 * @package TCGStorePlatform
 */

namespace TCGStorePlatform\Tests\Unit;

use TCGStorePlatform\Inventory\InventoryStatus;
use TCGStorePlatform\Reservations\ReservationStatus;
use TCGStorePlatform\Tests\TestCase;
use TCGStorePlatform\WooCommerce\SerializedOrderLifecyclePlanner;

final class SerializedOrderLifecyclePlannerTest extends TestCase {
	public function test_checkout_processed_links_active_reservation_to_order(): void {
		$plan = ( new SerializedOrderLifecyclePlanner() )->plan(
			SerializedOrderLifecyclePlanner::ACTION_CHECKOUT_PROCESSED,
			7001,
			array( $this->line_item() )
		);

		$transition = $plan->transitions()[0];

		$this->assert_true( $plan->has_work() );
		$this->assert_same( 1, $plan->transition_count() );
		$this->assert_same( 'link_order', $transition['operation'] );
		$this->assert_same( ReservationStatus::ACTIVE, $transition['target_reservation_status'] );
		$this->assert_same( InventoryStatus::RESERVED, $transition['target_inventory_status'] );
		$this->assert_same( 'checkout_processed', $transition['reason'] );
		$this->assert_contains( 'woo-checkout_processed-7001-', $transition['idempotency_key'] );
	}

	public function test_payment_complete_plans_sale_conversion(): void {
		$plan = ( new SerializedOrderLifecyclePlanner() )->plan(
			SerializedOrderLifecyclePlanner::ACTION_PAYMENT_COMPLETE,
			7001,
			array( $this->line_item() )
		);

		$transition = $plan->transitions()[0];

		$this->assert_same( 'convert_to_sale', $transition['operation'] );
		$this->assert_same( ReservationStatus::CONVERTED, $transition['target_reservation_status'] );
		$this->assert_same( InventoryStatus::SOLD, $transition['target_inventory_status'] );
		$this->assert_same( 55, $transition['reservation_id'] );
		$this->assert_same( 42, $transition['inventory_id'] );
		$this->assert_same( 1299, $transition['price_minor_units'] );
		$this->assert_same( 'USD', $transition['currency'] );
	}

	public function test_failed_and_cancelled_orders_plan_release_reasons(): void {
		$planner = new SerializedOrderLifecyclePlanner();

		$failed    = $planner->plan(
			SerializedOrderLifecyclePlanner::ACTION_ORDER_FAILED,
			7001,
			array( $this->line_item() )
		)->transitions()[0];

		$cancelled = $planner->plan(
			SerializedOrderLifecyclePlanner::ACTION_ORDER_CANCELLED,
			7001,
			array( $this->line_item() )
		)->transitions()[0];

		$this->assert_same( 'release_reservation', $failed['operation'] );
		$this->assert_same( 'payment_failed', $failed['reason'] );
		$this->assert_same( ReservationStatus::RELEASED, $failed['target_reservation_status'] );
		$this->assert_same( InventoryStatus::AVAILABLE, $failed['target_inventory_status'] );
		$this->assert_same( 'release_reservation', $cancelled['operation'] );
		$this->assert_same( 'order_cancelled', $cancelled['reason'] );
	}

	public function test_refunded_order_plans_return_review_without_releasing_to_available(): void {
		$transition = ( new SerializedOrderLifecyclePlanner() )->plan(
			SerializedOrderLifecyclePlanner::ACTION_ORDER_REFUNDED,
			7001,
			array( $this->line_item() )
		)->transitions()[0];

		$this->assert_same( 'mark_return_review', $transition['operation'] );
		$this->assert_same( ReservationStatus::CONVERTED, $transition['target_reservation_status'] );
		$this->assert_same( InventoryStatus::RETURN_REVIEW, $transition['target_inventory_status'] );
		$this->assert_same( 'order_refunded', $transition['reason'] );
	}

	public function test_non_serialized_lines_are_skipped_and_invalid_serialized_lines_error(): void {
		$invalid = $this->line_item(
			array(
				'_tcg_reservation_id' => null,
				'_tcg_snapshot_hash'  => 'bad',
			),
			array(
				'order_item_id' => null,
			)
		);

		$plan = ( new SerializedOrderLifecyclePlanner() )->plan(
			SerializedOrderLifecyclePlanner::ACTION_PAYMENT_COMPLETE,
			7001,
			array(
				array(
					'order_item_id' => 11,
					'metadata'      => array(),
				),
				$invalid,
			)
		);

		$this->assert_same( 0, $plan->transition_count() );
		$this->assert_same( 'not_serialized_inventory', $plan->skipped_line_items()[0]['reason'] );
		$this->assert_true( in_array( 'reservation_id_required', $plan->errors()[0]['errors'], true ) );
		$this->assert_true( in_array( 'snapshot_hash_required', $plan->errors()[0]['errors'], true ) );
		$this->assert_true( in_array( 'order_item_id_required', $plan->errors()[0]['errors'], true ) );
	}

	public function test_duplicate_reservation_lines_are_reported(): void {
		$plan = ( new SerializedOrderLifecyclePlanner() )->plan(
			SerializedOrderLifecyclePlanner::ACTION_PAYMENT_COMPLETE,
			7001,
			array(
				$this->line_item(),
				$this->line_item( array(), array( 'order_item_id' => 9002 ) ),
			)
		);

		$this->assert_same( 1, $plan->transition_count() );
		$this->assert_true( in_array( 'duplicate_reservation_line', $plan->errors()[0]['errors'], true ) );
	}

	public function test_invalid_action_and_order_id_are_reported_without_work(): void {
		$invalid_action = ( new SerializedOrderLifecyclePlanner() )->plan( 'bad_action', 7001, array() );
		$invalid_order  = ( new SerializedOrderLifecyclePlanner() )->plan(
			SerializedOrderLifecyclePlanner::ACTION_PAYMENT_COMPLETE,
			0,
			array( $this->line_item() )
		);

		$this->assert_false( $invalid_action->has_work() );
		$this->assert_true( in_array( 'invalid_action', $invalid_action->errors()[0]['errors'], true ) );
		$this->assert_false( $invalid_order->has_work() );
		$this->assert_true( in_array( 'invalid_order', $invalid_order->errors()[0]['errors'], true ) );
	}

	/**
	 * @param array<string, mixed> $metadata_overrides Metadata overrides.
	 * @param array<string, mixed> $line_overrides Line item overrides.
	 * @return array<string, mixed>
	 */
	private function line_item( array $metadata_overrides = array(), array $line_overrides = array() ): array {
		$line_item = array(
			'order_item_id' => 9001,
			'metadata'      => array_merge(
				array(
					'_tcg_serialized_inventory' => '1',
					'_tcg_inventory_id'         => 42,
					'_tcg_reservation_id'       => 55,
					'_tcg_owner_token_hash'     => str_repeat( 'a', 64 ),
					'_tcg_price_minor_units'    => 1299,
					'_tcg_currency'             => 'usd',
					'_tcg_reservation_expires'  => '2026-06-06 16:15:00',
					'_tcg_snapshot_hash'        => str_repeat( 'b', 64 ),
				),
				$metadata_overrides
			),
		);

		return array_merge( $line_item, $line_overrides );
	}
}
