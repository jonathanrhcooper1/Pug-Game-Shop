<?php
/**
 * WooCommerce CRUD writer for serialized inventory products.
 *
 * @package TCGStorePlatform
 */

namespace TCGStorePlatform\WooCommerce;

use Throwable;

final class WooCommerceInventoryProductWriter {
	/**
	 * @param array<string, mixed> $operation Planned WooCommerce product operation.
	 * @return array<string, mixed>
	 */
	public function __invoke( array $operation, InventoryProductProjectionPlan $plan, int $index ): array {
		unset( $plan, $index );

		if ( ! class_exists( '\WC_Product_Simple' ) || ! function_exists( 'wc_get_product' ) ) {
			return array(
				'status' => 'failed',
				'code'   => 'woocommerce_crud_unavailable',
			);
		}

		$product_payload = is_array( $operation['product'] ?? null ) ? $operation['product'] : array();
		$operation_type  = $this->text( $operation['operation'] ?? '' );

		if ( array() === $product_payload ) {
			return array(
				'status' => 'failed',
				'code'   => 'woocommerce_product_payload_missing',
			);
		}

		try {
			$product = $this->product_for_operation( $operation, $product_payload );

			if ( null === $product ) {
				return array(
					'status' => 'failed',
					'code'   => 'woocommerce_product_not_found',
				);
			}

			$this->apply_payload( $product, $product_payload );
			$product_id  = (int) $product->save();
			$square_sync = $this->apply_square_sync_status( $product_id, $operation['square_sync'] ?? null );

			return array(
				'status'      => 'written',
				'code'        => 'woocommerce_product_written',
				'operation'   => $operation_type,
				'product_id'  => $product_id,
				'square_sync' => $square_sync,
			);
		} catch ( Throwable $exception ) {
			return array(
				'status'         => 'failed',
				'code'           => 'woocommerce_product_writer_failed',
				'failure_type'   => $this->text( get_class( $exception ) ),
				'failure_code'   => $this->text( method_exists( $exception, 'getErrorCode' ) ? $exception->getErrorCode() : $exception->getCode() ),
				'failure_reason' => $this->failure_reason( $exception->getMessage() ),
			);
		}
	}

	/**
	 * @param array<string, mixed> $operation Planned WooCommerce product operation.
	 * @param array<string, mixed> $payload Product payload.
	 */
	private function product_for_operation( array $operation, array $payload ): ?\WC_Product {
		$product_id = $this->positive_int( $operation['product_id'] ?? $payload['id'] ?? null );
		$sku        = $this->text( $payload['sku'] ?? '' );

		if ( null === $product_id && '' !== $sku && function_exists( 'wc_get_product_id_by_sku' ) ) {
			$existing_id = wc_get_product_id_by_sku( $sku );
			$product_id  = $this->positive_int( $existing_id );
		}

		if ( null !== $product_id ) {
			$product = wc_get_product( $product_id );

			return $product instanceof \WC_Product ? $product : null;
		}

		return new \WC_Product_Simple();
	}

	/**
	 * @param array<string, mixed> $payload Product payload.
	 */
	private function apply_payload( \WC_Product $product, array $payload ): void {
		$this->call_string_setter( $product, 'set_name', $payload['name'] ?? null );
		$this->call_string_setter( $product, 'set_status', $payload['status'] ?? null );
		$this->call_string_setter( $product, 'set_description', $payload['description'] ?? null );
		$this->call_string_setter( $product, 'set_short_description', $payload['short_description'] ?? null );
		$this->call_string_setter( $product, 'set_sku', $payload['sku'] ?? null );
		$this->call_string_setter( $product, 'set_regular_price', $payload['regular_price'] ?? null );
		$this->call_string_setter( $product, 'set_stock_status', $payload['stock_status'] ?? null );
		$this->call_string_setter( $product, 'set_catalog_visibility', $payload['catalog_visibility'] ?? null );
		$this->call_bool_setter( $product, 'set_manage_stock', $payload['manage_stock'] ?? null );
		$this->call_bool_setter( $product, 'set_sold_individually', $payload['sold_individually'] ?? null );
		$this->call_bool_setter( $product, 'set_virtual', $payload['virtual'] ?? null );
		$this->call_bool_setter( $product, 'set_downloadable', $payload['downloadable'] ?? null );
		$this->apply_category_slugs( $product, $payload['category_slugs'] ?? array() );

		if ( array_key_exists( 'stock_quantity', $payload ) && method_exists( $product, 'set_stock_quantity' ) ) {
			$product->set_stock_quantity( max( 0, (int) $payload['stock_quantity'] ) );
		}

		$metadata = is_array( $payload['meta_data'] ?? null ) ? $payload['meta_data'] : array();
		foreach ( $metadata as $row ) {
			if ( ! is_array( $row ) ) {
				continue;
			}

			$key = $this->text( $row['key'] ?? '' );
			if ( '' === $key ) {
				continue;
			}

			$product->update_meta_data( $key, $this->text( $row['value'] ?? '' ) );
		}
	}

