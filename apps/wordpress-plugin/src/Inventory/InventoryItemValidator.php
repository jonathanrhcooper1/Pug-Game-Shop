<?php
/**
 * Dependency-free inventory business validation.
 *
 * @package TCGStorePlatform
 */

namespace TCGStorePlatform\Inventory;

final class InventoryItemValidator {
	/**
	 * Validate an inventory intake/update payload.
	 *
	 * @param array<string, mixed> $item Item fields.
	 * @return list<string> Stable error codes.
	 */
	public function validate( array $item ): array {
		$errors = array();
		$status = (string) ( $item['status'] ?? InventoryStatus::PENDING_INTAKE );

		if ( ! InventoryStatus::is_valid( $status ) ) {
			$errors[] = 'invalid_status';
		}

		if ( ! array_key_exists( 'minimum_sale_price_minor_units', $item ) || ! is_int( $item['minimum_sale_price_minor_units'] ) ) {
			$errors[] = 'minimum_price_required';
		} elseif ( $item['minimum_sale_price_minor_units'] < 0 ) {
			$errors[] = 'minimum_price_negative';
		}

		if ( array_key_exists( 'sale_price_minor_units', $item ) && ( ! is_int( $item['sale_price_minor_units'] ) || $item['sale_price_minor_units'] < 0 ) ) {
			$errors[] = 'sale_price_negative';
		}

		if ( InventoryStatus::requires_location( $status ) ) {
			if ( empty( $item['location_id'] ) ) {
				$errors[] = 'location_required_for_active_item';
			}

			if ( empty( $item['barcode'] ) ) {
				$errors[] = 'barcode_required_for_active_item';
			}
		}

		if ( $this->is_listed_status( $status ) && ! $this->has_reference_identity( $item ) ) {
			$errors[] = 'reference_required_for_listed_item';
		}

		$raw_or_graded = (string) ( $item['raw_or_graded'] ?? '' );

		if ( 'raw' === $raw_or_graded ) {
			if ( empty( $item['condition_code'] ) ) {
				$errors[] = 'condition_required_for_raw_item';
			}
		} elseif ( 'graded' === $raw_or_graded ) {
			if ( empty( $item['grading_company'] ) ) {
				$errors[] = 'grading_company_required_for_graded_item';
			}

			if ( empty( $item['grade'] ) ) {
				$errors[] = 'grade_required_for_graded_item';
			}
		} else {
			$errors[] = 'raw_or_graded_required';
		}

		return $errors;
	}

	private function is_listed_status( string $status ): bool {
		return in_array( $status, array( InventoryStatus::AVAILABLE, InventoryStatus::RESERVED, InventoryStatus::SOLD ), true );
	}

	/**
	 * @param array<string, mixed> $item Item fields.
	 */
	private function has_reference_identity( array $item ): bool {
		if ( ! empty( $item['reference_card_id'] ) || ! empty( $item['reference_variant_id'] ) ) {
			return true;
		}

		return ! empty( $item['manual_reference_payload_json'] );
	}
}
