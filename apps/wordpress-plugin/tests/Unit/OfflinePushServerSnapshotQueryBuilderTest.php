<?php
/**
 * Offline push server snapshot query SQL builder tests.
 *
 * @package TCGStorePlatform
 */

namespace TCGStorePlatform\Tests\Unit;

use TCGStorePlatform\Offline\OfflineOperationEnvelope;
use TCGStorePlatform\Offline\OfflinePushPayload;
use TCGStorePlatform\Offline\OfflinePushServerSnapshotQueryBuilder;
use TCGStorePlatform\Offline\OfflinePushServerSnapshotQueryPlan;
use TCGStorePlatform\Offline\OfflinePushServerSnapshotQueryPlanner;
use TCGStorePlatform\Tests\TestCase;

final class OfflinePushServerSnapshotQueryBuilderTest extends TestCase {
	public function test_builder_creates_prepared_snapshot_sql_templates_without_execution(): void {
		$build     = ( new OfflinePushServerSnapshotQueryBuilder() )->build( $this->query_plan() );
		$inventory = $build->operation_query( 'op-inventory-0001' );
		$event     = $build->operation_query( 'op-event-0001' );
		$credit    = $build->operation_query( 'op-credit-redemption-01' );
		$audit     = $build->audit_payload();

		$this->assert_true( $build->is_valid() );
		$this->assert_same( 'batch-main-01', $build->batch_id() );
		$this->assert_same( 'device-main-01', $build->device_id() );
		$this->assert_same( 42, $build->offline_device_id() );
		$this->assert_contains( 'SELECT `public_id`, `status`, `row_version`, `updated_at`', $inventory['sql_template'] );
		$this->assert_contains( 'FROM `wp_tcg_inventory_items`', $inventory['sql_template'] );
		$this->assert_contains( 'WHERE `public_id` = %s LIMIT 1', $inventory['sql_template'] );
		$this->assert_same( array( 'inv-1001' ), $inventory['prepare_args'] );
		$this->assert_same( array( 'op-inventory-0001', 'inventory:inv-1001' ), $inventory['result_keys'] );
		$this->assert_true( $inventory['execution_deferred'] );
		$this->assert_true( $inventory['snapshot_repository_deferred'] );
		$this->assert_contains( 'FROM `wp_tcg_events`', $event['sql_template'] );
		$this->assert_same( array( 'event-100' ), $event['prepare_args'] );
		$this->assert_same( array( 'seatsRemaining' => 'player_cap_minus_registered_count' ), $event['derived_fields'] );
		$this->assert_contains( 'FROM `wp_tcg_customers`', $credit['sql_template'] );
		$this->assert_same( array( 'customer-100' ), $credit['prepare_args'] );
		$this->assert_same( array( 'creditBalanceMinorUnits' => 'credit_balance_decimal_to_minor_units' ), $credit['derived_fields'] );
		$this->assert_same( 'offline_push_server_snapshot_query_sql_planned', $audit['action'] );
		$this->assert_same( 3, $audit['operation_count'] );
		$this->assert_same( 3, $audit['prepare_arg_count'] );
		$this->assert_true( $audit['sql_query_ready'] );
		$this->assert_true( $audit['route_connected_reads_deferred'] );
	}

	public function test_builder_rejects_invalid_query_plan_without_sql(): void {
		$build = ( new OfflinePushServerSnapshotQueryBuilder() )->build(
			( new OfflinePushServerSnapshotQueryPlanner() )->plan(
				$this->payload(),
				0,
				'wp;drop_'
			)
		);

		$this->assert_false( $build->is_valid() );
		$this->assert_same( array(), $build->operation_queries() );
		$this->assert_true( in_array( 'snapshot_query_plan_invalid', $build->errors(), true ) );
		$this->assert_true( in_array( 'offline_device_id_invalid', $build->errors(), true ) );
		$this->assert_true( in_array( 'table_prefix_invalid', $build->errors(), true ) );
	}

	public function test_builder_rejects_tampered_snapshot_contracts(): void {
		$plan    = $this->query_plan();
		$queries = $plan->operation_queries();

		$queries['op-inventory-0001']['table_name']         = 'wp_users';
		$queries['op-inventory-0001']['selected_columns'][] = 'password_hash';
		$queries['op-inventory-0001']['where']              = array(
			'status' => 'available',
		);

		$build = ( new OfflinePushServerSnapshotQueryBuilder() )->build(
			OfflinePushServerSnapshotQueryPlan::accepted(
				$plan->batch_id(),
				$plan->device_id(),
				$plan->offline_device_id(),
				$plan->table_prefix(),
				$queries
			)
		);

		$this->assert_false( $build->is_valid() );
		$this->assert_same( array(), $build->operation_queries() );
		$this->assert_true( in_array( 'table_unsupported', $build->errors(), true ) );
		$this->assert_true( in_array( 'selected_columns_unsupported', $build->errors(), true ) );
		$this->assert_true( in_array( 'where_unsupported', $build->errors(), true ) );
	}

	private function query_plan(): OfflinePushServerSnapshotQueryPlan {
		return ( new OfflinePushServerSnapshotQueryPlanner() )->plan(
			$this->payload(),
			42,
			'wp_'
		);
	}

	private function payload(): OfflinePushPayload {
		return new OfflinePushPayload(
			'batch-main-01',
			'device-main-01',
			array(
				$this->operation( 'op-inventory-0001', 'inventory_reservation', 'inventory', 'inv-1001', 4 ),
				$this->operation( 'op-event-0001', 'event_reservation', 'event', 'event-100', 9 ),
				$this->operation( 'op-credit-redemption-01', 'credit_redemption', 'customer_credit', 'customer-100', 6 ),
			)
		);
	}

	private function operation(
		string $operation_id,
		string $operation_type,
		string $entity_type,
		string $entity_id,
		?int $base_row_version = null
	): OfflineOperationEnvelope {
		return new OfflineOperationEnvelope(
			$operation_id,
			'device-main-01',
			3,
			22,
			$operation_type,
			$entity_type,
			$entity_id,
			$base_row_version,
			'2026-06-06T10:15:00-04:00',
			'2026-06-06T14:15:05Z',
			array(),
			array(),
			1
		);
	}
}
