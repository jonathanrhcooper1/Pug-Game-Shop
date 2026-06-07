<?php
/**
 * Offline pull change-query planner tests.
 *
 * @package TCGStorePlatform
 */

namespace TCGStorePlatform\Tests\Unit;

use TCGStorePlatform\Offline\OfflinePullChangeQueryPlanner;
use TCGStorePlatform\Offline\OfflinePullRequest;
use TCGStorePlatform\Tests\TestCase;

final class OfflinePullChangeQueryPlannerTest extends TestCase {
	public function test_planner_builds_domain_query_contracts_without_execution(): void {
		$request = new OfflinePullRequest(
			'device-main-01',
			array( 'branding', 'inventory', 'customer_credit', 'events' ),
			array(
				'inventory' => 'inv-cursor-10',
				'events'    => 'evt-cursor-5',
			),
			75,
			true,
			1
		);

		$plan      = ( new OfflinePullChangeQueryPlanner() )->plan( $request, 42, 'wp_' );
		$inventory = $plan->domain_query( 'inventory' );
		$events    = $plan->domain_query( 'events' );
		$audit     = $plan->audit_payload();

		$this->assert_true( $plan->is_valid() );
		$this->assert_same( 'device-main-01', $plan->device_id() );
		$this->assert_same( 42, $plan->offline_device_id() );
		$this->assert_same( 4, count( $plan->domain_queries() ) );
		$this->assert_same( 'wp_tcg_inventory_items', $inventory['table_name'] );
		$this->assert_same( 'inventory_item', $inventory['entity_type'] );
		$this->assert_same( 'inventory_id', $inventory['row_id_column'] );
		$this->assert_same( 'inv-cursor-10', $inventory['cursor_after'] );
		$this->assert_same( 75, $inventory['limit'] );
		$this->assert_true( in_array( 'public_id', $inventory['selected_columns'], true ) );
		$this->assert_true( in_array( 'sale_price', $inventory['payload_fields'], true ) );
		$this->assert_true( $inventory['query_ready'] );
		$this->assert_true( $inventory['execution_deferred'] );
		$this->assert_true( $inventory['cursor_advance_deferred'] );
		$this->assert_true( $inventory['tombstone_read_deferred'] );
		$this->assert_same( 'wp_tcg_events', $events['table_name'] );
		$this->assert_same( 'published', $events['where']['public_visibility'] );
		$this->assert_same( 'offline_pull_change_query_planned', $audit['action'] );
		$this->assert_same( 4, $audit['domain_count'] );
		$this->assert_true( $audit['execution_deferred'] );
	}

	public function test_conflict_domain_is_scoped_to_registered_device(): void {
		$request = new OfflinePullRequest(
			'device-main-01',
			array( 'conflicts' ),
			array(),
			25,
			false,
			1
		);

		$plan     = ( new OfflinePullChangeQueryPlanner() )->plan( $request, 77, 'wp_' );
		$conflict = $plan->domain_query( 'conflicts' );

		$this->assert_true( $plan->is_valid() );
		$this->assert_same( 'wp_tcg_sync_conflicts', $conflict['table_name'] );
		$this->assert_same( 77, $conflict['where']['offline_device_id'] );
		$this->assert_same( 'device-main-01', $conflict['where']['device_public_id'] );
		$this->assert_same( 'open', $conflict['where']['status'] );
		$this->assert_false( $conflict['include_tombstones'] );
	}

	public function test_planner_rejects_invalid_device_and_table_prefix(): void {
		$plan = ( new OfflinePullChangeQueryPlanner() )->plan(
			$this->request(),
			0,
			'wp;drop_'
		);

		$this->assert_false( $plan->is_valid() );
		$this->assert_same( array(), $plan->domain_queries() );
		$this->assert_true( in_array( 'offline_device_id_invalid', $plan->errors(), true ) );
		$this->assert_true( in_array( 'table_prefix_invalid', $plan->errors(), true ) );
	}

	public function test_planner_rejects_tampered_unsupported_domains(): void {
		$request = new OfflinePullRequest(
			'device-main-01',
			array( 'inventory', 'payments' ),
			array(),
			50,
			false,
			1
		);

		$plan = ( new OfflinePullChangeQueryPlanner() )->plan( $request, 42, 'wp_' );

		$this->assert_false( $plan->is_valid() );
		$this->assert_true( in_array( 'domain_unsupported', $plan->errors(), true ) );
	}

	private function request(): OfflinePullRequest {
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
