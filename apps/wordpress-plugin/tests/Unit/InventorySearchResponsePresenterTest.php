<?php
/**
 * Inventory search response presenter tests.
 *
 * @package TCGStorePlatform
 */

namespace TCGStorePlatform\Tests\Unit;

use TCGStorePlatform\Inventory\InventorySearchRequest;
use TCGStorePlatform\Inventory\InventorySearchResponsePresenter;
use TCGStorePlatform\Inventory\InventoryStatus;
use TCGStorePlatform\Tests\TestCase;

final class InventorySearchResponsePresenterTest extends TestCase {
	public function test_public_response_redacts_staff_only_inventory_fields(): void {
		$response = InventorySearchResponsePresenter::present(
			new InventorySearchRequest( 'Pikachu', 'pokemon', array(), null, 'public', 'relevance', 1, 12 ),
			array( $this->row() ),
			20
		);

		$item = $response['items'][0];
		$meta = $response['meta'];

		$this->assert_same( 'card-public-1', $item['public_id'] );
		$this->assert_same( '49.99', $item['sale_price'] );
		$this->assert_true( $item['reserve_eligible'] );
		$this->assert_false( isset( $item['barcode'] ) );
		$this->assert_false( isset( $item['sku'] ) );
		$this->assert_false( isset( $item['cost'] ) );
		$this->assert_false( isset( $item['staff_notes'] ) );
		$this->assert_same( 1, $meta['page'] );
		$this->assert_true( $meta['has_more'] );
		$this->assert_true( $meta['public_redaction'] );
	}

	public function test_staff_response_includes_operational_inventory_fields(): void {
		$response = InventorySearchResponsePresenter::present(
			new InventorySearchRequest( '', '', array( InventoryStatus::AVAILABLE ), 3, 'staff', 'updated_desc', 2, 10 ),
			array( $this->row() ),
			25
		);

		$item = $response['items'][0];
		$meta = $response['meta'];

		$this->assert_same( 501, $item['inventory_id'] );
		$this->assert_same( 'BC-0001', $item['barcode'] );
		$this->assert_same( 'SKU-0001', $item['sku'] );
		$this->assert_same( '20.00', $item['cost'] );
		$this->assert_same( '45.00', $item['minimum_sale_price'] );
		$this->assert_true( $item['price_floor_hit'] );
		$this->assert_same( 3, $item['location_id'] );
		$this->assert_same( 'case note', $item['staff_notes'] );
		$this->assert_same( 9, $item['row_version'] );
		$this->assert_true( $meta['has_more'] );
		$this->assert_false( $meta['public_redaction'] );
	}

	/**
	 * @return array<string, mixed>
	 */
	private function row(): array {
		return array(
			'inventory_id'           => 501,
			'public_id'              => 'card-public-1',
			'game'                   => 'pokemon',
			'card_name'              => 'Pikachu',
			'set_name'               => 'Base Set',
			'set_code'               => 'BS',
			'card_number'            => '58',
			'printed_number'         => '58/102',
			'year'                   => 1999,
			'rarity'                 => 'Common',
			'variant'                => 'standard',
			'finish'                 => 'holo',
			'parallel_name'          => '',
			'language'               => 'English',
			'raw_or_graded'          => 'raw',
			'condition_code'         => 'NM',
			'grading_company'        => '',
			'grade'                  => '',
			'cert_number'            => '',
			'barcode'                => 'BC-0001',
			'sku'                    => 'SKU-0001',
			'cost'                   => '20.0000',
			'cost_currency'          => 'USD',
			'market_price'           => '48.1000',
			'suggested_price'        => '52.9900',
			'sale_price'             => '49.9900',
			'minimum_sale_price'     => '45.0000',
			'sale_currency'          => 'USD',
			'price_lock'             => 0,
			'price_floor_hit'        => 1,
			'location_id'            => 3,
			'online_visibility'      => 'visible',
			'kiosk_visibility'       => 'visible',
			'pos_visibility'         => 'visible',
			'status'                 => InventoryStatus::AVAILABLE,
			'front_image_remote_url' => 'https://example.test/front.jpg',
			'back_image_remote_url'  => 'https://example.test/back.jpg',
			'notes'                  => 'public note',
			'staff_notes'            => 'case note',
			'updated_at'             => '2026-06-07 12:00:00',
			'row_version'            => 9,
		);
	}
}
