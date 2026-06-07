<?php
/**
 * Inventory search SQL-template builder tests.
 *
 * @package TCGStorePlatform
 */

namespace TCGStorePlatform\Tests\Unit;

use TCGStorePlatform\Inventory\InventorySearchQueryBuilder;
use TCGStorePlatform\Inventory\InventorySearchQueryPlan;
use TCGStorePlatform\Inventory\InventorySearchQueryPlanner;
use TCGStorePlatform\Inventory\InventorySearchRequest;
use TCGStorePlatform\Inventory\InventoryStatus;
use TCGStorePlatform\Tests\TestCase;

final class InventorySearchQueryBuilderTest extends TestCase {
	public function test_public_search_builds_select_and_count_templates_without_execution(): void {
		$build = ( new InventorySearchQueryBuilder() )->build(
			( new InventorySearchQueryPlanner() )->plan(
				new InventorySearchRequest(
					'Charizard',
					'pokemon',
					array(),
					null,
					'public',
					'price_desc',
					2,
					24
				),
				'wp_'
			)
		);
		$query = $build->query();
		$audit = $build->audit_payload();

		$this->assert_true( $build->is_valid() );
		$this->assert_same( 'wp_tcg_inventory_items', $build->table_name() );
		$this->assert_contains( 'SELECT `inventory_id`, `public_id`, `game`, `card_name`', $query['select_sql_template'] );
		$this->assert_contains( 'FROM `wp_tcg_inventory_items`', $query['select_sql_template'] );
		$this->assert_contains( '(`card_name` LIKE %s OR `set_name` LIKE %s OR `set_code` LIKE %s OR `card_number` LIKE %s)', $query['select_sql_template'] );
		$this->assert_contains( '`game` = %s', $query['select_sql_template'] );
		$this->assert_contains( '`status` IN (%s)', $query['select_sql_template'] );
		$this->assert_contains( '`online_visibility` = %s', $query['select_sql_template'] );
		$this->assert_contains( 'ORDER BY `sale_price` DESC, `inventory_id` ASC LIMIT %d OFFSET %d', $query['select_sql_template'] );
		$this->assert_contains( 'SELECT COUNT(*) FROM `wp_tcg_inventory_items`', $query['count_sql_template'] );
		$this->assert_same(
			array( '%Charizard%', '%Charizard%', '%Charizard%', '%Charizard%', 'pokemon', InventoryStatus::AVAILABLE, 'visible', 24, 24 ),
			$query['select_prepare_args']
		);
		$this->assert_same(
			array( '%Charizard%', '%Charizard%', '%Charizard%', '%Charizard%', 'pokemon', InventoryStatus::AVAILABLE, 'visible' ),
			$query['count_prepare_args']
		);
		$this->assert_same( 9, $build->select_prepare_arg_count() );
		$this->assert_same( 7, $build->count_prepare_arg_count() );
		$this->assert_true( $query['read_execution_deferred'] );
		$this->assert_true( $query['inventory_repository_deferred'] );
		$this->assert_true( $query['square_inventory_projection_deferred'] );
		$this->assert_same( 'inventory_search_query_sql_planned', $audit['action'] );
		$this->assert_true( $audit['sql_query_ready'] );
	}

	public function test_staff_search_builds_scan_columns_statuses_and_location_filters(): void {
		$build = ( new InventorySearchQueryBuilder() )->build(
			( new InventorySearchQueryPlanner() )->plan(
				new InventorySearchRequest(
					'CASE-7',
					'',
					array( InventoryStatus::RESERVED, InventoryStatus::SOLD ),
					4,
					'staff',
					'updated_desc',
					1,
					50
				),
				'wp_'
			)
		);
		$query = $build->query();

		$this->assert_true( $build->is_valid() );
		$this->assert_contains( '`barcode` LIKE %s', $query['select_sql_template'] );
		$this->assert_contains( '`sku` LIKE %s', $query['select_sql_template'] );
		$this->assert_contains( '`cert_number` LIKE %s', $query['select_sql_template'] );
		$this->assert_contains( '`status` IN (%s, %s)', $query['select_sql_template'] );
		$this->assert_contains( '`location_id` = %d', $query['select_sql_template'] );
		$this->assert_contains( 'ORDER BY `updated_at` DESC, `inventory_id` DESC LIMIT %d OFFSET %d', $query['select_sql_template'] );
		$this->assert_same(
			array( '%CASE-7%', '%CASE-7%', '%CASE-7%', '%CASE-7%', '%CASE-7%', '%CASE-7%', '%CASE-7%', InventoryStatus::RESERVED, InventoryStatus::SOLD, 4, 50, 0 ),
			$query['select_prepare_args']
		);
	}

