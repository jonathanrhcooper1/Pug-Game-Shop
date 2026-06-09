<?php
/**
 * WooCommerce inventory product writer tests.
 *
 * @package TCGStorePlatform
 */

namespace {
	if ( ! class_exists( 'WC_Product' ) ) {
		class WC_Product {
			public array $values = array();
			public array $meta = array();

			public function set_name( string $value ): void {
				$this->values['name'] = $value;
			}

			public function set_status( string $value ): void {
				$this->values['status'] = $value;
			}

			public function set_sku( string $value ): void {
				$this->values['sku'] = $value;
			}

			public function set_regular_price( string $value ): void {
				$this->values['regular_price'] = $value;
			}

			public function set_manage_stock( bool $value ): void {
				$this->values['manage_stock'] = $value;
			}

			public function set_stock_quantity( int $value ): void {
				$this->values['stock_quantity'] = $value;
			}

			public function set_stock_status( string $value ): void {
				$this->values['stock_status'] = $value;
			}

			public function set_category_ids( array $value ): void {
				$this->values['category_ids'] = $value;
			}

			public function update_meta_data( string $key, string $value ): void {
				$this->meta[ $key ] = $value;
			}

			public function save(): int {
				$GLOBALS['tcg_test_last_saved_product'] = $this;

				return 2468;
			}
		}
	}

	if ( ! class_exists( 'WC_Product_Simple' ) ) {
		class WC_Product_Simple extends WC_Product {
		}
	}

	if ( ! function_exists( 'wc_get_product' ) ) {
		function wc_get_product( int $product_id ): ?WC_Product {
			unset( $product_id );

			return new WC_Product_Simple();
		}
	}

	if ( ! function_exists( 'wc_get_product_id_by_sku' ) ) {
		function wc_get_product_id_by_sku( string $sku ): int {
			unset( $sku );

			return 0;
		}
	}

	if ( ! function_exists( 'taxonomy_exists' ) ) {
		function taxonomy_exists( string $taxonomy ): bool {
			return 'product_cat' === $taxonomy;
		}
	}

	if ( ! function_exists( 'get_term_by' ) ) {
		function get_term_by( string $field, string $value, string $taxonomy ): ?object {
			unset( $field );

			if ( 'product_cat' !== $taxonomy ) {
				return null;
			}

			$terms = array(
				'singles' => 101,
			);

			return isset( $terms[ $value ] ) ? (object) array( 'term_id' => $terms[ $value ] ) : null;
		}
	}

	if ( ! function_exists( 'wp_insert_term' ) ) {
		function wp_insert_term( string $name, string $taxonomy, array $args = array() ): array {
			unset( $name, $taxonomy );

			$slug = (string) ( $args['slug'] ?? '' );

			return array(
				'term_id' => 'pokemon' === $slug ? 102 : 199,
			);
		}
	}
}

namespace TCGStorePlatform\Tests\Unit {
	use TCGStorePlatform\Tests\TestCase;
	use TCGStorePlatform\WooCommerce\InventoryProductProjectionPlan;
	use TCGStorePlatform\WooCommerce\WooCommerceInventoryProductWriter;

	final class WooCommerceInventoryProductWriterTest extends TestCase {
		public function test_writer_creates_serialized_product_payload_through_woocommerce_crud(): void {
			$writer = new WooCommerceInventoryProductWriter();
			$result = $writer(
				array(
					'operation' => 'create_product',
					'product'   => array(
						'name'           => 'Pokemon - Charizard',
						'status'         => 'publish',
						'sku'            => 'PKM-BASE-004',
						'regular_price'  => '125.00',
						'manage_stock'   => true,
						'stock_quantity' => 1,
						'stock_status'   => 'instock',
						'category_slugs' => array( 'singles', 'pokemon' ),
						'meta_data'      => array(
							array(
								'key'   => '_tcg_inventory_public_id',
								'value' => 'card-public-42',
							),
						),
					),
				),
				InventoryProductProjectionPlan::ready( 'ready', 'key', array(), array(), true ),
				0
			);
			$product = $GLOBALS['tcg_test_last_saved_product'];

			$this->assert_same( 'written', $result['status'] );
			$this->assert_same( 2468, $result['product_id'] );
			$this->assert_same( 'Pokemon - Charizard', $product->values['name'] );
			$this->assert_same( 'PKM-BASE-004', $product->values['sku'] );
			$this->assert_same( 1, $product->values['stock_quantity'] );
			$this->assert_same( array( 101, 102 ), $product->values['category_ids'] );
			$this->assert_same( 'card-public-42', $product->meta['_tcg_inventory_public_id'] );
		}
	}
}
