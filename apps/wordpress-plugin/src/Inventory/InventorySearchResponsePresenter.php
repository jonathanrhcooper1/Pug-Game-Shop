<?php
/**
 * Inventory search response presentation and public-field redaction.
 *
 * @package TCGStorePlatform
 */

namespace TCGStorePlatform\Inventory;

final class InventorySearchResponsePresenter {
	/**
	 * @param list<array<string, mixed>> $rows  Inventory rows.
	 * @return array<string, mixed>
	 */
	public static function present( InventorySearchRequest $request, array $rows, int $total ): array {
		$is_public = 'public' === $request->visibility();
		$items     = array();

		foreach ( $rows as $row ) {
			$items[] = self::present_row( $row, $is_public );
		}

		return array(
			'items' => $items,
			'meta'  => array(
				'page'             => $request->page(),
				'page_size'        => $request->page_size(),
				'total'            => max( 0, $total ),
				'has_more'         => $request->page() * $request->page_size() < max( 0, $total ),
				'visibility'       => $request->visibility(),
				'public_redaction' => $is_public,
			),
		);
	}

	/**
	 * @param array<string, mixed> $row Inventory row.
	 * @return array<string, mixed>
	 */
	private static function present_row( array $row, bool $is_public ): array {
		$presented = array(
			'public_id'        => (string) ( $row['public_id'] ?? '' ),
			'game'             => (string) ( $row['game'] ?? '' ),
			'card_name'        => (string) ( $row['card_name'] ?? '' ),
			'set_name'         => self::nullable_string( $row['set_name'] ?? null ),
			'set_code'         => self::nullable_string( $row['set_code'] ?? null ),
			'card_number'      => self::nullable_string( $row['card_number'] ?? null ),
			'printed_number'   => self::nullable_string( $row['printed_number'] ?? null ),
			'year'             => self::nullable_int( $row['year'] ?? null ),
			'rarity'           => self::nullable_string( $row['rarity'] ?? null ),
			'variant'          => self::nullable_string( $row['variant'] ?? null ),
			'finish'           => self::nullable_string( $row['finish'] ?? null ),
			'parallel_name'    => self::nullable_string( $row['parallel_name'] ?? null ),
			'language'         => self::nullable_string( $row['language'] ?? null ),
			'raw_or_graded'    => (string) ( $row['raw_or_graded'] ?? '' ),
			'condition_code'   => self::nullable_string( $row['condition_code'] ?? null ),
			'grading_company'  => self::nullable_string( $row['grading_company'] ?? null ),
			'grade'            => self::nullable_string( $row['grade'] ?? null ),
			'cert_number'      => self::nullable_string( $row['cert_number'] ?? null ),
			'sale_price'       => self::decimal_string( $row['sale_price'] ?? null ),
			'sale_currency'    => (string) ( $row['sale_currency'] ?? 'USD' ),
			'status'           => (string) ( $row['status'] ?? '' ),
			'front_image_url'  => self::nullable_string( $row['front_image_remote_url'] ?? null ),
			'back_image_url'   => self::nullable_string( $row['back_image_remote_url'] ?? null ),
			'reserve_eligible' => InventoryStatus::AVAILABLE === ( $row['status'] ?? '' ),
		);

		if ( $is_public ) {
			return $presented;
		}

		return array_merge(
			$presented,
			array(
				'inventory_id'                => self::nullable_int( $row['inventory_id'] ?? null ),
				'barcode'                     => self::nullable_string( $row['barcode'] ?? null ),
				'sku'                         => self::nullable_string( $row['sku'] ?? null ),
				'cost'                        => self::decimal_string( $row['cost'] ?? null ),
				'cost_currency'               => self::nullable_string( $row['cost_currency'] ?? null ),
				'market_price'                => self::decimal_string( $row['market_price'] ?? null ),
				'suggested_price'             => self::decimal_string( $row['suggested_price'] ?? null ),
				'minimum_sale_price'          => self::decimal_string( $row['minimum_sale_price'] ?? null ),
				'price_lock'                  => self::bool_value( $row['price_lock'] ?? false ),
				'price_floor_hit'             => self::bool_value( $row['price_floor_hit'] ?? false ),
				'location_id'                 => self::nullable_int( $row['location_id'] ?? null ),
				'online_visibility'           => self::nullable_string( $row['online_visibility'] ?? null ),
				'kiosk_visibility'            => self::nullable_string( $row['kiosk_visibility'] ?? null ),
				'pos_visibility'              => self::nullable_string( $row['pos_visibility'] ?? null ),
				'woocommerce_product_id'      => self::nullable_int( $row['woocommerce_product_id'] ?? null ),
				'square_catalog_item_id'      => self::nullable_string( $row['square_catalog_item_id'] ?? null ),
				'square_catalog_variation_id' => self::nullable_string( $row['square_catalog_variation_id'] ?? null ),
				'external_sync_state'         => self::nullable_string( $row['external_sync_state'] ?? null ),
				'last_external_sync_at'       => self::nullable_string( $row['last_external_sync_at'] ?? null ),
				'notes'                       => self::nullable_string( $row['notes'] ?? null ),
				'staff_notes'                 => self::nullable_string( $row['staff_notes'] ?? null ),
				'updated_at'                  => self::nullable_string( $row['updated_at'] ?? null ),
				'row_version'                 => self::nullable_int( $row['row_version'] ?? null ),
			)
		);
	}

	private static function nullable_string( mixed $value ): ?string {
		if ( null === $value || '' === $value ) {
			return null;
		}

		return (string) $value;
	}

	private static function nullable_int( mixed $value ): ?int {
		if ( null === $value || '' === $value ) {
			return null;
		}

		return max( 0, (int) $value );
	}

	private static function decimal_string( mixed $value ): ?string {
		if ( null === $value || '' === $value ) {
			return null;
		}

		return number_format( (float) $value, 2, '.', '' );
	}

	private static function bool_value( mixed $value ): bool {
		if ( is_bool( $value ) ) {
			return $value;
		}

		return '1' === (string) $value || 1 === $value || 'true' === strtolower( (string) $value );
	}
}
