<?php
/**
 * Offline pull change-query SQL builder tests.
 *
 * @package TCGStorePlatform
 */

namespace TCGStorePlatform\Tests\Unit;

use TCGStorePlatform\Offline\OfflinePullChangeQueryBuilder;
use TCGStorePlatform\Offline\OfflinePullChangeQueryPlan;
use TCGStorePlatform\Offline\OfflinePullChangeQueryPlanner;
use TCGStorePlatform\Offline\OfflinePullRequest;
use TCGStorePlatform\Tests\TestCase;

final class OfflinePullChangeQueryBuilderTest extends TestCase {
	public function test_builder_creates_prepared_sql_templates_without_execution(): void {
		$query_plan = ( new OfflinePullChangeQueryBuilder() )->build(
			$this->change_query_plan(
				array( 'inventory', 'conflicts' ),
				array(
					'inventory' => 'inv-cursor-10',
				),
				75,
				true,
				77
			)
		);
		$inventory  = $query_plan->domain_query( 'inventory' );
		$conflicts  = $query_plan->domain_query( 'conflicts' );
		$audit      = $query_plan->audit_payload();

		$this->assert_true( $query_plan->is_valid() );
		$this->assert_same( 'device-main-01', $query_plan->device_id() );
		$this->assert_same( 77, $query_plan->offline_device_id() );
		$this->assert_same( 2, count( $query_plan->domain_queries() ) );
		$this->assert_contains( 'SELECT `inventory_id`, `public_id`, `game`', $inventory['sql_template'] );
		$this->assert_contains( 'FROM `wp_tcg_inventory_items`', $inventory['sql_template'] );
		$this->assert_not_contains( 'WHERE', $inventory['sql_template'] );
		$this->assert_contains( 'ORDER BY `updated_at` ASC, `inventory_id` ASC LIMIT %d', $inventory['sql_template'] );
		$this->assert_same( array( 75 ), $inventory['prepare_args'] );
		$this->assert_same( 'inv-cursor-10', $inventory['cursor_after'] );
		$this->assert_true( $inventory['include_tombstones'] );
		$this->assert_true( $inventory['cursor_filter_deferred'] );
		$this->assert_true( $inventory['execution_deferred'] );
		$this->assert_true( $inventory['cursor_advance_deferred'] );
		$this->assert_true( $inventory['tombstone_read_deferred'] );
		$this->assert_not_contains( 'inv-cursor-10', $inventory['sql_template'] );
		$this->assert_contains( 'FROM `wp_tcg_sync_conflicts`', $conflicts['sql_template'] );
		$this->assert_contains( '`status` = %s', $conflicts['sql_template'] );
		$this->assert_contains( '`offline_device_id` = %d', $conflicts['sql_template'] );
		$this->assert_contains( '`device_public_id` = %s', $conflicts['sql_template'] );
		$this->assert_same( array( 'open', 77, 'device-main-01', 75 ), $conflicts['prepare_args'] );
		$this->assert_same( 'offline_pull_change_query_sql_planned', $audit['action'] );
		$this->assert_same( 2, $audit['domain_count'] );
		$this->assert_same( 5, $audit['prepare_arg_count'] );
		$this->assert_true( $audit['sql_query_ready'] );
		$this->assert_true( $audit['execution_deferred'] );
	}

	public function test_builder_rejects_invalid_change_query_plan_without_sql(): void {
		$query_plan = ( new OfflinePullChangeQueryBuilder() )->build(
			( new OfflinePullChangeQueryPlanner() )->plan(
				$this->pull_request(),
				0,
				'wp;drop_'
			)
		);

		$this->assert_false( $query_plan->is_valid() );
		$this->assert_same( array(), $query_plan->domain_queries() );
		$this->assert_true( in_array( 'change_query_plan_invalid', $query_plan->errors(), true ) );
		$this->assert_true( in_array( 'offline_device_id_invalid', $query_plan->errors(), true ) );
		$this->assert_true( in_array( 'table_prefix_invalid', $query_plan->errors(), true ) );
	}

	public function test_builder_rejects_tampered_domain_contracts_without_sql(): void {
		$plan    = $this->change_query_plan();
		$queries = $plan->domain_queries();

		$queries['inventory']['table_name']         = 'wp_users';
		$queries['inventory']['selected_columns'][] = 'password_hash';
		$queries['inventory']['where']              = array(
			'status' => 'active',
		);

		$query_plan = ( new OfflinePullChangeQueryBuilder() )->build(
			OfflinePullChangeQueryPlan::accepted(
				$plan->device_id(),
				$plan->offline_device_id(),
				$plan->table_prefix(),
				$queries
			)
		);

		$this->assert_false( $query_plan->is_valid() );
		$this->assert_same( array(), $query_plan->domain_queries() );
		$this->assert_true( in_array( 'table_unsupported', $query_plan->errors(), true ) );
		$this->assert_true( in_array( 'selected_columns_unsupported', $query_plan->errors(), true ) );
		$this->assert_true( in_array( 'where_unsupported', $query_plan->errors(), true ) );
	}

	public function test_builder_rejects_cursor_limit_and_order_mutations(): void {
		$plan    = $this->change_query_plan();
		$queries = $plan->domain_queries();

		$queries['inventory']['cursor_after'] = 'bad cursor with spaces';
		$queries['inventory']['limit']        = 501;
		$queries['inventory']['order_by']     = array(
			'updated_at'   => 'DESC',
			'inventory_id' => 'ASC',
		);

		$query_plan = ( new OfflinePullChangeQueryBuilder() )->build(
			OfflinePullChangeQueryPlan::accepted(
				$plan->device_id(),
				$plan->offline_device_id(),
				$plan->table_prefix(),
				$queries
			)
		);

		$this->assert_false( $query_plan->is_valid() );
		$this->assert_true( in_array( 'cursor_invalid', $query_plan->errors(), true ) );
		$this->assert_true( in_array( 'limit_unsupported', $query_plan->errors(), true ) );
		$this->assert_true( in_array( 'order_by_unsupported', $query_plan->errors(), true ) );
		$this->assert_true( in_array( 'order_by_invalid', $query_plan->errors(), true ) );
	}

	private function change_query_plan(
		array $domains = array( 'inventory' ),
		array $cursors = array(),
		int $page_size = 50,
		bool $include_tombstones = true,
		int $offline_device_id = 42
	): OfflinePullChangeQueryPlan {
		return ( new OfflinePullChangeQueryPlanner() )->plan(
			new OfflinePullRequest(
				'device-main-01',
				$domains,
				$cursors,
				$page_size,
				$include_tombstones,
				1
			),
			$offline_device_id,
			'wp_'
		);
	}

	private function pull_request(): OfflinePullRequest {
		return new OfflinePullRequest(
			'device-main-01',
			array( 'inventory' ),
			array(),
			50,
			true,
			1
		);
	}
}
