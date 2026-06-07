<?php
/**
 * Plan-only WooCommerce product projection for exact inventory rows.
 *
 * @package TCGStorePlatform
 */

namespace TCGStorePlatform\WooCommerce;

use TCGStorePlatform\Inventory\InventoryStatus;

final class InventoryProductProjectionPlanner {
	private const PROVIDER = 'woocommerce';

	/**
	 * @param array<string, mixed> $inventory_row Canonical plugin inventory row.
	 * @param array<string, mixed> $context Projection context.
	 */
	public function plan_row( array $inventory_row, array $context = array() ): InventoryProductProjectionPlan {
		$status              = $this->slug( $inventory_row['status'] ?? '' );
		$online_visibility   = $this->slug( $inventory_row['online_visibility'] ?? 'hidden' );
		$public_id           = $this->public_identity( $inventory_row );
		$idempotency_key     = $this->idempotency_key( $public_id, $inventory_row, $context );
		$product_id          = $this->positive_int( $inventory_row['woocommerce_product_id'] ?? null );
		$available_for_store = InventoryStatus::AVAILABLE === $status && 'visible' === $online_visibility;

		if ( ! $available_for_store ) {
			return $this->plan_unavailable_row(
				$status,
				$online_visibility,
				$public_id,
				$idempotency_key,
				$product_id
			);
		}

		$card_name = $this->string_value( $inventory_row, array( 'card_name', 'name' ) );
		$sku       = $this->product_sku( $inventory_row );
		$currency  = $this->currency( $inventory_row['sale_currency'] ?? $context['store_currency'] ?? 'USD' );
		$price     = $this->sale_price( $inventory_row );
		$errors    = $this->available_row_errors( $card_name, $sku, $currency, $price, $inventory_row, $context );

		if ( array() !== $errors ) {
			return InventoryProductProjectionPlan::failed(
				'woocommerce_product_projection_invalid',
				$idempotency_key,
				$errors
			);
		}

		$requires_product_creation = null === $product_id;
		$operation                 = array(
			'operation'                 => $requires_product_creation ? 'create_product' : 'update_product',
			'product_id'                => $product_id,
			'requires_product_creation' => $requires_product_creation,
			'product'                   => $this->product_payload( $inventory_row, $product_id, $card_name, $sku, (string) $price, $currency ),
		);

		return InventoryProductProjectionPlan::ready(
			'woocommerce_product_projection_ready',
			$idempotency_key,
			array( $operation ),
			array(
				$this->audit_event(
					'woocommerce.product_projection_ready',
					$public_id,
					array(
						'product_operation_count'    => 1,
						'requires_product_creation'  => $requires_product_creation,
						'woocommerce_write_deferred' => true,
						'network_request_deferred'   => true,
					)
				),
			),
			$requires_product_creation
		);
	}

	private function plan_unavailable_row(
		string $status,
		string $online_visibility,
		string $public_id,
		string $idempotency_key,
		?int $product_id
	): InventoryProductProjectionPlan {
		$skip_reasons = array();

		if ( InventoryStatus::AVAILABLE !== $status ) {
			$skip_reasons[] = 'status_not_available';
		}

		if ( 'visible' !== $online_visibility ) {
			$skip_reasons[] = 'online_visibility_not_visible';
		}

		if ( null !== $product_id ) {
			$operation = array(
				'operation'                 => 'mark_product_out_of_stock',
				'product_id'                => $product_id,
				'requires_product_creation' => false,
				'product'                   => array(
					'id'                 => $product_id,
					'manage_stock'       => true,
					'stock_quantity'     => 0,
					'stock_status'       => 'outofstock',
					'catalog_visibility' => 'hidden',
					'meta_data'          => $this->meta_data(
						array(
							'_tcg_serialized_inventory' => '1',
							'_tcg_inventory_public_id'  => $public_id,
							'_tcg_inventory_status'     => $status,
							'_tcg_projection_state'     => 'stockout',
						)
					),
				),
			);

			return InventoryProductProjectionPlan::ready(
				'woocommerce_product_stockout_ready',
				$idempotency_key,
				array( $operation ),
				array(
					$this->audit_event(
						'woocommerce.product_stockout_ready',
						$public_id,
						array(
							'skip_reasons'               => $skip_reasons,
							'product_operation_count'    => 1,
							'woocommerce_write_deferred' => true,
							'network_request_deferred'   => true,
						)
					),
				),
				false,
				$skip_reasons
			);
		}

		$skip_reasons[] = 'woocommerce_product_id_missing';

		return InventoryProductProjectionPlan::skipped(
			'woocommerce_product_projection_skipped',
			$idempotency_key,
			$skip_reasons,
			array(
				$this->audit_event(
					'woocommerce.product_projection_skipped',
					$public_id,
					array(
						'skip_reasons'               => $skip_reasons,
						'woocommerce_write_deferred' => true,
						'network_request_deferred'   => true,
					)
				),
			)
		);
	}

