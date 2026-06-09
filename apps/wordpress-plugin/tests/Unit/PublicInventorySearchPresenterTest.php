<?php
/**
 * Public inventory search presenter tests.
 *
 * @package TCGStorePlatform
 */

namespace TCGStorePlatform\Tests\Unit;

use TCGStorePlatform\Inventory\InventorySearchRequest;
use TCGStorePlatform\PublicSite\InventorySearchPresenter;
use TCGStorePlatform\Tests\TestCase;

final class PublicInventorySearchPresenterTest extends TestCase {
	public function test_presenter_groups_public_inventory_without_private_fields(): void {
		$request   = new InventorySearchRequest( 'charizard', 'pokemon', array( 'available' ), null, 'public', 'relevance', 1, 24 );
		$presenter = new InventorySearchPresenter();
		$payload   = $presenter->present(
			$request,
			array(
				$this->row( 1001, 'secret-barcode-a' ),
				$this->row( 1002, 'secret-barcode-b' ),
			),
			2,
			array(
				'settings'             => array(
					'branding' => array(
						'company_name'       => 'The Pug Game Shop',
						'company_short_name' => 'The Pug',
						'logo_url'           => 'https://example.test/logo.png',
						'primary_color'      => '#0F5F8F',
						'accent_color'       => '#FFD044',
					),
				),
				'product_url_callback' => static fn ( mixed $product_id ): string => 1001 === (int) $product_id ? 'https://example.test/product/charizard/' : '',
			)
		);
		$json      = (string) json_encode( $payload );

		$this->assert_same( 'public_inventory_search', $payload['resource'] );
		$this->assert_same( 1, $payload['page'] );
		$this->assert_same( 24, $payload['page_size'] );
		$this->assert_same( 1, $payload['total_pages'] );
		$this->assert_false( $payload['has_next_page'] );
		$this->assert_same( 1, count( $payload['groups'] ) );
		$this->assert_same( 2, $payload['groups'][0]['quantity'] );
		$this->assert_same( '125.00', $payload['groups'][0]['price'] );
		$this->assert_same( 'https://example.test/product/charizard/', $payload['groups'][0]['product_url'] );
		$this->assert_not_contains( 'secret-barcode', $json );
		$this->assert_not_contains( 'inventory_id', $json );
		$this->assert_not_contains( 'cost', $json );
	}

	public function test_rendered_html_contains_search_form_card_art_stock_and_action(): void {
		$request   = new InventorySearchRequest( 'charizard', 'pokemon', array( 'available' ), null, 'public', 'relevance', 1, 24 );
		$presenter = new InventorySearchPresenter();
		$payload   = $presenter->present(
			$request,
			array(
				$this->row( 1001, 'secret-barcode-a' ),
				$this->row( 1002, 'secret-barcode-b' ),
			),
			50,
			array(
				'product_url_callback' => static fn (): string => 'https://example.test/product/charizard/',
			)
		);

		$html = $presenter->render_html( $payload );

		$this->assert_contains( 'Browse The Pug inventory', $html );
		$this->assert_contains( 'Search Inventory', $html );
		$this->assert_contains( 'tcg_inventory_cache_bust', $html );
		$this->assert_contains( 'tcg_inventory_page', $html );
		$this->assert_contains( 'tcg_inventory_page_size', $html );
		$this->assert_contains( 'Showing 1-2 of 50 matching items', $html );
		$this->assert_contains( 'Page 1 of 3', $html );
		$this->assert_contains( 'Next page', $html );
		$this->assert_contains( 'data-tcg-inventory-cache-bust', $html );
		$this->assert_contains( 'Date.now()', $html );
		$this->assert_contains( 'Charizard', $html );
		$this->assert_contains( 'tcg-public-inventory__media', $html );
		$this->assert_contains( 'tcg-public-inventory__chips', $html );
		$this->assert_contains( 'Base Set / 4/102 / NM / Holo', $html );
		$this->assert_contains( '125.00 USD', $html );
		$this->assert_contains( '2 in stock', $html );
		$this->assert_contains( 'https://images.example.test/charizard.png', $html );
		$this->assert_contains( 'View card', $html );
		$this->assert_not_contains( 'secret-barcode', $html );
	}

	/**
	 * @return array<string, mixed>
	 */
	private function row( int $product_id, string $barcode ): array {
		return array(
			'inventory_id'           => 55,
			'public_id'              => 'inv-public',
			'game'                   => 'pokemon',
			'card_name'              => 'Charizard',
			'set_name'               => 'Base Set',
			'set_code'               => 'BASE',
			'card_number'            => '4',
			'printed_number'         => '4/102',
			'variant'                => 'Holo',
			'finish'                 => 'Foil',
			'condition_code'         => 'NM',
			'barcode'                => $barcode,
			'cost'                   => '60.0000',
			'sale_price'             => '125.0000',
			'sale_currency'          => 'USD',
			'front_image_remote_url' => 'https://images.example.test/charizard.png',
			'woocommerce_product_id' => $product_id,
		);
	}
}
