<?php
/**
 * Plan-only Square catalog and inventory projection.
 *
 * @package TCGStorePlatform
 */

namespace TCGStorePlatform\Square;

use TCGStorePlatform\Inventory\InventoryStatus;

final class SquareInventoryProjectionPlanner {
	private const PROVIDER = 'square';

	/**
	 * @param array<string, mixed> $inventory_row Canonical plugin inventory row.
	 * @param array<string, mixed> $context Projection context.
	 */
	public function plan_row( array $inventory_row, array $context = array() ): SquareInventoryProjectionPlan {
		$status                 = $this->slug( $inventory_row['status'] ?? '' );
		$kiosk_visibility       = $this->slug( $inventory_row['kiosk_visibility'] ?? 'hidden' );
		$public_id              = $this->public_identity( $inventory_row );
		$idempotency_key        = $this->idempotency_key( $public_id, $inventory_row, $context );
		$square_location_id     = $this->string_value( $context, array( 'square_location_id', 'provider_location_id' ) );
		$square_location_id     = '' !== $square_location_id
			? $square_location_id
			: $this->string_value( $inventory_row, array( 'square_location_id', 'provider_location_id' ) );
		$square_variation_id    = $this->string_value( $inventory_row, array( 'square_catalog_variation_id', 'square_variation_id', 'external_variation_id' ) );
		$available_for_square   = InventoryStatus::AVAILABLE === $status && 'visible' === $kiosk_visibility;
		$has_existing_mapping   = '' !== $square_variation_id;
		$occurred_at            = $this->timestamp( $context['occurred_at'] ?? null );
		$requires_id_resolution = false;

		if ( ! $available_for_square ) {
			return $this->plan_unavailable_row(
				$status,
				$kiosk_visibility,
				$public_id,
				$idempotency_key,
				$square_location_id,
				$square_variation_id,
				$has_existing_mapping,
				$occurred_at
			);
		}

		$card_name    = $this->string_value( $inventory_row, array( 'card_name', 'name' ) );
		$sku          = $this->square_sku( $inventory_row );
		$currency     = $this->currency( $inventory_row['sale_currency'] ?? $context['currency'] ?? 'USD' );
		$price        = $this->sale_price_minor_units( $inventory_row );
		$item_id      = $this->catalog_item_id( $inventory_row, $public_id );
		$variation_id = '' !== $square_variation_id
			? $square_variation_id
			: $this->temporary_id( 'tcg-var', $public_id );

		$errors = $this->available_row_errors( $card_name, $sku, $currency, $price, $square_location_id );

		if ( array() !== $errors ) {
			return SquareInventoryProjectionPlan::failed(
				'square_inventory_projection_invalid',
				$idempotency_key,
				$errors
			);
		}

		if ( str_starts_with( $variation_id, '#' ) ) {
			$requires_id_resolution = true;
		}

		$catalog_object   = $this->catalog_object( $inventory_row, $item_id, $variation_id, $card_name, $sku, $currency, (int) $price, $square_location_id );
		$inventory_change = $this->physical_count_change( $variation_id, $square_location_id, '1', $occurred_at );
		$audit_events     = array(
			$this->audit_event(
				'square.inventory_projection_ready',
				$public_id,
				array(
					'catalog_object_count'                 => 1,
					'inventory_change_count'               => 1,
					'requires_catalog_id_resolution'       => $requires_id_resolution,
					'provider_inventory_write_deferred'    => true,
					'network_request_deferred'             => true,
					'official_square_payment_extension'    => 'required_for_payments',
					'woocommerce_gateway_capture_deferred' => true,
				)
			),
		);

		return SquareInventoryProjectionPlan::ready(
			'square_inventory_projection_ready',
			$idempotency_key,
			array( $catalog_object ),
			array( $inventory_change ),
			$audit_events,
			$requires_id_resolution
		);
	}