	/**
	 * @param array<string, mixed> $row Inventory row.
	 * @param array<string, mixed> $context Projection context.
	 * @return list<string>
	 */
	private function available_row_errors(
		string $card_name,
		string $sku,
		string $currency,
		?string $price,
		array $row,
		array $context
	): array {
		$errors         = array();
		$store_currency = $this->currency( $context['store_currency'] ?? '' );

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

		if ( '' !== $store_currency && '' !== $currency && $store_currency !== $currency ) {
			$errors[] = 'sale_currency_mismatch';
		}

		if ( $this->positive_int( $row['quantity'] ?? 1 ) !== 1 ) {
			$errors[] = 'serialized_quantity_must_be_one';
		}

		return $errors;
	}

	/**
	 * @param array<string, mixed> $row Inventory row.
	 * @return array<string, mixed>
	 */
	private function product_payload(
		array $row,
		?int $product_id,
		string $card_name,
		string $sku,
		string $price,
		string $currency
	): array {
		$payload = array(
			'type'               => 'simple',
			'status'             => 'publish',
			'name'               => $this->product_name( $row, $card_name ),
			'description'        => $this->description( $row ),
			'short_description'  => $this->short_description( $row ),
			'sku'                => $sku,
			'regular_price'      => $price,
			'manage_stock'       => true,
			'stock_quantity'     => 1,
			'stock_status'       => 'instock',
			'sold_individually'  => true,
			'catalog_visibility' => 'visible',
			'virtual'            => false,
			'downloadable'       => false,
			'meta_data'          => $this->meta_data(
				array(
					'_tcg_serialized_inventory' => '1',
					'_tcg_inventory_public_id'  => $this->string_value( $row, array( 'public_id' ) ),
					'_tcg_inventory_id'         => (string) ( $this->positive_int( $row['inventory_id'] ?? null ) ?? '' ),
					'_tcg_barcode'              => $this->string_value( $row, array( 'barcode' ) ),
					'_tcg_card_name'            => $card_name,
					'_tcg_game'                 => $this->string_value( $row, array( 'game' ) ),
					'_tcg_set_name'             => $this->string_value( $row, array( 'set_name' ) ),
					'_tcg_set_code'             => $this->string_value( $row, array( 'set_code' ) ),
					'_tcg_card_number'          => $this->string_value( $row, array( 'card_number' ) ),
					'_tcg_condition_code'       => $this->string_value( $row, array( 'condition_code' ) ),
					'_tcg_sale_currency'        => $currency,
					'_tcg_row_version'          => (string) ( $this->positive_int( $row['row_version'] ?? null ) ?? 1 ),
					'_tcg_source_of_truth'      => 'tcg_store_platform',
				)
			),
		);

		if ( null !== $product_id ) {
			$payload['id'] = $product_id;
		}

		return $payload;
	}

	/**
	 * @param array<string, string> $metadata Metadata key/value map.
	 * @return list<array{key:string,value:string}>
	 */
	private function meta_data( array $metadata ): array {
		$rows = array();

		foreach ( $metadata as $key => $value ) {
			$value = trim( $value );

			if ( '' === $value ) {
				continue;
			}

			$rows[] = array(
				'key'   => $key,
				'value' => $value,
			);
		}

		return $rows;
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

		return substr( self::PROVIDER . ':product-projection:' . $public_id . ':v' . (string) $row_version, 0, 191 );
	}

