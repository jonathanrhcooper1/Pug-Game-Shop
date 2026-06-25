<?php
/**
 * WooCommerce serialized order-line metadata planner tests.
 *
 * @package TCGStorePlatform
 */

namespace TCGStorePlatform\Tests\Unit;

use DateTimeImmutable;
use TCGStorePlatform\Tests\TestCase;
use TCGStorePlatform\WooCommerce\SerializedOrderLineMetadataPlanner;

final class SerializedOrderLineMetadataPlannerTest extends TestCase {
	public function test_valid_cart_item_produces_order_line_metadata(): void {
		$plan = ( new SerializedOrderLineMetadataPlanner() )->plan(
			$this->cart_item(),
			new DateTimeImmutable( '2026-06-06 12:00:00' )
		);

		$metadata = $plan->metadata();

		$this->assert_true( $plan->is_ready() );
		$this->assert_false( $plan->has_errors() );
		$this->assert_same( array(), $plan->errors() );
		$this->assert_same( '1', $metadata['_tcg_serialized_inventory'] );
		$this->assert_same( 42, $metadata['_tcg_inventory_id'] );
		$this->assert_same( 55, $metadata['_tcg_reservation_id'] );
		$this->assert_same( str_repeat( 'a', 64 ), $metadata['_tcg_owner_token_hash'] );
		$this->assert_same( 1299, $metadata['_tcg_price_minor_units'] );
		$this->assert_same( '12.9900', $metadata['_tcg_price_snapshot'] );
		$this->assert_same( 'USD', $metadata['_tcg_currency'] );
		$this->assert_same( '2026-06-06 16:15:00', $metadata['_tcg_reservation_expires'] );
		$this->assert_true( isset( $metadata['_tcg_snapshot_hash'] ) );
		$this->assert_same( 64, strlen( (string) $metadata['_tcg_snapshot_hash'] ) );
	}

	public function test_invalid_cart_item_returns_validator_errors_without_metadata(): void {
		$item                           = $this->cart_item();
		$item['quantity']               = 2;
		$item['reservation_expires_at'] = '2026-06-06 11:59:59';
		unset( $item['reservation_id'] );

		$plan = ( new SerializedOrderLineMetadataPlanner() )->plan(
			$item,
			new DateTimeImmutable( '2026-06-06 12:00:00' )
		);

		$this->assert_false( $plan->is_ready() );
		$this->assert_true( $plan->has_errors() );
		$this->assert_same( array(), $plan->metadata() );
		$this->assert_true( in_array( 'serialized_quantity_must_be_one', $plan->errors(), true ) );
		$this->assert_true( in_array( 'reservation_id_required', $plan->errors(), true ) );
		$this->assert_true( in_array( 'reservation_expired', $plan->errors(), true ) );
	}

	public function test_optional_card_snapshot_fields_are_cleaned_and_copied(): void {
		$item                     = $this->cart_item();
		$item['cart_id']          = ' kiosk-cart-1 ';
		$item['cart_item_key']    = ' line-abc ';
		$item['barcode']          = ' GM-000042 ';
		$item['condition_code']   = ' nm ';
		$item['provider']         = ' scrydex ';
		$item['provider_card_id'] = ' scry-123 ';
		$item['card_name']        = '  Lightning   Bolt  ';
		$item['set_name']         = '  Limited Edition Alpha ';
		$item['card_number']      = ' 161 ';
		$item['product_id']       = '1001';
		$item['variation_id']     = 0;

		$metadata = ( new SerializedOrderLineMetadataPlanner() )->plan(
			$item,
			new DateTimeImmutable( '2026-06-06 12:00:00' )
		)->metadata();

		$this->assert_same( 'kiosk-cart-1', $metadata['_tcg_cart_id'] );
		$this->assert_same( 'line-abc', $metadata['_tcg_cart_item_key'] );
		$this->assert_same( 'GM-000042', $metadata['_tcg_barcode'] );
		$this->assert_same( 'nm', $metadata['_tcg_condition_code'] );
		$this->assert_same( 'scrydex', $metadata['_tcg_provider'] );
		$this->assert_same( 'scry-123', $metadata['_tcg_provider_card_id'] );
		$this->assert_same( 'Lightning Bolt', $metadata['_tcg_card_name'] );
		$this->assert_same( 'Limited Edition Alpha', $metadata['_tcg_set_name'] );
		$this->assert_same( '161', $metadata['_tcg_card_number'] );
		$this->assert_same( 1001, $metadata['_tcg_product_id'] );
		$this->assert_false( isset( $metadata['_tcg_variation_id'] ) );
	}

	public function test_snapshot_hash_is_deterministic_for_same_cart_item(): void {
		$planner = new SerializedOrderLineMetadataPlanner();
		$now     = new DateTimeImmutable( '2026-06-06 12:00:00' );

		$first  = $planner->plan( $this->cart_item(), $now )->metadata();
		$second = $planner->plan( $this->cart_item(), $now )->metadata();

		$this->assert_same( $first['_tcg_snapshot_hash'], $second['_tcg_snapshot_hash'] );
	}

	public function test_zero_price_snapshot_formats_for_promotional_items(): void {
		$item                               = $this->cart_item();
		$item['price_snapshot_minor_units'] = 0;

		$metadata = ( new SerializedOrderLineMetadataPlanner() )->plan(
			$item,
			new DateTimeImmutable( '2026-06-06 12:00:00' )
		)->metadata();

		$this->assert_same( 0, $metadata['_tcg_price_minor_units'] );
		$this->assert_same( '0.0000', $metadata['_tcg_price_snapshot'] );
	}

	/**
	 * @return array<string, mixed>
	 */
	private function cart_item(): array {
		return array(
			'quantity'                   => 1,
			'inventory_id'               => 42,
			'reservation_id'             => 55,
			'owner_token_hash'           => str_repeat( 'a', 64 ),
			'price_snapshot_minor_units' => 1299,
			'currency'                   => 'usd',
			'reservation_expires_at'     => '2026-06-06 12:15:00 -0400',
		);
	}
}