	private function plan_unavailable_row(
		string $status,
		string $kiosk_visibility,
		string $public_id,
		string $idempotency_key,
		string $square_location_id,
		string $square_variation_id,
		bool $has_existing_mapping,
		string $occurred_at
	): SquareInventoryProjectionPlan {
		$skip_reasons = array();

		if ( InventoryStatus::AVAILABLE !== $status ) {
			$skip_reasons[] = 'status_not_available';
		}

		if ( 'visible' !== $kiosk_visibility ) {
			$skip_reasons[] = 'kiosk_visibility_not_visible';
		}

		if ( $has_existing_mapping && '' !== $square_location_id ) {
			$inventory_change = $this->physical_count_change( $square_variation_id, $square_location_id, '0', $occurred_at );

			return SquareInventoryProjectionPlan::ready(
				'square_inventory_zero_count_ready',
				$idempotency_key,
				array(),
				array( $inventory_change ),
				array(
					$this->audit_event(
						'square.inventory_projection_zero_count_ready',
						$public_id,
						array(
							'skip_reasons'             => $skip_reasons,
							'catalog_object_count'     => 0,
							'inventory_change_count'   => 1,
							'requires_catalog_id_resolution' => false,
							'provider_inventory_write_deferred' => true,
							'network_request_deferred' => true,
						)
					),
				),
				false,
				$skip_reasons
			);
		}

		if ( $has_existing_mapping && '' === $square_location_id ) {
			$skip_reasons[] = 'square_location_id_missing';
		}

		if ( ! $has_existing_mapping ) {
			$skip_reasons[] = 'square_catalog_variation_id_missing';
		}

		return SquareInventoryProjectionPlan::skipped(
			'square_inventory_projection_skipped',
			$idempotency_key,
			$skip_reasons,
			array(
				$this->audit_event(
					'square.inventory_projection_skipped',
					$public_id,
					array(
						'skip_reasons'             => $skip_reasons,
						'provider_inventory_write_deferred' => true,
						'network_request_deferred' => true,
					)
				),
			)
		);
	}

	/**
	 * @return list<string>
	 */
	private function available_row_errors( string $card_name, string $sku, string $currency, ?int $price, string $square_location_id ): array {
		$errors = array();

		if ( '' === $card_name ) {
			$errors[] = 'card_name_required';
		}

		if ( '' === $sku ) {
			$errors[] = 'barcode_or_sku_required';
		}

		if ( null === $price ) {
			$errors[] = 'sale_price_required';
		}

		if ( '' === $currency ) {
			$errors[] = 'sale_currency_invalid';
		}

		if ( '' === $square_location_id ) {
			$errors[] = 'square_location_id_required';
		}

		return $errors;
	}

	/**
	 * @param array<string, mixed> $row Inventory row.
	 * @return array<string, mixed>
	 */
	private function catalog_object(
		array $row,
		string $item_id,
		string $variation_id,
		string $card_name,
		string $sku,
		string $currency,
		int $price_minor_units,
		string $square_location_id
	): array {
		return array(
			'type'                     => 'ITEM',
			'id'                       => $item_id,
			'present_at_all_locations' => false,
			'present_at_location_ids'  => array( $square_location_id ),
			'item_data'                => array(
				'name'        => $this->item_name( $row, $card_name ),
				'description' => $this->description( $row ),
				'variations'  => array(
					array(
						'type'                     => 'ITEM_VARIATION',
						'id'                       => $variation_id,
						'present_at_all_locations' => false,
						'present_at_location_ids'  => array( $square_location_id ),
						'item_variation_data'      => array(
							'item_id'         => $item_id,
							'name'            => $this->variation_name( $row ),
							'sku'             => $sku,
							'pricing_type'    => 'FIXED_PRICING',
							'price_money'     => array(
								'amount'   => $price_minor_units,
								'currency' => $currency,
							),
							'track_inventory' => true,
							'sellable'        => true,
							'stockable'       => true,
							'user_data'       => $this->user_data( $row ),
						),
					),
				),
			),
		);
	}

