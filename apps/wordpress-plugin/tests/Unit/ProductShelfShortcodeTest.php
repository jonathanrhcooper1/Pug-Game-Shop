<?php
/**
 * Public product shelf shortcode tests.
 *
 * @package TCGStorePlatform
 */

namespace TCGStorePlatform\Tests\Unit;

use TCGStorePlatform\PublicSite\ProductShelfShortcode;
use TCGStorePlatform\Tests\TestCase;

final class ProductShelfShortcodeTest extends TestCase {
	public function test_shortcode_contract_registers_product_shelf(): void {
		$this->assert_same( 'tcg_product_shelf', ProductShelfShortcode::SHORTCODE );
		$this->assert_same( 'tcg-store-public-inventory', ProductShelfShortcode::STYLE_HANDLE );

		$contracts = ProductShelfShortcode::hook_contracts();
		$map       = array();

		foreach ( $contracts as $contract ) {
			$map[ $contract['type'] . ' ' . $contract['hook'] ] = $contract['callback'];
		}

		$this->assert_same( 'render_product_shelf', $map['shortcode tcg_product_shelf'] );
		$this->assert_same( 'enqueue_assets', $map['action wp_enqueue_scripts'] );
	}

	public function test_empty_shelf_renders_connected_storefront_state(): void {
		$shortcode = new ProductShelfShortcode(
			static fn (): array => array()
		);

		$html = $shortcode->render_product_shelf(
			array(
				'category' => 'sealed-products',
				'label'    => 'Sealed Products',
				'limit'    => '24',
			)
		);

		$this->assert_contains( 'tcg-product-shelf', $html );
		$this->assert_contains( 'data-category="sealed-products"', $html );
		$this->assert_contains( 'Sealed Products shelf ready for products', $html );
		$this->assert_contains( 'No sealed products are live online yet.', $html );
		$this->assert_contains( 'This shelf is connected to WooCommerce', $html );
		$this->assert_contains( '/shop-singles/', $html );
		$this->assert_contains( '/contact/', $html );
	}

	public function test_shelf_renders_products_from_provider(): void {
		$shortcode = new ProductShelfShortcode(
			static fn (): array => array(
				array(
					'name'        => 'Pug Playmat',
					'url'         => '/product/pug-playmat/',
					'image_html'  => '<img src="/uploads/pug-playmat.webp" alt="Pug Playmat" />',
					'price_html'  => '<span class="amount">$24.99</span>',
					'stock_label' => '4 available',
					'summary'     => 'Table-ready stitched mat.',
				),
			)
		);

		$html = $shortcode->render_product_shelf(
			array(
				'category' => 'accessories',
				'label'    => 'Accessories',
				'limit'    => '12',
			)
		);

		$this->assert_contains( 'Pug Playmat', $html );
		$this->assert_contains( '/product/pug-playmat/', $html );
		$this->assert_contains( '$24.99', $html );
		$this->assert_contains( '4 available', $html );
		$this->assert_contains( 'View product', $html );
		$this->assert_not_contains( 'No accessories are live online yet.', $html );
	}

	public function test_shelf_replaces_woocommerce_placeholder_images_with_branded_tile(): void {
		$shortcode = new ProductShelfShortcode(
			static fn (): array => array(
				array(
					'name'        => 'Pokemon Booster Bundle',
					'url'         => '/product/pokemon-booster-bundle/',
					'image_html'  => '<img src="/wp-content/plugins/woocommerce/assets/images/placeholder.png" class="woocommerce-placeholder" alt="Placeholder" />',
					'price_html'  => '<span class="amount">$29.99</span>',
					'stock_label' => '12 available',
					'summary'     => 'Sealed Pokemon packs.',
				),
			)
		);

		$html = $shortcode->render_product_shelf(
			array(
				'category' => 'sealed-products',
				'label'    => 'Sealed Products',
				'limit'    => '12',
			)
		);

		$this->assert_contains( 'tcg-product-shelf__image-placeholder', $html );
		$this->assert_contains( 'Cards, games, and more', $html );
		$this->assert_not_contains( 'woocommerce-placeholder', $html );
	}

	public function test_public_inventory_css_contains_product_shelf_layout(): void {
		$css = (string) file_get_contents( dirname( __DIR__, 2 ) . '/assets/css/public-inventory.css' );

		$this->assert_contains( '.tcg-product-shelf__grid', $css );
		$this->assert_contains( '.tcg-product-shelf__empty', $css );
		$this->assert_contains( '.tcg-product-shelf__button', $css );
		$this->assert_contains( 'grid-template-columns: repeat(auto-fit, minmax(min(100%, 240px), 1fr))', $css );
	}
}
