<?php
/**
 * Inventory intake REST/admin payload parser.
 *
 * @package TCGStorePlatform
 */

namespace TCGStorePlatform\Inventory;

final class InventoryIntakeParser {
	private const SOURCES = array( 'staff', 'offline', 'buylist', 'scrydex_import' );

	private const VISIBILITY = array( 'hidden', 'visible', 'staff_only' );

	public function __construct(
		private ?InventoryItemValidator $validator = null
	) {
	}

	/**
	 * @param array<string, mixed> $payload Request body.
	 */
	public function parse(
		array $payload,
		?string $idempotency_header = null,
		?int $actor_user_id = null
	): InventoryIntakeValidationResult {
		$errors             = array();
		$source             = strtolower( trim( (string) ( $payload['source'] ?? 'staff' ) ) );
		$idempotency_source = $idempotency_header;
		$currency           = strtoupper( trim( (string) ( $payload['sale_currency'] ?? ( $payload['currency'] ?? 'USD' ) ) ) );
		$status             = strtolower( trim( (string) ( $payload['status'] ?? InventoryStatus::PENDING_INTAKE ) ) );
		$raw_or_graded      = strtolower( trim( (string) ( $payload['raw_or_graded'] ?? '' ) ) );
		$game               = strtolower( trim( (string) ( $payload['game'] ?? '' ) ) );
		$card_name          = trim( (string) ( $payload['card_name'] ?? ( $payload['manual_card_name'] ?? '' ) ) );
		$minimum_price      = $this->optional_non_negative_int(
			$payload['minimum_sale_price_minor_units'] ?? null,
			'minimum_sale_price_minor_units',
			$errors
		);
		$sale_price         = $this->optional_non_negative_int(
			$payload['sale_price_minor_units'] ?? null,
			'sale_price_minor_units',
			$errors
		);

		if ( null === $idempotency_source || '' === trim( $idempotency_source ) ) {
			$idempotency_source = (string) ( $payload['idempotency_key'] ?? '' );
		}

		$idempotency_key = trim( (string) $idempotency_source );

		if ( ! in_array( $source, self::SOURCES, true ) ) {
			$errors[] = 'source_invalid';
		}

		if ( '' === $idempotency_key ) {
			$errors[] = 'idempotency_key_required';
		}

		if ( '' === $game ) {
			$errors[] = 'game_required';
		}

		if ( '' === $card_name ) {
			$errors[] = 'card_name_required';
		}

		if ( 1 !== preg_match( '/^[A-Z]{3}$/', $currency ) ) {
			$errors[] = 'currency_invalid';
		}

		if ( null !== $minimum_price && null !== $sale_price && $sale_price < $minimum_price ) {
			$errors[] = 'sale_price_below_minimum';
		}

		if ( $this->is_listed_status( $status ) && null === $sale_price ) {
			$errors[] = 'sale_price_required_for_listed_item';
		}

		$item_fields = array(
			'status'                         => $status,
			'source'                         => $source,
			'game'                           => $game,
			'card_name'                      => $card_name,
			'set_name'                       => trim( (string) ( $payload['set_name'] ?? '' ) ),
			'set_code'                       => strtoupper( trim( (string) ( $payload['set_code'] ?? '' ) ) ),
			'card_number'                    => trim( (string) ( $payload['card_number'] ?? '' ) ),
			'printed_number'                 => trim( (string) ( $payload['printed_number'] ?? '' ) ),
			'provider_name'                  => strtolower( trim( (string) ( $payload['provider_name'] ?? '' ) ) ),
			'provider_card_id'               => trim( (string) ( $payload['provider_card_id'] ?? '' ) ),
			'variant'                        => trim( (string) ( $payload['variant'] ?? '' ) ),
			'finish'                         => trim( (string) ( $payload['finish'] ?? '' ) ),
			'parallel_name'                  => trim( (string) ( $payload['parallel_name'] ?? '' ) ),
			'language'                       => trim( (string) ( $payload['language'] ?? '' ) ),
			'raw_or_graded'                  => $raw_or_graded,
			'condition_code'                 => strtoupper( trim( (string) ( $payload['condition_code'] ?? '' ) ) ),
			'grading_company'                => strtoupper( trim( (string) ( $payload['grading_company'] ?? '' ) ) ),
			'grade'                          => trim( (string) ( $payload['grade'] ?? '' ) ),
			'cert_number'                    => trim( (string) ( $payload['cert_number'] ?? '' ) ),
			'barcode'                        => strtoupper( trim( (string) ( $payload['barcode'] ?? '' ) ) ),
			'sku'                            => strtoupper( trim( (string) ( $payload['sku'] ?? '' ) ) ),
			'sale_currency'                  => $currency,
			'minimum_sale_price_minor_units' => $minimum_price,
			'sale_price_minor_units'         => $sale_price,
			'market_price_minor_units'       => $this->optional_non_negative_int(
				$payload['market_price_minor_units'] ?? null,
				'market_price_minor_units',
				$errors
			),
			'location_id'                    => $this->optional_positive_int( $payload['location_id'] ?? null, 'location_id', $errors ),
			'reference_card_id'              => $this->optional_positive_int( $payload['reference_card_id'] ?? null, 'reference_card_id', $errors ),
			'reference_variant_id'           => $this->optional_positive_int( $payload['reference_variant_id'] ?? null, 'reference_variant_id', $errors ),
			'woocommerce_product_id'         => $this->optional_positive_int( $payload['woocommerce_product_id'] ?? null, 'woocommerce_product_id', $errors ),
			'online_visibility'              => $this->visibility( $payload['online_visibility'] ?? 'hidden', 'online_visibility', $errors ),
			'kiosk_visibility'               => $this->visibility( $payload['kiosk_visibility'] ?? 'hidden', 'kiosk_visibility', $errors ),
			'pos_visibility'                 => $this->visibility( $payload['pos_visibility'] ?? 'visible', 'pos_visibility', $errors ),
			'price_lock'                     => $this->truthy( $payload['price_lock'] ?? false ),
			'front_image_remote_url'         => trim( (string) ( $payload['front_image_remote_url'] ?? '' ) ),
			'back_image_remote_url'          => trim( (string) ( $payload['back_image_remote_url'] ?? '' ) ),
		);

		if ( null === $item_fields['sale_price_minor_units'] ) {
			unset( $item_fields['sale_price_minor_units'] );
		}

		if ( null === $item_fields['market_price_minor_units'] ) {
			unset( $item_fields['market_price_minor_units'] );
		}

		if ( empty( $item_fields['reference_card_id'] ) && empty( $item_fields['reference_variant_id'] ) ) {
			$item_fields['manual_reference_payload_json'] = $this->manual_reference_payload_json( $item_fields );
		}

		$validation_errors = ( $this->validator ?? new InventoryItemValidator() )->validate( $item_fields );
		$errors            = array_merge( $errors, $validation_errors );

		if ( $errors ) {
			return InventoryIntakeValidationResult::rejected( array_values( array_unique( $errors ) ) );
		}

		return InventoryIntakeValidationResult::accepted(
			new InventoryIntakeRequest(
				$source,
				$idempotency_key,
				$currency,
				$actor_user_id,
				$item_fields,
				true,
				true
			)
		);
	}