	/**
	 * @return array<string, mixed>
	 */
	private function physical_count_change( string $variation_id, string $square_location_id, string $quantity, string $occurred_at ): array {
		return array(
			'type'           => 'PHYSICAL_COUNT',
			'physical_count' => array(
				'catalog_object_id' => $variation_id,
				'location_id'       => $square_location_id,
				'quantity'          => $quantity,
				'state'             => 'IN_STOCK',
				'occurred_at'       => $occurred_at,
			),
		);
	}

	/**
	 * @param array<string, mixed> $row Inventory row.
	 */
	private function catalog_item_id( array $row, string $public_id ): string {
		$existing_id = $this->string_value( $row, array( 'square_catalog_item_id', 'square_item_id', 'external_item_id' ) );

		if ( '' !== $existing_id ) {
			return $existing_id;
		}

		return $this->temporary_id( 'tcg-item', $public_id );
	}

	/**
	 * @param array<string, mixed> $row Inventory row.
	 */
	private function public_identity( array $row ): string {
		$public_id = $this->string_value( $row, array( 'public_id' ) );

		if ( '' !== $public_id ) {
			return $public_id;
		}

		$inventory_id = $this->positive_int( $row['inventory_id'] ?? null );

		if ( null !== $inventory_id ) {
			return 'inventory-' . (string) $inventory_id;
		}

		return 'inventory-' . substr( hash( 'sha256', $this->json( $row ) ), 0, 16 );
	}

	/**
	 * @param array<string, mixed> $row Inventory row.
	 * @param array<string, mixed> $context Projection context.
	 */
	private function idempotency_key( string $public_id, array $row, array $context ): string {
		$requested_key = $this->string_value( $context, array( 'idempotency_key' ) );

		if ( '' !== $requested_key ) {
			return substr( $requested_key, 0, 191 );
		}

		$row_version = $this->positive_int( $row['row_version'] ?? null ) ?? 1;

		return substr( self::PROVIDER . ':inventory-projection:' . $public_id . ':v' . (string) $row_version, 0, 191 );
	}

	/**
	 * @param array<string, mixed> $row Inventory row.
	 */
	private function square_sku( array $row ): string {
		$sku = $this->string_value( $row, array( 'sku' ) );

		if ( '' !== $sku ) {
			return $this->bounded_square_text( $sku, 255 );
		}

		return $this->bounded_square_text( $this->string_value( $row, array( 'barcode' ) ), 255 );
	}

	/**
	 * @param array<string, mixed> $row Inventory row.
	 */
	private function item_name( array $row, string $card_name ): string {
		$game = strtoupper( $this->string_value( $row, array( 'game' ) ) );

		if ( '' === $game ) {
			return $this->bounded_square_text( $card_name, 255 );
		}

		return $this->bounded_square_text( $game . ' - ' . $card_name, 255 );
	}

	/**
	 * @param array<string, mixed> $row Inventory row.
	 */
	private function variation_name( array $row ): string {
		$parts = array_filter(
			array(
				$this->string_value( $row, array( 'condition_code' ) ),
				$this->string_value( $row, array( 'finish' ) ),
				$this->string_value( $row, array( 'variant' ) ),
				$this->string_value( $row, array( 'grading_company' ) ),
				$this->string_value( $row, array( 'grade' ) ),
				$this->string_value( $row, array( 'card_number' ) ),
			),
			static fn ( string $value ): bool => '' !== $value
		);

		if ( array() === $parts ) {
			return 'Single Card';
		}

		return $this->bounded_square_text( implode( ' / ', $parts ), 255 );
	}

	/**
	 * @param array<string, mixed> $row Inventory row.
	 */
	private function description( array $row ): string {
		$parts = array_filter(
			array(
				$this->string_value( $row, array( 'set_name' ) ),
				$this->string_value( $row, array( 'set_code' ) ),
				$this->string_value( $row, array( 'rarity' ) ),
				$this->string_value( $row, array( 'language' ) ),
				$this->string_value( $row, array( 'public_id' ) ),
			),
			static fn ( string $value ): bool => '' !== $value
		);

		return $this->bounded_square_text( implode( ' | ', $parts ), 4096 );
	}