	/**
	 * @param mixed $square_sync Planned official WooCommerce Square sync marker.
	 * @return array<string, mixed>
	 */
	private function apply_square_sync_status( int $product_id, mixed $square_sync ): array {
		if ( $product_id <= 0 || ! is_array( $square_sync ) || true !== ( $square_sync['enabled'] ?? false ) ) {
			return array(
				'status' => 'skipped',
				'code'   => 'square_sync_not_requested',
			);
		}

		$taxonomy = $this->taxonomy_key( $square_sync['taxonomy'] ?? 'wc_square_synced' );
		$term     = $this->term_slug( $square_sync['term'] ?? 'yes' );

		if ( '' === $taxonomy || '' === $term ) {
			return array(
				'status' => 'skipped',
				'code'   => 'square_sync_request_invalid',
			);
		}

		if ( ! function_exists( 'taxonomy_exists' ) || ! taxonomy_exists( $taxonomy ) || ! function_exists( 'wp_set_post_terms' ) ) {
			return array(
				'status'   => 'deferred',
				'code'     => 'square_sync_taxonomy_unavailable',
				'taxonomy' => $taxonomy,
				'term'     => $term,
			);
		}

		if ( function_exists( 'term_exists' ) && ! term_exists( $term, $taxonomy ) && function_exists( 'wp_insert_term' ) ) {
			wp_insert_term( $term, $taxonomy, array( 'slug' => $term ) );
		}

		$result = wp_set_post_terms( $product_id, array( $term ), $taxonomy, false );

		if ( function_exists( 'is_wp_error' ) && is_wp_error( $result ) ) {
			return array(
				'status'   => 'failed',
				'code'     => 'square_sync_taxonomy_term_failed',
				'taxonomy' => $taxonomy,
				'term'     => $term,
			);
		}

		return array(
			'status'   => 'synced',
			'code'     => 'square_sync_taxonomy_term_set',
			'taxonomy' => $taxonomy,
			'term'     => $term,
		);
	}

	/**
	 * @param list<mixed> $slugs Product category slugs.
	 */
	private function apply_category_slugs( \WC_Product $product, array $slugs ): void {
		if ( ! method_exists( $product, 'set_category_ids' ) ) {
			return;
		}

		$category_ids = array();

		foreach ( $slugs as $slug ) {
			$term_id = $this->product_category_id( $this->term_slug( $slug ) );

			if ( null !== $term_id ) {
				$category_ids[] = $term_id;
			}
		}

		if ( array() !== $category_ids ) {
			$product->set_category_ids( array_values( array_unique( $category_ids ) ) );
		}
	}

	private function product_category_id( string $slug ): ?int {
		if ( '' === $slug || ! function_exists( 'taxonomy_exists' ) || ! taxonomy_exists( 'product_cat' ) ) {
			return null;
		}

		$term = function_exists( 'get_term_by' ) ? get_term_by( 'slug', $slug, 'product_cat' ) : null;

		if ( is_object( $term ) && isset( $term->term_id ) && (int) $term->term_id > 0 ) {
			return (int) $term->term_id;
		}

		if ( ! function_exists( 'wp_insert_term' ) ) {
			return null;
		}

		$created = wp_insert_term( $this->category_name( $slug ), 'product_cat', array( 'slug' => $slug ) );

		if ( is_array( $created ) && (int) ( $created['term_id'] ?? 0 ) > 0 ) {
			return (int) $created['term_id'];
		}

		if ( function_exists( 'is_wp_error' ) && is_wp_error( $created ) && $created->get_error_data( 'term_exists' ) ) {
			return $this->positive_int( $created->get_error_data( 'term_exists' ) );
		}

		return null;
	}

	private function category_name( string $slug ): string {
		return match ( $slug ) {
			'singles' => 'Singles',
			'sealed-products' => 'Sealed Products',
			'graded-cards' => 'Graded Cards',
			'accessories' => 'Accessories',
			'magic-the-gathering' => 'Magic: The Gathering',
			'pokemon' => 'Pokemon',
			'lorcana' => 'Lorcana',
			'one-piece' => 'One Piece',
			'riftbound' => 'Riftbound',
			'gundam' => 'Gundam',
			default => ucwords( str_replace( '-', ' ', $slug ) ),
		};
	}

	private function call_string_setter( \WC_Product $product, string $method, mixed $value ): void {
		$value = $this->text( $value );

		if ( '' !== $value && method_exists( $product, $method ) ) {
			$product->{$method}( $value );
		}
	}

	private function call_bool_setter( \WC_Product $product, string $method, mixed $value ): void {
		if ( null !== $value && method_exists( $product, $method ) ) {
			$product->{$method}( (bool) $value );
		}
	}

	private function failure_reason( mixed $value ): string {
		$value = strtolower( $this->text( $value ) );
		$value = preg_replace( '/[^a-z0-9]+/', '_', $value ) ?? '';

		return trim( substr( $value, 0, 120 ), '_' );
	}

	private function positive_int( mixed $value ): ?int {
		if ( is_int( $value ) && $value > 0 ) {
			return $value;
		}

		if ( is_numeric( $value ) && (int) $value > 0 ) {
			return (int) $value;
		}

		return null;
	}

	private function text( mixed $value ): string {
		return substr( trim( (string) ( is_array( $value ) || is_object( $value ) ? '' : $value ) ), 0, 5000 );
	}

	private function term_slug( mixed $value ): string {
		return strtolower( preg_replace( '/[^a-z0-9-]+/', '-', trim( (string) $value ) ) ?? '' );
	}

	private function taxonomy_key( mixed $value ): string {
		return strtolower( preg_replace( '/[^a-z0-9_]+/', '_', trim( (string) $value ) ) ?? '' );
	}
}
