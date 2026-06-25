<?php
/**
 * Offline push existing operation rows query SQL builder tests.
 *
 * @package TCGStorePlatform
 */

namespace TCGStorePlatform\Tests\Unit;

use TCGStorePlatform\Offline\OfflineOperationEnvelope;
use TCGStorePlatform\Offline\OfflinePushExistingOperationRowsQueryBuilder;
use TCGStorePlatform\Offline\OfflinePushExistingOperationRowsQueryPlan;
use TCGStorePlatform\Offline\OfflinePushExistingOperationRowsQueryPlanner;
use TCGStorePlatform\Offline\OfflinePushPayload;
use TCGStorePlatform\Tests\TestCase;

final class OfflinePushExistingOperationRowsQueryBuilderTest extends TestCase {
	public function test_builder_creates_prepared_existing_row_lookup_without_execution(): void {
		$build = ( new OfflinePushExistingOperationRowsQueryBuilder() )->build( $this->query_plan() );
		$query = $build->query();
		$audit = $build->audit_payload();

		$this->assert_true( $build->is_valid() );
		$this->assert_same( 'batch-main-01', $build->batch_id() );
		$this->assert_same( 'device-main-01', $build->device_id() );
		$this->assert_same( 42, $build->offline_device_id() );
		$this->assert_contains( 'SELECT `offline_queue_id`, `offline_device_id`, `device_public_id`', $query['sql_template'] );
		$this->assert_contains( 'FROM `wp_tcg_offline_sync_queue`', $query['sql_template'] );
		$this->assert_contains( 'WHERE `offline_device_id` = %d', $query['sql_template'] );
		$this->assert_contains( '`client_operation_id` IN (%s, %s, %s) LIMIT 3', $query['sql_template'] );
		$this->assert_same(
			array( 42, 'op-inventory-0001', 'op-event-0001', 'op-credit-redemption-01' ),
			$query['prepare_args']
		);
		$this->assert_same( 3, $query['limit'] );
		$this->assert_true( $query['execution_deferred'] );
		$this->assert_true( $query['existing_operation_rows_repository_next'] );
		$this->assert_true( $query['queue_replay_deferred'] );
		$this->assert_same( 'offline_push_existing_operation_rows_query_sql_planned', $audit['action'] );
		$this->assert_same( 3, $audit['operation_count'] );
		$this->assert_same( 4, $audit['prepare_arg_count'] );
		$this->assert_true( $audit['sql_query_ready'] );
		$this->assert_true( $audit['route_connected_reads_deferred'] );
	}

	public function test_builder_rejects_invalid_query_plan_without_sql(): void {
		$build = ( new OfflinePushExistingOperationRowsQueryBuilder() )->build(
			( new OfflinePushExistingOperationRowsQueryPlanner() )->plan(
				$this->payload(),
				0,
				'wp;drop_'
			)
		);

		$this->assert_false( $build->is_valid() );
		$this->assert_same( array(), $build->query() );
		$this->assert_true( in_array( 'existing_operation_rows_query_plan_invalid', $build->errors(), true ) );
		$this->assert_true( in_array( 'offline_device_id_invalid', $build->errors(), true ) );
		$this->assert_true( in_array( 'table_prefix_invalid', $build->errors(), true ) );
	}

	public function test_builder_rejects_tampered_existing_row_contract(): void {
		$plan  = $this->query_plan();
		$query = $plan->query();

		$query['table_name']         = 'wp_users';
		$query['selected_columns'][] = 'password_hash';
		$query['where']              = array(
			'offline_device_id' => 42,
		);

		$build = ( new OfflinePushExistingOperationRowsQueryBuilder() )->build(
			OfflinePushExistingOperationRowsQueryPlan::accepted(
				$plan->batch_id(),
				$plan->device_id(),
				$plan->offline_device_id(),
				$plan->table_prefix(),
				$query
			)
		);

		$this->assert_false( $build->is_valid() );
		$this->assert_same( array(), $build->query() );
		$this->assert_true( in_array( 'table_unsupported', $build->errors(), true ) );
		$this->assert_true( in_array( 'selected_columns_unsupported', $build->errors(), true ) );
		$this->assert_true( in_array( 'where_unsupported', $build->errors(), true ) );
	}

	private function query_plan(): OfflinePushExistingOperationRowsQueryPlan {
		return ( new OfflinePushExistingOperationRowsQueryPlanner() )->plan(
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
				$this->operation( 'op-inventory-0001' ),
				$this->operation( 'op-event-0001' ),
				$this->operation( 'op-credit-redemption-01' ),
			)
		);
	}

	private function operation( string $operation_id ): OfflineOperationEnvelope {
		return new OfflineOperationEnvelope(
			$operation_id,
			'device-main-01',
			3,
			22,
			'inventory_reservation',
			'inventory',
			'inv-1001',
			4,
			'2026-06-06T10:15:00-04:00',
			'2026-06-06T14:15:05Z',
			array(),
			array(),
			1
		);
	}
}
