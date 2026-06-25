<?php
/**
 * Inventory search request parser tests.
 *
 * @package TCGStorePlatform
 */

namespace TCGStorePlatform\Tests\Unit;

use TCGStorePlatform\Inventory\InventorySearchRequestParser;
use TCGStorePlatform\Inventory\InventoryStatus;
use TCGStorePlatform\Tests\TestCase;

final class InventorySearchRequestParserTest extends TestCase {
	public function test_parser_builds_normalized_inventory_search_request(): void {
		$result = ( new InventorySearchRequestParser() )->parse(
			array(
				'q'           => '  Pikachu  ',
				'game'        => 'Pokemon',
				'set'         => '  Base Set  ',
				'raw_or_graded' => ' Graded ',
				'status'      => 'available,reserved,available',
				'location_id' => '4',
				'visibility'  => 'staff',
				'sort'        => 'price_asc',
				'page'        => '2',
				'page_size'   => '40',
				'updated_after' => '2026-06-25T12:30:00Z',
			)
		);

		$this->assert_true( $result->is_valid() );

		$request = $result->request();

		$this->assert_true( null !== $request );
		$this->assert_same( 'Pikachu', $request->query() );
		$this->assert_same( 'pokemon', $request->game() );
		$this->assert_same( 'Base Set', $request->set_filter() );
		$this->assert_same( 'graded', $request->raw_or_graded() );
		$this->assert_same( array( InventoryStatus::AVAILABLE, InventoryStatus::RESERVED ), $request->statuses() );
		$this->assert_same( 4, $request->location_id() );
		$this->assert_same( 'staff', $request->visibility() );
		$this->assert_same( 'price_asc', $request->sort() );
		$this->assert_same( 2, $request->page() );
		$this->assert_same( 40, $request->page_size() );
		$this->assert_same( '2026-06-25 12:30:00', $request->updated_after() );
	}

	public function test_parser_defaults_empty_search_to_public_first_page(): void {
		$result = ( new InventorySearchRequestParser() )->parse( array() );

		$this->assert_true( $result->is_valid() );

		$request = $result->request();

		$this->assert_true( null !== $request );
		$this->assert_same( '', $request->query() );
		$this->assert_same( '', $request->game() );
		$this->assert_same( array(), $request->statuses() );
		$this->assert_same( null, $request->location_id() );
		$this->assert_same( 'public', $request->visibility() );
		$this->assert_same( 'relevance', $request->sort() );
		$this->assert_same( 1, $request->page() );
		$this->assert_same( 25, $request->page_size() );
	}

	public function test_parser_rejects_invalid_filters_and_caps_page_size(): void {
		$result = ( new InventorySearchRequestParser() )->parse(
			array(
				'q'           => str_repeat( 'x', 121 ),
				'set_filter'  => str_repeat( 's', 121 ),
				'product_type' => 'sealed',
				'game'        => 'bad game',
				'status'      => array( 'available', 'lost' ),
				'location_id' => 'store',
				'visibility'  => 'private',
				'sort'        => 'random',
				'page'        => 0,
				'page_size'   => 500,
				'updated_after' => 'not a date',
			)
		);

		$this->assert_false( $result->is_valid() );
		$this->assert_true( in_array( 'query_too_long', $result->errors(), true ) );
		$this->assert_true( in_array( 'set_filter_too_long', $result->errors(), true ) );
		$this->assert_true( in_array( 'raw_or_graded_invalid', $result->errors(), true ) );
		$this->assert_true( in_array( 'game_invalid', $result->errors(), true ) );
		$this->assert_true( in_array( 'status_invalid', $result->errors(), true ) );
		$this->assert_true( in_array( 'location_id_invalid', $result->errors(), true ) );
		$this->assert_true( in_array( 'visibility_invalid', $result->errors(), true ) );
		$this->assert_true( in_array( 'sort_invalid', $result->errors(), true ) );
		$this->assert_true( in_array( 'page_invalid', $result->errors(), true ) );
		$this->assert_true( in_array( 'page_size_too_large', $result->errors(), true ) );
		$this->assert_true( in_array( 'updated_after_invalid', $result->errors(), true ) );
	}
}
