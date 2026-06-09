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

		$contracts = InventorySearchShortcode::hook_contracts();
		$map       = array();

		foreach ( $contracts as $contract ) {
			$map[ $contract['type'] . ' ' . $contract['hook'] ] = $contract['callback'];
		}

		$this->assert_same( 'render_inventory_search', $map['shortcode tcg_inventory_search'] );
		$this->assert_same( 'enqueue_assets', $map['action wp_enqueue_scripts'] );
		$this->assert_same( 'mark_inventory_pages_uncacheable', $map['action wp'] );
		$this->assert_same( 'mark_inventory_pages_uncacheable', $map['action send_headers'] );
		$this->assert_same( 'filter_inventory_no_cache_headers', $map['filter wp_headers'] );
	}

	public function test_inventory_query_parameters_mark_page_as_inventory_context(): void {
		$previous_get = $_GET;
		$_GET         = array(
			'tcg_inventory_q' => 'Charizard',
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
		$this->assert_contains( "tcg_inventory_page_size", $source );
		$this->assert_contains( '.tcg-public-inventory {', $source );
		$this->assert_contains( 'BrandingSettings::css_variable_string( Settings::all() )', $source );
	}
}
