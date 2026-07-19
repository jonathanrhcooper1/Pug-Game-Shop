<?php
/**
 * Inventory search query planner tests.
 *
 * @package TCGStorePlatform
 */

namespace TCGStorePlatform\Tests\Unit;

use TCGStorePlatform\Inventory\InventorySearchQueryPlanner;
use TCGStorePlatform\Inventory\InventorySearchRequest;
use TCGStorePlatform\Inventory\InventoryStatus;
use TCGStorePlatform\Tests\TestCase;

final class InventorySearchQueryPlannerTest extends TestCase {
	public function test_public_search_defaults_to_visible_available_inventory_without_execution(): void {
		$request = new InventorySearchRequest(
			'Charizard',
			'pokemon',
			array(),
			null,
			'public',
			'price_desc',
			2,
			24,
			'Base',
			'graded'
		);

		$plan     = ( new InventorySearchQueryPlanner() )->plan( $request, 'wp_' );
		$contract = $plan->query_contract();
		$where    = $plan->where();
		$audit    = $plan->audit_payload();

		$this->assert_true( $plan->is_valid() );
		$this->assert_same( 'wp_tcg_inventory_items', $plan->table_name() );
		$this->assert_same( array( InventoryStatus::AVAILABLE ), $plan->filters()['statuses'] );
		$this->assert_same( array( InventoryStatus::AVAILABLE ), $where['status_in'] );
		$this->assert_same( 'visible', $where['online_visibility'] );
		$this->assert_same( array( 'card_name', 'set_name', 'set_code', 'card_number' ), $where['text_query']['columns'] );
		$this->assert_same( 'Base', $plan->filters()['set_filter'] );
		$this->assert_same( 'graded', $plan->filters()['raw_or_graded'] );
		$this->assert_same( array( 'set_name', 'set_code' ), $where['set_filter']['columns'] );
		$this->assert_same( 'graded', $where['raw_or_graded'] );
		$this->assert_same( 'DESC', $plan->order_by()['sale_price'] );
		$this->assert_same( 24, $plan->limit() );
		$this->assert_same( 24, $plan->offset() );
		$this->assert_true( in_array( 'sale_price', $plan->selected_columns(), true ) );
		$this->assert_true( $contract['read_execution_deferred'] );
		$this->assert_true( $contract['square_inventory_projection_deferred'] );
		$this->assert_same( 'inventory_search_query_planned', $audit['action'] );
		$this->assert_true( $audit['woocommerce_projection_deferred'] );
	}

	public function test_staff_search_keeps_requested_statuses_and_barcode_lookup_columns(): void {
		$request = new InventorySearchRequest(
			'CASE-7',
			'',
			array( InventoryStatus::RESERVED, InventoryStatus::SOLD ),
			4,
			'staff',
			'updated_desc',
			1,
			50
		);

		$plan  = ( new InventorySearchQueryPlanner() )->plan( $request, 'wp_' );
		$where = $plan->where();

		$this->assert_true( $plan->is_valid() );
		$this->assert_same( array( InventoryStatus::RESERVED, InventoryStatus::SOLD ), $where['status_in'] );
		$this->assert_same( 4, $where['location_id'] );
		$this->assert_false( isset( $where['online_visibility'] ) );
		$this->assert_true( in_array( 'barcode', $where['text_query']['columns'], true ) );
		$this->assert_true( in_array( 'sku', $where['text_query']['columns'], true ) );
		$this->assert_same( 'DESC', $plan->order_by()['updated_at'] );
	}

	public function test_hidden_visibility_scopes_online_visibility_without_default_status(): void {
		$request = new InventorySearchRequest(
			'',
			'lorcana',
			array(),
			null,
			'hidden',
			'name_asc',
			1,
			25
		);

		$plan  = ( new InventorySearchQueryPlanner() )->plan( $request, 'wp_' );
		$where = $plan->where();

		$this->assert_true( $plan->is_valid() );
		$this->assert_same( 'lorcana', $where['game'] );
		$this->assert_same( 'hidden', $where['online_visibility'] );
		$this->assert_false( isset( $where['status_in'] ) );
	}

	public function test_planner_rejects_invalid_table_prefix(): void {
		$request = new InventorySearchRequest( '', '', array(), null, 'public', 'relevance', 1, 25 );
		$plan    = ( new InventorySearchQueryPlanner() )->plan( $request, 'wp;drop_' );

		$this->assert_false( $plan->is_valid() );
		$this->assert_same( '', $plan->table_name() );
		$this->assert_true( in_array( 'table_prefix_invalid', $plan->errors(), true ) );
		$this->assert_same( array(), $plan->selected_columns() );
	}
}