	/**
	 * @param array<string, mixed> $row Inventory row.
	 */
	private function product_sku( array $row ): string {
		$sku = $this->string_value( $row, array( 'sku' ) );

		if ( '' !== $sku ) {
			return $this->bounded_text( $sku, 100 );
		}

		return $this->bounded_text( $this->string_value( $row, array( 'barcode' ) ), 100 );
	}

	/**
	 * @param array<string, mixed> $row Inventory row.
	 */
	private function product_name( array $row, string $card_name ): string {
		$parts = array_filter(
			array(
				$this->string_value( $row, array( 'game' ) ),
				$card_name,
				$this->string_value( $row, array( 'set_name' ) ),
				$this->string_value( $row, array( 'card_number' ) ),
			),
			static fn ( string $value ): bool => '' !== $value
		);

		return $this->bounded_text( implode( ' - ', $parts ), 120 );
	}

	/**
	 * @param array<string, mixed> $row Inventory row.
	 */
	private function description( array $row ): string {
		$parts = array_filter(
			array(
				$this->string_value( $row, array( 'card_name', 'name' ) ),
				$this->string_value( $row, array( 'set_name' ) ),
				$this->string_value( $row, array( 'set_code' ) ),
				$this->string_value( $row, array( 'rarity' ) ),
				$this->string_value( $row, array( 'finish' ) ),
				$this->string_value( $row, array( 'condition_code' ) ),
				$this->string_value( $row, array( 'public_id' ) ),
			),
			static fn ( string $value ): bool => '' !== $value
		);

		return $this->bounded_text( implode( "\n", $parts ), 5000 );
	}

	/**
	 * @param array<string, mixed> $row Inventory row.
	 */
	private function short_description( array $row ): string {
		$parts = array_filter(
			array(
				$this->string_value( $row, array( 'condition_code' ) ),
				$this->string_value( $row, array( 'finish' ) ),
				$this->string_value( $row, array( 'raw_or_graded' ) ),
			),
			static fn ( string $value ): bool => '' !== $value
		);

		return $this->bounded_text( implode( ' / ', $parts ), 255 );
	}

	/**
	 * @param array<string, mixed> $row Inventory row.
	 */
	private function sale_price( array $row ): ?string {
		$minor_units = $this->non_negative_int( $row['sale_price_minor_units'] ?? null );

		if ( null !== $minor_units ) {
			return $this->format_minor_units( $minor_units );
		}

		$decimal = $row['sale_price'] ?? null;

		if ( null === $decimal || '' === $decimal || ! is_numeric( $decimal ) ) {
			return null;
		}

		$amount = (float) $decimal;

		if ( $amount < 0 ) {
			return null;
		}

		return number_format( $amount, 2, '.', '' );
	}

	private function format_minor_units( int $minor_units ): string {
		$major = intdiv( $minor_units, 100 );
		$minor = $minor_units % 100;

		return sprintf( '%d.%02d', $major, $minor );
	}

	private function currency( mixed $value ): string {
		$currency = strtoupper( trim( (string) $value ) );

		if ( 1 === preg_match( '/^[A-Z]{3}$/', $currency ) ) {
			return $currency;
		}

		return '';
	}

	/**
	 * @param array<string, mixed> $source Source data.
	 * @param list<string>        $keys Candidate keys.
	 */
	private function string_value( array $source, array $keys ): string {
		foreach ( $keys as $key ) {
			if ( ! array_key_exists( $key, $source ) ) {
				continue;
			}

			$value = trim( (string) $source[ $key ] );

			if ( '' !== $value ) {
				return preg_replace( '/\s+/', ' ', $value ) ?? '';
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

	private function bounded_text( string $value, int $limit ): string {
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
				'action'                  => $action,
				'provider'                => self::PROVIDER,
				'public_id_hash'          => hash( 'sha256', $public_id ),
				'source_of_truth'         => 'tcg_store_platform',
				'woocommerce_write_scope' => 'deferred',
				'network_request_scope'   => 'deferred',
			),
			$metadata
		);
	}
}