	public function test_unfiltered_hidden_search_builds_visibility_only_count_query(): void {
		$build = ( new InventorySearchQueryBuilder() )->build(
			( new InventorySearchQueryPlanner() )->plan(
				new InventorySearchRequest( '', 'lorcana', array(), null, 'hidden', 'name_asc', 1, 25 ),
				'wp_'
			)
		);
		$query = $build->query();

		$this->assert_true( $build->is_valid() );
		$this->assert_contains( '`game` = %s', $query['select_sql_template'] );
		$this->assert_contains( '`online_visibility` = %s', $query['select_sql_template'] );
		$this->assert_not_contains( 'LIKE', $query['select_sql_template'] );
		$this->assert_same( array( 'lorcana', 'hidden', 25, 0 ), $query['select_prepare_args'] );
		$this->assert_same( array( 'lorcana', 'hidden' ), $query['count_prepare_args'] );
	}

	public function test_builder_rejects_invalid_and_tampered_query_plans(): void {
		$invalid = ( new InventorySearchQueryBuilder() )->build(
			( new InventorySearchQueryPlanner() )->plan(
				new InventorySearchRequest( '', '', array(), null, 'public', 'relevance', 1, 25 ),
				'wp;drop_'
			)
		);

		$this->assert_false( $invalid->is_valid() );
		$this->assert_true( in_array( 'inventory_search_query_plan_invalid', $invalid->errors(), true ) );
		$this->assert_true( in_array( 'table_prefix_invalid', $invalid->errors(), true ) );
		$this->assert_true( in_array( 'table_name_invalid', $invalid->errors(), true ) );

		$tampered = ( new InventorySearchQueryBuilder() )->build(
			InventorySearchQueryPlan::accepted(
				'wp_',
				'wp_users',
				array( 'visibility' => 'private' ),
				array(
					'visibility_context' => 'private',
					'text_query'         => array(
						'value'   => 'bad',
						'like'    => '%bad%',
						'columns' => array( 'user_pass' ),
					),
					'status_in'          => array( 'lost' ),
					'location_id'        => -1,
					'online_visibility'  => 'public',
					'unsafe'             => 'drop',
				),
				array( 'user_pass' ),
				array( 'user_pass' => 'SIDEWAYS' ),
				500,
				-1
			)
		);
		$errors   = $tampered->errors();

		$this->assert_false( $tampered->is_valid() );
		$this->assert_true( in_array( 'table_unsupported', $errors, true ) );
		$this->assert_true( in_array( 'selected_columns_unsupported', $errors, true ) );
		$this->assert_true( in_array( 'selected_columns_invalid', $errors, true ) );
		$this->assert_true( in_array( 'order_by_unsupported', $errors, true ) );
		$this->assert_true( in_array( 'order_by_invalid', $errors, true ) );
		$this->assert_true( in_array( 'limit_unsupported', $errors, true ) );
		$this->assert_true( in_array( 'offset_unsupported', $errors, true ) );
		$this->assert_true( in_array( 'where_key_unsupported', $errors, true ) );
		$this->assert_true( in_array( 'visibility_context_invalid', $errors, true ) );
		$this->assert_true( in_array( 'text_query_columns_invalid', $errors, true ) );
		$this->assert_true( in_array( 'status_in_invalid', $errors, true ) );
		$this->assert_true( in_array( 'location_id_invalid', $errors, true ) );
		$this->assert_true( in_array( 'online_visibility_invalid', $errors, true ) );
	}
}
