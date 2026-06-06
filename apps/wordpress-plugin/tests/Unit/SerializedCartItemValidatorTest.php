<?php
/**
 * WooCommerce serialized cart item validator tests.
 *
 * @package TCGStorePlatform
 */

namespace TCGStorePlatform\Tests\Unit;

use DateTimeImmutable;
use TCGStorePlatform\Tests\TestCase;
use TCGStorePlatform\WooCommerce\SerializedCartItemValidator;

final class SerializedCartItemValidatorTest extends TestCase {
	public function test_valid_serialized_cart_item_passes(): void {
		$errors = ( new SerializedCartItemValidator() )->validate(
			$this->cart_item(),
			new DateTimeImmutable( '2026-06-06 12:00:00' )
		);

		$this->assert_same( array(), $errors );
	}

	public function test_missing_exact_item_metadata_is_reported(): void {
		$errors = ( new SerializedCartItemValidator() )->validate(
			array(
				'quantity' => 1,
			),
			new DateTimeImmutable( '2026-06-06 12:00:00' )
		);

		$this->assert_true( in_array( 'inventory_id_required', $errors, true ) );
		$this->assert_true( in_array( 'reservation_id_required', $errors, true ) );
		$this->assert_true( in_array( 'owner_token_required', $errors, true ) );
	}

	public function test_serialized_cart_item_quantity_must_be_one(): void {
		$item             = $this->cart_item();
		$item['quantity'] = 2;
		$errors           = ( new SerializedCartItemValidator() )->validate(
			$item,
			new DateTimeImmutable( '2026-06-06 12:00:00' )
		);

		$this->assert_true( in_array( 'serialized_quantity_must_be_one', $errors, true ) );
	}

	public function test_expired_reservation_is_reported(): void {
		$item                              = $this->cart_item();
		$item['reservation_expires_at']    = '2026-06-06 11:59:59';
		$errors                            = ( new SerializedCartItemValidator() )->validate(
			$item,
			new DateTimeImmutable( '2026-06-06 12:00:00' )
		);

		$this->assert_true( in_array( 'reservation_expired', $errors, true ) );
	}

	public function test_invalid_price_snapshot_and_currency_are_reported(): void {
		$item                               = $this->cart_item();
		$item['price_snapshot_minor_units'] = -1;
		$item['currency']                   = 'US';
		$errors                             = ( new SerializedCartItemValidator() )->validate(
			$item,
			new DateTimeImmutable( '2026-06-06 12:00:00' )
		);

		$this->assert_true( in_array( 'price_snapshot_required', $errors, true ) );
		$this->assert_true( in_array( 'currency_required', $errors, true ) );
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
			'currency'                   => 'USD',
			'reservation_expires_at'     => '2026-06-06 12:15:00',
		);
	}
}
