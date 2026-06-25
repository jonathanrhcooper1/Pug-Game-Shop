<?php
/**
 * Offline push server snapshot query planner tests.
 *
 * @package TCGStorePlatform
 */

namespace TCGStorePlatform\Tests\Unit;

use TCGStorePlatform\Offline\OfflineOperationEnvelope;
use TCGStorePlatform\Offline\OfflinePushPayload;
use TCGStorePlatform\Offline\OfflinePushServerSnapshotQueryPlanner;
use TCGStorePlatform\Tests\TestCase;

final class OfflinePushServerSnapshotQueryPlannerTest extends TestCase {
	public function test_planner_builds_snapshot_queries_for_supported_operations(): void {
		$plan      = ( new OfflinePushServerSnapshotQueryPlanner() )->plan(
			$this->payload(),
			42,
			'wp_'
		);
		$inventory = $plan->operation_query( 'op-inventory-0001' );
		$event     = $plan->operation_query( 'op-event-0001' );
		$checkin   = $plan->operation_query( 'op-event-checkin-01' );
		$credit    = $plan->operation_query( 'op-credit-redemption-01' );
		$audit     = $plan->audit_payload();

		$this->assert_true( $plan->is_valid() );
		$this->assert_same( 'batch-main-01', $plan->batch_id() );
		$this->assert_same( 'device-main-01', $plan->device_id() );
		$this->assert_same( 42, $plan->offline_device_id() );
		$this->assert_same( 4, count( $plan->operation_queries() ) );
		$this->assert_same( 'wp_tcg_inventory_items', $inventory['table_name'] );
		$this->assert_same( 'inventory', $inventory['snapshot_section'] );
		$this->assert_same( array( 'public_id' => 'inv-1001' ), $inventory['where'] );
		$this->assert_same( array( 'op-inventory-0001', 'inventory:inv-1001' ), $inventory['result_keys'] );
		$this->assert_true( $inventory['execution_deferred'] );
		$this->assert_true( $inventory['snapshot_repository_next'] );
		$this->assert_same( 'wp_tcg_events', $event['table_name'] );
		$this->assert_same( 'event', $event['snapshot_section'] );
		$this->assert_same( array( 'seatsRemaining' => 'player_cap_minus_registered_count' ), $event['derived_fields'] );
		$this->assert_same( 'wp_tcg_events', $checkin['table_name'] );
		$this->assert_same( 'event', $checkin['snapshot_section'] );
		$this->assert_same( array( 'op-event-checkin-01', 'event:event-100' ), $checkin['result_keys'] );
		$this->assert_same( array(), $checkin['derived_fields'] );
		$this->assert_same( 'wp_tcg_customers', $credit['table_name'] );
		$this->assert_same( 'customer', $credit['snapshot_section'] );
		$this->assert_same( array( 'creditBalanceMinorUnits' => 'credit_balance_decimal_to_minor_units' ), $credit['derived_fields'] );
		$this->assert_same( 'offline_push_server_snapshot_queries_planned', $audit['action'] );
		$this->assert_same( 4, $audit['operation_count'] );
		$this->assert_same( array( 'inventory', 'event', 'customer_credit' ), $audit['domains'] );
		$this->assert_true( $audit['snapshot_query_ready'] );
		$this->assert_true( $audit['execution_deferred'] );
		$this->assert_true( $audit['route_connected_reads_deferred'] );
	}

	public function test_planner_rejects_invalid_context_without_queries(): void {
		$plan = ( new OfflinePushServerSnapshotQueryPlanner() )->plan(
			$this->payload(),
			0,
			'wp;drop_'
		);

		$this->assert_false( $plan->is_valid() );
		$this->assert_same( array(), $plan->operation_queries() );
		$this->assert_true( in_array( 'offline_device_id_invalid', $plan->errors(), true ) );
		$this->assert_true( in_array( 'table_prefix_invalid', $plan->errors(), true ) );
	}

	public function test_planner_rejects_unsupported_and_mismatched_operations(): void {
		$payload = new OfflinePushPayload(
			'batch-main-01',
			'device-main-01',
			array(
				$this->operation( 'op-unsupported-0001', 'price_change', 'inventory', 'inv-1001' ),
				$this->operation( 'op-mismatch-0001', 'inventory_reservation', 'event', 'event-100' ),
				new OfflineOperationEnvelope(
					'op-device-mismatch-01',
					'other-device-01',
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
				),
			)
		);
		$plan    = ( new OfflinePushServerSnapshotQueryPlanner() )->plan( $payload, 42, 'wp_' );

		$this->assert_false( $plan->is_valid() );
		$this->assert_same( array(), $plan->operation_queries() );
		$this->assert_true( in_array( 'operations_0_operation_type_unsupported', $plan->errors(), true ) );
		$this->assert_true( in_array( 'operations_1_entity_type_unsupported', $plan->errors(), true ) );
		$this->assert_true( in_array( 'operations_2_device_id_mismatch', $plan->errors(), true ) );
	}

	private function payload(): OfflinePushPayload {
		return new OfflinePushPayload(
			'batch-main-01',
			'device-main-01',
			array(
				$this->operation( 'op-inventory-0001', 'inventory_reservation', 'inventory', 'inv-1001', 4 ),
				$this->operation( 'op-event-0001', 'event_reservation', 'event', 'event-100', 9 ),
				$this->operation( 'op-event-checkin-01', 'event_checkin', 'event', 'event-100', 9 ),
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
