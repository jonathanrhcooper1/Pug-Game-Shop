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

			return array(
				'status'     => 'written',
				'code'       => 'woocommerce_product_written',
				'operation'  => $operation_type,
				'product_id' => (int) $product->save(),
			);
		} catch ( Throwable ) {
			return array(
				'status' => 'failed',
				'code'   => 'woocommerce_product_writer_failed',
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
}