	/**
	 * @param array<string, mixed> $row Inventory row.
	 */
	private function user_data( array $row ): string {
		return $this->bounded_square_text(
			$this->json(
				array(
					'source'       => 'tcg_store_platform',
					'public_id'    => $this->string_value( $row, array( 'public_id' ) ),
					'inventory_id' => $this->positive_int( $row['inventory_id'] ?? null ),
					'row_version'  => $this->positive_int( $row['row_version'] ?? null ) ?? 1,
				)
			),
			255
		);
	}

	/**
	 * @param array<string, mixed> $row Inventory row.
	 */
	private function sale_price_minor_units( array $row ): ?int {
		$minor_units = $this->non_negative_int( $row['sale_price_minor_units'] ?? null );

		if ( null !== $minor_units ) {
			return $minor_units;
		}

		$decimal = $row['sale_price'] ?? null;

		if ( null === $decimal || '' === $decimal || ! is_numeric( $decimal ) ) {
			return null;
		}

		$minor_units = (int) round( (float) $decimal * 100 );

		return $minor_units >= 0 ? $minor_units : null;
	}

	private function currency( mixed $value ): string {
		$currency = strtoupper( trim( (string) $value ) );

		if ( 1 === preg_match( '/^[A-Z]{3}$/', $currency ) ) {
			return $currency;
		}

		return '';
	}

	private function timestamp( mixed $value ): string {
		$timestamp = trim( (string) $value );

		if ( '' !== $timestamp ) {
			return $timestamp;
		}

		return gmdate( 'Y-m-d\TH:i:s\Z' );
	}

	/**
	 * @param array<string, mixed> $source Source data.
	 * @param list<string> $keys Candidate keys.
	 */
	private function string_value( array $source, array $keys ): string {
		foreach ( $keys as $key ) {
			if ( ! array_key_exists( $key, $source ) ) {
				continue;
			}

			$value = trim( (string) $source[ $key ] );

			if ( '' !== $value ) {
				return $value;
			}
		}

		return '';
	}

	private function slug( mixed $value ): string {
		return strtolower( trim( (string) $value ) );
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

	private function non_negative_int( mixed $value ): ?int {
		if ( is_int( $value ) && $value >= 0 ) {
			return $value;
		}

		if ( is_string( $value ) && 1 === preg_match( '/^\d+$/', $value ) ) {
			return (int) $value;
		}

		return null;
	}

	private function temporary_id( string $prefix, string $public_id ): string {
		return '#' . $prefix . '-' . substr( hash( 'sha256', $public_id ), 0, 20 );
	}

	private function bounded_square_text( string $value, int $limit ): string {
		$value = trim( $value );

		if ( strlen( $value ) <= $limit ) {
			return $value;
		}

		return substr( $value, 0, $limit );
	}

	/**
	 * @param mixed $value JSON-encodable value.
	 */
	private function json( mixed $value ): string {
		$json = function_exists( 'wp_json_encode' )
			? wp_json_encode( $value, JSON_UNESCAPED_SLASHES )
			: json_encode( $value, JSON_UNESCAPED_SLASHES );

		return false === $json ? '{}' : (string) $json;
	}

	/**
	 * @param array<string, mixed> $metadata Audit metadata.
	 * @return array<string, mixed>
	 */
	private function audit_event( string $action, string $public_id, array $metadata ): array {
		return array_merge(
			array(
				'action'                => $action,
				'provider'              => self::PROVIDER,
				'public_id_hash'        => hash( 'sha256', $public_id ),
				'source_of_truth'       => 'tcg_store_platform',
				'payment_capture_scope' => 'official_woocommerce_square_extension',
				'network_request_scope' => 'deferred',
			),
			$metadata
		);
	}
}
