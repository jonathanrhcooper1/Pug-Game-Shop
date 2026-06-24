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
			'square_sync'               => $this->square_sync_request(),
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

	/**
	 * @param list<array<string, mixed>> $inventory_rows Canonical plugin inventory rows for one card product.
	 * @param array<string, mixed>       $context Projection context.
	 */
	public function plan_group( array $inventory_rows, array $context = array() ): InventoryProductProjectionPlan {
		$rows = array_values(
			array_filter(
				$inventory_rows,
				static fn ( array $row ): bool => array() !== $row
			)
		);

		if ( array() === $rows ) {
			return InventoryProductProjectionPlan::failed(
				'woocommerce_grouped_product_projection_invalid',
				'woocommerce:grouped-product-projection:empty',
				array( 'inventory_group_rows_required' )
			);
		}

		$seed            = $rows[0];
		$group_key       = $this->product_group_key( $seed );
		$idempotency_key = $this->group_idempotency_key( $group_key, $rows, $context );
		$visible_rows    = $this->available_visible_rows( $rows );
		$product_id      = $this->group_product_id( $visible_rows, $rows );

		if ( array() === $visible_rows && null === $product_id ) {
			return InventoryProductProjectionPlan::skipped(
				'woocommerce_grouped_product_projection_skipped',
				$idempotency_key,
				array( 'no_available_visible_inventory_rows', 'woocommerce_product_id_missing' ),
				array(
					$this->audit_event(
						'woocommerce.grouped_product_projection_skipped',
						$group_key,
						array(
							'row_count'                    => count( $rows ),
							'available_visible_row_count'  => 0,
							'woocommerce_write_deferred'   => true,
							'network_request_deferred'     => true,
						)
					),
				)
			);
		}

		$card_name = $this->string_value( $seed, array( 'card_name', 'name' ) );
		$sku       = $this->group_sku( $seed, $group_key );
		$currency  = $this->currency( $seed['sale_currency'] ?? $context['store_currency'] ?? 'USD' );

		if ( array() === $visible_rows && null !== $product_id ) {
			return $this->plan_group_stockout(
				$seed,
				$product_id,
				$group_key,
				$idempotency_key,
				$card_name,
				$currency,
				count( $rows )
			);
		}

		$options   = $this->group_options( $visible_rows, $currency );
		$price     = $this->lowest_option_price( $options );
		$errors    = $this->group_errors( $card_name, $sku, $currency, $price, $context );

		if ( array() !== $errors ) {
			return InventoryProductProjectionPlan::failed(
				'woocommerce_grouped_product_projection_invalid',
				$idempotency_key,
				$errors
			);
		}

		$requires_product_creation = null === $product_id;
		$operation                 = array(
			'operation'                 => $requires_product_creation ? 'create_product' : 'update_product',
			'product_id'                => $product_id,
			'requires_product_creation' => $requires_product_creation,
			'square_sync'               => $this->square_sync_request(),
			'product'                   => $this->group_product_payload(
				$seed,
				$product_id,
				$card_name,
				$sku,
				(string) $price,
				$currency,
				$group_key,
				$options
			),
		);

		return InventoryProductProjectionPlan::ready(
			'woocommerce_grouped_product_projection_ready',
			$idempotency_key,
			array( $operation ),
			array(
				$this->audit_event(
					'woocommerce.grouped_product_projection_ready',
					$group_key,
					array(
						'product_operation_count'    => 1,
						'requires_product_creation'  => $requires_product_creation,
						'row_count'                  => count( $rows ),
						'available_visible_row_count' => count( $visible_rows ),
						'option_count'               => count( $options ),
						'woocommerce_write_deferred' => true,
						'network_request_deferred'   => true,
					)
				),
			),
			$requires_product_creation,
			array( 'serialized_checkout_reserves_exact_inventory_row' )
		);
	}

	private function plan_group_stockout(
		array $seed,
		int $product_id,
		string $group_key,
		string $idempotency_key,
		string $card_name,
		string $currency,
		int $row_count
	): InventoryProductProjectionPlan {
		$operation = array(
			'operation'                 => 'mark_grouped_product_out_of_stock',
			'product_id'                => $product_id,
			'requires_product_creation' => false,
			'square_sync'               => $this->square_sync_request(),
			'product'                   => array(
				'id'                 => $product_id,
				'manage_stock'       => true,
				'stock_quantity'     => 0,
				'stock_status'       => 'outofstock',
				'catalog_visibility' => 'hidden',
				'meta_data'          => $this->meta_data(
					array(
						'_tcg_serialized_inventory'   => '1',
						'_tcg_inventory_product_mode' => 'grouped_card',
						'_tcg_inventory_group_key'    => $group_key,
						'_tcg_card_name'              => $card_name,
						'_tcg_game'                   => $this->string_value( $seed, array( 'game' ) ),
						'_tcg_set_name'               => $this->string_value( $seed, array( 'set_name' ) ),
						'_tcg_set_code'               => $this->string_value( $seed, array( 'set_code' ) ),
						'_tcg_card_number'            => $this->string_value( $seed, array( 'card_number' ) ),
						'_tcg_sale_currency'          => $currency,
						'_tcg_group_stock_quantity'   => '0',
						'_tcg_inventory_options_json' => '[]',
						'_tcg_projection_state'       => 'stockout',
						'_tcg_source_of_truth'        => 'tcg_store_platform',
					)
				),
			),
		);

		return InventoryProductProjectionPlan::ready(
			'woocommerce_grouped_product_stockout_ready',
			$idempotency_key,
			array( $operation ),
			array(
				$this->audit_event(
					'woocommerce.grouped_product_stockout_ready',
					$group_key,
					array(
						'row_count'                    => $row_count,
						'available_visible_row_count'  => 0,
						'product_operation_count'      => 1,
						'woocommerce_write_deferred'   => true,
						'network_request_deferred'     => true,
					)
				),
			),
			false,
			array( 'no_available_visible_inventory_rows' )
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
				'square_sync'               => $this->square_sync_request(),
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
		$stock_quantity = $this->row_quantity_on_hand( $row );
		$payload = array(
			'type'               => 'simple',
			'status'             => 'publish',
			'name'               => $this->product_name( $row, $card_name ),
			'description'        => $this->description( $row ),
			'short_description'  => $this->short_description( $row ),
			'sku'                => $sku,
			'regular_price'      => $price,
			'manage_stock'       => true,
			'stock_quantity'     => $stock_quantity,
			'stock_status'       => $stock_quantity > 0 ? 'instock' : 'outofstock',
			'sold_individually'  => true,
			'catalog_visibility' => $stock_quantity > 0 ? 'visible' : 'hidden',
			'virtual'            => false,
			'downloadable'       => false,
			'category_slugs'     => $this->product_category_slugs( $row ),
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
	 * @param list<array<string, mixed>> $rows Inventory rows.
	 * @return list<array<string, mixed>>
	 */
	private function available_visible_rows( array $rows ): array {
		return array_values(
			array_filter(
				$rows,
				function ( array $row ): bool {
					return InventoryStatus::AVAILABLE === $this->slug( $row['status'] ?? '' )
						&& 'visible' === $this->slug( $row['online_visibility'] ?? 'hidden' )
						&& null !== $this->sale_price( $row );
				}
			)
		);
	}

	/**
	 * @param list<array<string, mixed>> $rows Inventory rows.
	 */
	private function group_product_id( array $preferred_rows, array $fallback_rows ): ?int {
		$product_id = $this->first_group_product_id( $preferred_rows );

		if ( null !== $product_id ) {
			return $product_id;
		}

		usort(
			$fallback_rows,
			fn ( array $left, array $right ): int => ( $this->positive_int( $right['inventory_id'] ?? null ) ?? 0 )
				<=> ( $this->positive_int( $left['inventory_id'] ?? null ) ?? 0 )
		);

		return $this->first_group_product_id( $fallback_rows );
	}

	/**
	 * @param list<array<string, mixed>> $rows Inventory rows.
	 */
	private function first_group_product_id( array $rows ): ?int {
		foreach ( $rows as $row ) {
			$product_id = $this->positive_int( $row['woocommerce_product_id'] ?? null );

			if ( null !== $product_id ) {
				return $product_id;
			}
		}

		return null;
	}

	/**
	 * @param list<array<string, mixed>> $rows Inventory rows.
	 * @param array<string, mixed>       $context Projection context.
	 */
	private function group_idempotency_key( string $group_key, array $rows, array $context ): string {
		$requested_key = $this->string_value( $context, array( 'idempotency_key' ) );

		if ( '' !== $requested_key ) {
			return substr( $requested_key, 0, 191 );
		}

		$row_version = 1;
		foreach ( $rows as $row ) {
			$row_version = max( $row_version, $this->positive_int( $row['row_version'] ?? null ) ?? 1 );
		}

		return substr( self::PROVIDER . ':grouped-product-projection:' . $group_key . ':v' . (string) $row_version, 0, 191 );
	}

	/**
	 * @param list<array<string, mixed>> $rows Inventory rows.
	 * @return list<array<string, mixed>>
	 */
	private function group_options( array $rows, string $currency ): array {
		$options = array();

		foreach ( $rows as $row ) {
			$price = $this->sale_price( $row );

			if ( null === $price ) {
				continue;
			}

			$option_key = $this->inventory_option_key( $row, $price );

			if ( ! isset( $options[ $option_key ] ) ) {
				$options[ $option_key ] = array(
					'option_key'     => $option_key,
					'condition_code' => strtoupper( $this->string_value( $row, array( 'condition_code' ) ) ),
					'condition_label' => $this->condition_label( $this->string_value( $row, array( 'condition_code' ) ) ),
					'variant'        => $this->string_value( $row, array( 'variant' ) ),
					'finish'         => $this->string_value( $row, array( 'finish' ) ),
					'language'       => strtoupper( $this->string_value( $row, array( 'language' ) ) ),
					'raw_or_graded'  => $this->string_value( $row, array( 'raw_or_graded' ) ),
					'price'          => $price,
					'price_minor_units' => $this->minor_units( $price ),
					'currency'       => $currency,
					'stock_quantity' => 0,
					'inventory_ids'  => array(),
				);
			}

			$options[ $option_key ]['stock_quantity'] += $this->row_quantity_on_hand( $row );
			$options[ $option_key ]['inventory_ids'][] = (int) ( $row['inventory_id'] ?? 0 );
		}

		usort(
			$options,
			static function ( array $left, array $right ): int {
				$price_compare = ( (int) ( $left['price_minor_units'] ?? 0 ) ) <=> ( (int) ( $right['price_minor_units'] ?? 0 ) );

				if ( 0 !== $price_compare ) {
					return $price_compare;
				}

				return strcmp( (string) ( $left['condition_code'] ?? '' ), (string) ( $right['condition_code'] ?? '' ) );
			}
		);

		return array_values( $options );
	}

	/**
	 * @param list<array<string, mixed>> $options Product options.
	 */
	private function lowest_option_price( array $options ): ?string {
		foreach ( $options as $option ) {
			$price = $this->sale_price( array( 'sale_price' => $option['price'] ?? null ) );

			if ( null !== $price ) {
				return $price;
			}
		}

		return null;
	}

	/**
	 * @param array<string, mixed>       $row Seed inventory row.
	 * @param list<array<string, mixed>> $options Option payloads.
	 * @return array<string, mixed>
	 */
	private function group_product_payload(
		array $row,
		?int $product_id,
		string $card_name,
		string $sku,
		string $price,
		string $currency,
		string $group_key,
		array $options
	): array {
		$total_stock = array_sum(
			array_map(
				static fn ( array $option ): int => max( 0, (int) ( $option['stock_quantity'] ?? 0 ) ),
				$options
			)
		);
		$image_url   = $this->string_value( $row, array( 'front_image_remote_url', 'front_image_url', 'image_url' ) );
		$payload     = array(
			'type'               => 'simple',
			'status'             => 'publish',
			'name'               => $this->product_name( $row, $card_name ),
			'description'        => $this->group_description( $row, $options ),
			'short_description'  => $this->group_short_description( $row, $options ),
			'sku'                => $sku,
			'regular_price'      => $price,
			'manage_stock'       => true,
			'stock_quantity'     => $total_stock,
			'stock_status'       => $total_stock > 0 ? 'instock' : 'outofstock',
			'sold_individually'  => true,
			'catalog_visibility' => $total_stock > 0 ? 'visible' : 'hidden',
			'virtual'            => false,
			'downloadable'       => false,
			'category_slugs'     => $this->product_category_slugs( $row ),
			'meta_data'          => $this->meta_data(
				array(
					'_tcg_serialized_inventory'   => '1',
					'_tcg_inventory_product_mode' => 'grouped_card',
					'_tcg_inventory_group_key'    => $group_key,
					'_tcg_card_name'              => $card_name,
					'_tcg_game'                   => $this->string_value( $row, array( 'game' ) ),
					'_tcg_set_name'               => $this->string_value( $row, array( 'set_name' ) ),
					'_tcg_set_code'               => $this->string_value( $row, array( 'set_code' ) ),
					'_tcg_card_number'            => $this->string_value( $row, array( 'card_number' ) ),
					'_tcg_printed_number'         => $this->string_value( $row, array( 'printed_number' ) ),
					'_tcg_reference_card_id'      => (string) ( $this->positive_int( $row['reference_card_id'] ?? null ) ?? '' ),
					'_tcg_provider_name'          => $this->string_value( $row, array( 'provider_name' ) ),
					'_tcg_provider_card_id'       => $this->string_value( $row, array( 'provider_card_id' ) ),
					'_tcg_front_image_url'        => $image_url,
					'_tcg_sale_currency'          => $currency,
					'_tcg_group_stock_quantity'   => (string) $total_stock,
					'_tcg_inventory_options_json' => $this->json( $options ),
					'_tcg_source_of_truth'        => 'tcg_store_platform',
				)
			),
		);

		if ( null !== $product_id ) {
			$payload['id'] = $product_id;
		}

		return $payload;
	}

	/**
	 * @param list<array<string, mixed>> $options Option payloads.
	 */
	private function group_description( array $row, array $options ): string {
		$conditions = array();
		foreach ( $options as $option ) {
			$conditions[] = trim(
				(string) ( $option['condition_code'] ?? '' ) . ' '
				. (string) ( $option['finish'] ?? '' ) . ' '
				. (string) ( $option['variant'] ?? '' ) . ' - '
				. (string) ( $option['stock_quantity'] ?? 0 ) . ' in stock'
			);
		}

		$parts = array_filter(
			array(
				$this->string_value( $row, array( 'card_name', 'name' ) ),
				$this->string_value( $row, array( 'set_name' ) ),
				$this->string_value( $row, array( 'set_code' ) ),
				$this->string_value( $row, array( 'rarity' ) ),
				implode( "\n", array_filter( $conditions ) ),
			),
			static fn ( string $value ): bool => '' !== trim( $value )
		);

		return $this->bounded_text( implode( "\n", $parts ), 5000 );
	}

	/**
	 * @param array<string, mixed> $row Inventory row.
	 * @return list<string>
	 */
	private function product_category_slugs( array $row ): array {
		$slugs = 'graded' === $this->slug( $row['raw_or_graded'] ?? '' )
			? array( 'graded-cards' )
			: array( 'singles' );
		$game  = $this->slug( $row['game'] ?? '' );

		if ( '' !== $game ) {
			$slugs[] = $this->game_category_slug( $game );
		}

		return array_values( array_unique( array_filter( $slugs ) ) );
	}

	private function game_category_slug( string $game ): string {
		return match ( $game ) {
			'magic', 'mtg', 'magicthegathering' => 'magic-the-gathering',
			'one-piece', 'onepiece' => 'one-piece',
			default => $game,
		};
	}

	/**
	 * @return array{enabled:true,taxonomy:string,term:string,extension:string}
	 */
	private function square_sync_request(): array {
		return array(
			'enabled'   => true,
			'taxonomy'  => 'wc_square_synced',
			'term'      => 'yes',
			'extension' => 'woocommerce-square',
		);
	}

	/**
	 * @param list<array<string, mixed>> $options Option payloads.
	 */
	private function group_short_description( array $row, array $options ): string {
		$labels = array();

		foreach ( array_slice( $options, 0, 4 ) as $option ) {
			$labels[] = trim(
				(string) ( $option['condition_code'] ?? '' )
				. ' '
				. (string) ( $option['finish'] ?? '' )
			);
		}

		$prefix = $this->string_value( $row, array( 'set_name', 'set_code' ) );
		$text   = trim( $prefix . ' - ' . implode( ', ', array_filter( $labels ) ) );

		return $this->bounded_text( $text, 255 );
	}

	/**
	 * @param list<array<string, mixed>> $options Product options.
	 * @param array<string, mixed>       $context Projection context.
	 * @return list<string>
	 */
	private function group_errors( string $card_name, string $sku, string $currency, ?string $price, array $context ): array {
		$errors         = array();
		$store_currency = $this->currency( $context['store_currency'] ?? '' );

		if ( '' === $card_name ) {
			$errors[] = 'card_name_required';
		}

		if ( '' === $sku ) {
			$errors[] = 'group_sku_required';
		}

		if ( null === $price ) {
			$errors[] = 'available_option_price_required';
		}

		if ( '' === $currency ) {
			$errors[] = 'sale_currency_invalid';
		}

		if ( '' !== $store_currency && '' !== $currency && $store_currency !== $currency ) {
			$errors[] = 'sale_currency_mismatch';
		}

		return $errors;
	}

	/**
	 * @param array<string, mixed> $row Inventory row.
	 */
	private function group_sku( array $row, string $group_key ): string {
		$reference_id = $this->positive_int( $row['reference_card_id'] ?? null );

		if ( null !== $reference_id ) {
			return 'TCG-' . (string) $reference_id;
		}

		$provider_card_id = $this->string_value( $row, array( 'provider_card_id' ) );

		if ( '' !== $provider_card_id ) {
			return $this->bounded_text( 'TCG-' . strtoupper( preg_replace( '/[^A-Za-z0-9_-]+/', '-', $provider_card_id ) ?? $provider_card_id ), 100 );
		}

		return 'TCG-' . substr( hash( 'sha256', $group_key ), 0, 16 );
	}

	/**
	 * @param array<string, mixed> $row Inventory row.
	 */
	private function product_group_key( array $row ): string {
		$reference_id = $this->positive_int( $row['reference_card_id'] ?? null );

		if ( null !== $reference_id ) {
			return 'reference:' . (string) $reference_id;
		}

		$provider = $this->string_value( $row, array( 'provider_name' ) );
		$card_id  = $this->string_value( $row, array( 'provider_card_id' ) );

		if ( '' !== $provider && '' !== $card_id ) {
			return 'provider:' . strtolower( $provider ) . ':' . strtolower( $card_id );
		}

		return 'fingerprint:' . substr(
			hash(
				'sha256',
				strtolower(
					implode(
						'|',
						array(
							$this->string_value( $row, array( 'game' ) ),
							$this->string_value( $row, array( 'card_name', 'name' ) ),
							$this->string_value( $row, array( 'set_code', 'set_name' ) ),
							$this->string_value( $row, array( 'printed_number', 'card_number' ) ),
						)
					)
				)
			),
			0,
			24
		);
	}

	/**
	 * @param array<string, mixed> $row Inventory row.
	 */
	private function inventory_option_key( array $row, string $price ): string {
		return substr(
			hash(
				'sha256',
				strtolower(
					implode(
						'|',
						array(
							$this->string_value( $row, array( 'condition_code' ) ),
							$this->string_value( $row, array( 'variant' ) ),
							$this->string_value( $row, array( 'finish' ) ),
							$this->string_value( $row, array( 'language' ) ),
							$price,
						)
					)
				)
			),
			0,
			32
		);
	}

	private function condition_label( string $condition ): string {
		return match ( strtoupper( trim( $condition ) ) ) {
			'NM' => 'Near Mint',
			'LP' => 'Lightly Played',
			'MP' => 'Moderately Played',
			'HP' => 'Heavily Played',
			'DMG' => 'Damaged',
			default => strtoupper( trim( $condition ) ),
		};
	}

	private function minor_units( string $price ): int {
		return max( 0, (int) round( (float) $price * 100 ) );
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
				$this->game_label( $this->string_value( $row, array( 'game' ) ) ),
				$card_name,
				$this->string_value( $row, array( 'set_name' ) ),
				$this->string_value( $row, array( 'card_number' ) ),
			),
			static fn ( string $value ): bool => '' !== $value
		);

		return $this->bounded_text( implode( ' - ', $parts ), 120 );
	}

	private function game_label( string $game ): string {
		$game = strtolower( trim( $game ) );

		return match ( $game ) {
			'magicthegathering', 'magic', 'mtg' => 'Magic: The Gathering',
			'one-piece', 'onepiece' => 'One Piece',
			default => '' === $game ? '' : ucwords( str_replace( '-', ' ', $game ) ),
		};
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

	/**
	 * @param array<string, mixed> $row Inventory row.
	 */
	private function row_quantity_on_hand( array $row ): int {
		$quantity = $this->non_negative_int( $row['quantity_on_hand'] ?? null );

		if ( null !== $quantity ) {
			return $quantity;
		}

		return 'available' === strtolower( (string) ( $row['status'] ?? 'available' ) ) ? 1 : 0;
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
