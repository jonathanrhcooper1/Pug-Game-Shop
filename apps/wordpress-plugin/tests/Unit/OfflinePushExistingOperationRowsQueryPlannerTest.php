<?php
/**
 * Offline push existing operation rows query planner tests.
 *
 * @package TCGStorePlatform
 */

namespace TCGStorePlatform\Tests\Unit;

use TCGStorePlatform\Offline\OfflineOperationEnvelope;
use TCGStorePlatform\Offline\OfflinePushExistingOperationRowsQueryPlanner;
use TCGStorePlatform\Offline\OfflinePushPayload;
use TCGStorePlatform\Tests\TestCase;

final class OfflinePushExistingOperationRowsQueryPlannerTest extends TestCase {
	public function test_planner_builds_existing_operation_row_query_contract(): void {
		$plan  = ( new OfflinePushExistingOperationRowsQueryPlanner() )->plan(
			$this->payload(),
			42,
			'wp_'
		);
		$query = $plan->query();
		$audit = $plan->audit_payload();

		$this->assert_true( $plan->is_valid() );
		$this->assert_same( 'batch-main-01', $plan->batch_id() );
		$this->assert_same( 'device-main-01', $plan->device_id() );
		$this->assert_same( 42, $plan->offline_device_id() );
		$this->assert_same( 'wp_tcg_offline_sync_queue', $query['table_name'] );
		$this->assert_same(
			array( 'op-inventory-0001', 'op-event-0001', 'op-credit-redemption-01' ),
			$query['operation_ids']
		);
		$this->assert_same(
			array(
				'offline_device_id'      => 42,
				'client_operation_id_in' => array(
					'op-inventory-0001',
					'op-event-0001',
					'op-credit-redemption-01',
				),
			),
			$query['where']
		);
		$this->assert_true( in_array( 'client_operation_id', $query['selected_columns'], true ) );
		$this->assert_same( 3, $query['limit'] );
		$this->assert_true( $query['execution_deferred'] );
		$this->assert_true( $query['existing_operation_rows_repository_next'] );
		$this->assert_true( $query['queue_replay_deferred'] );
		$this->assert_same( 'offline_push_existing_operation_rows_query_planned', $audit['action'] );
		$this->assert_same( 3, $audit['operation_count'] );
		$this->assert_true( $audit['query_ready'] );
		$this->assert_true( $audit['route_connected_reads_deferred'] );
	}

	public function test_planner_rejects_invalid_context_without_query(): void {
		$plan = ( new OfflinePushExistingOperationRowsQueryPlanner() )->plan(
			$this->payload(),
			0,
			'wp;drop_'
		);

		$this->assert_false( $plan->is_valid() );
		$this->assert_same( array(), $plan->query() );
		$this->assert_true( in_array( 'offline_device_id_invalid', $plan->errors(), true ) );
		$this->assert_true( in_array( 'table_prefix_invalid', $plan->errors(), true ) );
	}

	public function test_planner_rejects_duplicate_invalid_and_mismatched_operations(): void {
		$payload = new OfflinePushPayload(
			'batch-main-01',
			'device-main-01',
			array(
				$this->operation( 'bad id', 'device-main-01' ),
				$this->operation( 'op-inventory-0001', 'device-main-01' ),
				$this->operation( 'op-inventory-0001', 'other-device-01' ),
			)
		);
		$plan    = ( new OfflinePushExistingOperationRowsQueryPlanner() )->plan( $payload, 42, 'wp_' );

		$this->assert_false( $plan->is_valid() );
		$this->assert_same( array(), $plan->query() );
		$this->assert_true( in_array( 'operations_0_client_operation_id_invalid', $plan->errors(), true ) );
		$this->assert_true( in_array( 'operations_2_client_operation_id_duplicate', $plan->errors(), true ) );
		$this->assert_true( in_array( 'operations_2_device_id_mismatch', $plan->errors(), true ) );
	}

	private function payload(): OfflinePushPayload {
		return new OfflinePushPayload(
			'batch-main-01',
			'device-main-01',
			array(
				$this->operation( 'op-inventory-0001', 'device-main-01' ),
				$this->operation( 'op-event-0001', 'device-main-01' ),
				$this->operation( 'op-credit-redemption-01', 'device-main-01' ),
			)
		);
	}

	private function operation( string $operation_id, string $device_id ): OfflineOperationEnvelope {
		return new OfflineOperationEnvelope(
			$operation_id,
			$device_id,
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
