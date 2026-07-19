<?php
/**
 * Plans WooCommerce order-line metadata for serialized inventory checkout.
 *
 * @package TCGStorePlatform
 */

namespace TCGStorePlatform\WooCommerce;

use DateTimeImmutable;
use DateTimeZone;
use Exception;

final class SerializedOrderLineMetadataPlanner {
	private SerializedCartItemValidator $validator;

	public function __construct( ?SerializedCartItemValidator $validator = null ) {
		$this->validator = $validator ?? new SerializedCartItemValidator();
	}

	/**
	 * @param array<string, mixed> $cart_item WooCommerce cart item data.
	 */
	public function plan(
		array $cart_item,
		?DateTimeImmutable $now = null
	): SerializedOrderLineMetadataPlan {
		$errors = $this->validator->validate( $cart_item, $now );

		if ( array() !== $errors ) {
			return SerializedOrderLineMetadataPlan::invalid( $errors );
		}

		$metadata = array(
			'_tcg_serialized_inventory' => '1',
			'_tcg_inventory_id'         => (int) $cart_item['inventory_id'],
			'_tcg_reservation_id'       => (int) $cart_item['reservation_id'],
			'_tcg_owner_token_hash'     => $this->clean_string( $cart_item['owner_token_hash'] ),
			'_tcg_price_minor_units'    => (int) $cart_item['price_snapshot_minor_units'],
			'_tcg_price_snapshot'       => $this->format_minor_units( (int) $cart_item['price_snapshot_minor_units'] ),
			'_tcg_currency'             => strtoupper( $this->clean_string( $cart_item['currency'] ) ),
			'_tcg_reservation_expires'  => $this->normalized_datetime( $cart_item['reservation_expires_at'] ),
		);

		foreach ( $this->optional_string_keys() as $cart_key => $meta_key ) {
			$value = $this->nullable_string( $cart_item[ $cart_key ] ?? null );

			if ( null !== $value ) {
				$metadata[ $meta_key ] = $value;
			}
		}

		foreach ( $this->optional_int_keys() as $cart_key => $meta_key ) {
			$value = $this->positive_int( $cart_item[ $cart_key ] ?? null );

			if ( null !== $value ) {
				$metadata[ $meta_key ] = $value;
			}
		}

		$metadata['_tcg_snapshot_hash'] = $this->snapshot_hash( $metadata );

		return SerializedOrderLineMetadataPlan::ready( $metadata );
	}

	/**
	 * @return array<string, string>
	 */
	private function optional_string_keys(): array {
		return array(
			'cart_id'          => '_tcg_cart_id',
			'cart_item_key'    => '_tcg_cart_item_key',
			'barcode'          => '_tcg_barcode',
			'condition_code'   => '_tcg_condition_code',
			'provider'         => '_tcg_provider',
			'provider_card_id' => '_tcg_provider_card_id',
			'card_name'        => '_tcg_card_name',
			'set_name'         => '_tcg_set_name',
			'card_number'      => '_tcg_card_number',
		);
	}

	/**
	 * @return array<string, string>
	 */
	private function optional_int_keys(): array {
		return array(
			'product_id'   => '_tcg_product_id',
			'variation_id' => '_tcg_variation_id',
		);
	}

	private function normalized_datetime( mixed $value ): string {
		try {
			$date = new DateTimeImmutable( $this->clean_string( $value ) );

			return $date->setTimezone( new DateTimeZone( 'UTC' ) )->format( 'Y-m-d H:i:s' );
		} catch ( Exception ) {
			return $this->clean_string( $value );
		}
	}

	private function format_minor_units( int $minor_units ): string {
		$major = intdiv( $minor_units, 100 );
		$minor = $minor_units % 100;

		return sprintf( '%d.%02d00', $major, $minor );
	}

	private function clean_string( mixed $value ): string {
		return trim( (string) $value );
	}

	private function nullable_string( mixed $value ): ?string {
		$value = preg_replace( '/\s+/', ' ', $this->clean_string( $value ?? '' ) );
		$value = null === $value ? '' : $value;

		return '' === $value ? null : $value;
	}

	private function positive_int( mixed $value ): ?int {
		if ( is_int( $value ) && $value > 0 ) {
			return $value;
		}

		if ( is_string( $value ) && 1 === preg_match( '/^\d+$/', $value ) && (int) $value > 0 ) {
			return (int) $value;
		}

		return null;
	}

	/**
	 * @param array<string, int|string> $metadata Order-line metadata without the hash.
	 */
	private function snapshot_hash( array $metadata ): string {
		ksort( $metadata );

		if ( function_exists( 'wp_json_encode' ) ) {
			return hash( 'sha256', (string) wp_json_encode( $metadata ) );
		}

		return hash( 'sha256', (string) json_encode( $metadata ) );
	}
}