	private function is_listed_status( string $status ): bool {
		return in_array( $status, array( InventoryStatus::AVAILABLE, InventoryStatus::RESERVED, InventoryStatus::SOLD ), true );
	}

	/**
	 * @param list<string> $errors Validation errors.
	 */
	private function optional_positive_int( mixed $value, string $field, array &$errors ): ?int {
		if ( null === $value || '' === $value ) {
			return null;
		}

		if ( is_int( $value ) && $value > 0 ) {
			return $value;
		}

		if ( is_string( $value ) && 1 === preg_match( '/^\d+$/', $value ) && (int) $value > 0 ) {
			return (int) $value;
		}

		$errors[] = $field . '_invalid';

		return null;
	}

	/**
	 * @param list<string> $errors Validation errors.
	 */
	private function optional_non_negative_int( mixed $value, string $field, array &$errors ): ?int {
		if ( null === $value || '' === $value ) {
			return null;
		}

		if ( is_int( $value ) && $value >= 0 ) {
			return $value;
		}

		if ( is_string( $value ) && 1 === preg_match( '/^\d+$/', $value ) ) {
			return (int) $value;
		}

		$errors[] = $field . '_invalid';

		return null;
	}

	/**
	 * @param list<string> $errors Validation errors.
	 */
	private function visibility( mixed $value, string $field, array &$errors ): string {
		$visibility = strtolower( trim( (string) $value ) );

		if ( in_array( $visibility, self::VISIBILITY, true ) ) {
			return $visibility;
		}

		$errors[] = $field . '_invalid';

		return 'hidden';
	}

	private function truthy( mixed $value ): bool {
		if ( is_bool( $value ) ) {
			return $value;
		}

		return in_array( strtolower( trim( (string) $value ) ), array( '1', 'true', 'yes', 'on' ), true );
	}

	/**
	 * @param array<string, mixed> $item_fields Normalized item fields.
	 */
	private function manual_reference_payload_json( array $item_fields ): string {
		return (string) json_encode(
			array(
				'game'           => $item_fields['game'],
				'card_name'      => $item_fields['card_name'],
				'set_name'       => $item_fields['set_name'],
				'set_code'       => $item_fields['set_code'],
				'card_number'    => $item_fields['card_number'],
				'printed_number' => $item_fields['printed_number'],
				'variant'        => $item_fields['variant'],
				'finish'         => $item_fields['finish'],
				'language'       => $item_fields['language'],
			)
		);
	}
}
