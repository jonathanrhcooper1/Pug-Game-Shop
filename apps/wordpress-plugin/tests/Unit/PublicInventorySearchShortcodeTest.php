<?php
/**
 * Public inventory search shortcode tests.
 *
 * @package TCGStorePlatform
 */

namespace TCGStorePlatform\Tests\Unit;

use TCGStorePlatform\PublicSite\InventorySearchShortcode;
use TCGStorePlatform\Tests\TestCase;

final class PublicInventorySearchShortcodeTest extends TestCase {
	public function test_shortcode_contract_registers_public_inventory_search(): void {
		$this->assert_same( 'tcg_inventory_search', InventorySearchShortcode::SHORTCODE );
		$this->assert_same( 'tcg-store-public-inventory', InventorySearchShortcode::STYLE_HANDLE );
		$this->assert_same( 'tcg-store-public-storefront-links', InventorySearchShortcode::SCRIPT_HANDLE );

		$contracts = InventorySearchShortcode::hook_contracts();
		$map       = array();

		foreach ( $contracts as $contract ) {
			$map[ $contract['type'] . ' ' . $contract['hook'] ] = $contract['callback'];
		}

		$this->assert_same( 'render_inventory_search', $map['shortcode tcg_inventory_search'] );
		$this->assert_same( 'enqueue_assets', $map['action wp_enqueue_scripts'] );
		$this->assert_same( 'mark_inventory_pages_uncacheable', $map['action wp'] );
		$this->assert_same( 'mark_inventory_pages_uncacheable', $map['action send_headers'] );
		$this->assert_same( 'redirect_legacy_shop_page', $map['action template_redirect'] );
		$this->assert_same( 'filter_inventory_no_cache_headers', $map['filter wp_headers'] );
		$this->assert_same( 'return_to_singles_shop_url', $map['filter woocommerce_return_to_shop_redirect'] );
	}

	public function test_inventory_query_parameters_mark_page_as_inventory_context(): void {
		$previous_get = $_GET;
		$_GET         = array(
			'tcg_inventory_set' => 'Base Set',
		);

		try {
			$method = new \ReflectionMethod( InventorySearchShortcode::class, 'is_inventory_page_context' );
			$method->setAccessible( true );

			$this->assert_true( $method->invoke( new InventorySearchShortcode() ) );
		} finally {
			$_GET = $previous_get;
		}
	}

	public function test_inventory_query_filters_headers_to_no_store(): void {
		$previous_get = $_GET;
		$_GET         = array(
			'tcg_inventory_q' => 'Charizard',
		);

		try {
			$headers = ( new InventorySearchShortcode() )->filter_inventory_no_cache_headers(
				array(
					'Cache-Control' => 'public, max-age=2678400',
				)
			);
		} finally {
			$_GET = $previous_get;
		}

		$this->assert_same( 'no-store, no-cache, must-revalidate, max-age=0', $headers['Cache-Control'] );
		$this->assert_same( 'no-store', $headers['Surrogate-Control'] );
		$this->assert_same( 'bypass', $headers['X-TCG-Inventory-Cache'] );
	}

	public function test_storefront_pages_are_uncacheable_inventory_contexts(): void {
		$source = (string) file_get_contents( dirname( __DIR__, 2 ) . '/src/PublicSite/InventorySearchShortcode.php' );

		$this->assert_same(
			array(
				'shop-singles',
				'shop-sealed-products',
				'shop-graded-cards',
				'shop-accessories',
				'card-inventory',
				'events',
			),
			InventorySearchShortcode::STOREFRONT_PAGE_SLUGS
		);
		$this->assert_contains( 'is_page( self::STOREFRONT_PAGE_SLUGS )', $source );
		$this->assert_contains( "function_exists( 'is_front_page' ) && is_front_page()", $source );
		$this->assert_contains( 'ProductShelfShortcode::SHORTCODE', $source );
		$this->assert_contains( 'X-TCG-Inventory-Cache', $source );
	}

	public function test_invalid_filters_render_adjustment_notice_without_repository_lookup(): void {
		global $wpdb;

		$previous = $wpdb ?? null;
		$wpdb     = (object) array(
			'prefix' => 'wp_',
		);

		try {
			$html = ( new InventorySearchShortcode() )->render_inventory_search(
				array(
					'game' => 'bad game!',
				)
			);
		} finally {
			$wpdb = $previous;
		}

		$this->assert_contains( 'tcg-public-inventory', $html );
		$this->assert_contains( 'Search filters need to be adjusted.', $html );
	}

	public function test_shortcode_passes_saved_settings_to_presenter_paths(): void {
		$source = (string) file_get_contents( dirname( __DIR__, 2 ) . '/src/PublicSite/InventorySearchShortcode.php' );

		$this->assert_contains( "'settings' => Settings::all()", $source );
		$this->assert_contains( "tcg_inventory_page", $source );
		$this->assert_contains( "tcg_inventory_set", $source );
		$this->assert_contains( "tcg_inventory_type", $source );
		$this->assert_contains( "'raw_or_graded' => 'raw'", $source );
		$this->assert_contains( "tcg_inventory_page_size", $source );
		$this->assert_contains( '.tcg-public-inventory {', $source );
		$this->assert_contains( 'BrandingSettings::css_variable_string( Settings::all() )', $source );
		$this->assert_contains( 'dark-storefront', $source );
		$this->assert_contains( 'assets/js/public-storefront-links.js', $source );
	}

	public function test_public_storefront_links_script_rewrites_theme_footer_shop_links(): void {
		$script = (string) file_get_contents( dirname( __DIR__, 2 ) . '/assets/js/public-storefront-links.js' );

		$this->assert_contains( '/shop-singles/', $script );
		$this->assert_contains( '/shop-sealed-products/', $script );
		$this->assert_contains( '/shop-graded-cards/', $script );
		$this->assert_contains( '/shop-accessories/', $script );
		$this->assert_contains( 'rewriteFooterShopLinks', $script );
		$this->assert_contains( 'rewriteHeaderShopLinks', $script );
		$this->assert_contains( 'rewriteLegacyShopLinks', $script );
		$this->assert_contains( 'isShopLink', $script );
		$this->assert_contains( 'enter shop', $script );
	}

	public function test_public_inventory_css_matches_dark_storefront_theme(): void {
		$css = (string) file_get_contents( dirname( __DIR__, 2 ) . '/assets/css/public-inventory.css' );

		$this->assert_contains( 'body.page .site-main.content-shell:has(.tcg-public-inventory)', $css );
		$this->assert_contains( '.tcg-public-inventory__empty-actions', $css );
		$this->assert_contains( '.tcg-storefront-shelf__hero', $css );
		$this->assert_contains( '.tcg-storefront-shelf__hero-copy', $css );
		$this->assert_contains( '.tcg-storefront-shelf__badge', $css );
		$this->assert_contains( '.tcg-storefront-shelf .tcg-public-inventory__hero', $css );
		$this->assert_contains( '.tcg-public-inventory__quick-filters', $css );
		$this->assert_contains( 'box-shadow: none', $css );
		$this->assert_contains( 'width: 100%;', $css );
		$this->assert_contains( 'max-width: 100%;', $css );
		$this->assert_contains( 'body.page .content-card:has(.tcg-public-inventory)', $css );
		$this->assert_contains( '.tcg-public-inventory__empty-actions a:visited', $css );
		$this->assert_contains( 'color: #05080b !important', $css );
		$this->assert_contains( 'color: #f8fbff', $css );
		$this->assert_contains( 'rgba(246, 198, 53, 0.34)', $css );
	}
}
