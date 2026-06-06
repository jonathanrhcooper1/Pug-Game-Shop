<?php
/**
 * WooCommerce serialized cart item metadata validator.
 *
 * @package TCGStorePlatform
 */

namespace TCGStorePlatform\WooCommerce;

use DateTimeImmutable;
use Exception;

final class SerializedCartItemValidator {
	/**
	 * @param array<string, mixed> $cart_item WooCommerce cart item data.
	 * @return list<string>
	 */
	public function validate( array $cart_item, ?DateTimeImmutable $now = null ): array {
		$now    = $now ?? new DateTimeImmutable( 'now' );
		$errors = array();

		if ( 1 !== (int) ( $cart_item['quantity'] ?? 1 ) ) {
			$errors[] = 'serialized_quantity_must_be_one';
		}

		if ( ! $this->positive_int( $cart_item['inventory_id'] ?? null ) ) {
			$errors[] = 'inventory_id_required';
		}

		if ( ! $this->positive_int( $cart_item['reservation_id'] ?? null ) ) {
			$errors[] = 'reservation_id_required';
		}

		if ( '' === trim( (string) ( $cart_item['owner_token_hash'] ?? '' ) ) ) {
			$errors[] = 'owner_token_required';
		}

		if (
			! isset( $cart_item['price_snapshot_minor_units'] )
			|| ! is_int( $cart_item['price_snapshot_minor_units'] )
			|| $cart_item['price_snapshot_minor_units'] < 0
		) {
			$errors[] = 'price_snapshot_required';
		}

		if ( ! $this->valid_currency( $cart_item['currency'] ?? '' ) ) {
			$errors[] = 'currency_required';
		}

		if ( ! $this->expires_in_future( $cart_item['reservation_expires_at'] ?? '', $now ) ) {
			$errors[] = 'reservation_expired';
		}

		return $errors;
	}

	private function positive_int( mixed $value ): bool {
		return is_int( $value ) && $value > 0;
	}

	private function valid_currency( mixed $value ): bool {
		$value = strtoupper( trim( (string) $value ) );

		return 1 === preg_match( '/^[A-Z]{3}$/', $value );
	}

	private function expires_in_future( mixed $value, DateTimeImmutable $now ): bool {
		$value = trim( (string) $value );

		if ( '' === $value ) {
			return false;
		}

		try {
			$expires_at = new DateTimeImmutable( $value );
		} catch ( Exception ) {
			return false;
		}

		return $expires_at > $now;
	}
}
