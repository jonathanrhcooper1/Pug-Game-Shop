<?php
/**
 * Offline push persistence planner tests.
 *
 * @package TCGStorePlatform
 */

namespace TCGStorePlatform\Tests\Unit;

use InvalidArgumentException;
use TCGStorePlatform\Offline\OfflinePushBatchResolutionPlan;
use TCGStorePlatform\Offline\OfflinePushBatchResolver;
use TCGStorePlatform\Offline\OfflinePushPayload;
use TCGStorePlatform\Offline\OfflinePushPayloadParser;
use TCGStorePlatform\Offline\OfflinePushPersistencePlanner;
use TCGStorePlatform\Tests\TestCase;

final class OfflinePushPersistencePlannerTest extends TestCase {
	public function test_planner_builds_queue_rows_and_conflict_inserts(): void {
		$payload    = $this->push_payload();
		$resolution = $this->resolution( $payload );
		$plan       = ( new OfflinePushPersistencePlanner() )->plan(
			$payload,
			$resolution,
			$this->device_row(),
			'2026-06-06T20:00:02Z'
		);

		$operations = $plan->operation_insert_rows();
		$conflicts  = $plan->conflict_insert_rows();
		$audit      = $plan->audit_payload();

		$this->assert_same( 'batch-main-01', $plan->batch_id() );
		$this->assert_same( 'device-main-01', $plan->device_id() );
		$this->assert_same( 42, $plan->offline_device_id() );
		$this->assert_same( 3, count( $operations ) );
		$this->assert_same( 0, count( $plan->operation_replay_rows() ) );
		$this->assert_same( 1, count( $conflicts ) );
		$this->assert_same( 1, $operations[0]['sequence_number'] );
		$this->assert_same( 'inventory_reservation', $operations[0]['operation_type'] );
		$this->assert_same( 'inventory', $operations[0]['domain'] );
		$this->assert_same( 'accepted', $operations[0]['status'] );
		$this->assert_same( 'inventory_reserved', $operations[0]['result_code'] );
		$this->assert_same( '2026-06-06T20:00:02Z', $operations[0]['received_at'] );
		$this->assert_same( '2026-06-06T20:00:00Z', $operations[0]['resolved_at'] );
		$this->assert_same( array( 'localStatus' => 'offline_pending_sync' ), $this->decode( $operations[0]['payload_json'] ) );
		$this->assert_same( 'conflict', $operations[2]['status'] );
		$this->assert_same( $conflicts[0]['conflict_id'], $operations[2]['conflict_id'] );
		$this->assert_same( 'customer_credit', $conflicts[0]['entity_type'] );
		$this->assert_same( 'credit_overspend_conflict', $conflicts[0]['conflict_type'] );
		$this->assert_same( array( 'accept_server', 'manager_adjust', 'dismiss' ), $this->decode( $conflicts[0]['resolution_options_json'] ) );
		$this->assert_same( 3, $audit['operation_insert_count'] );
		$this->assert_same( 0, $audit['operation_replay_count'] );
		$this->assert_same( 1, $audit['conflict_insert_count'] );
	}

	public function test_planner_replays_existing_operation_rows_idempotently(): void {
		$payload    = $this->push_payload( array( $this->inventory_operation_payload() ) );
		$resolution = $this->resolution( $payload );
		$plan       = ( new OfflinePushPersistencePlanner() )->plan(
			$payload,
			$resolution,
			$this->device_row(),
			'2026-06-06T20:00:02Z',
			array(
				'op-inventory-0001' => array(
					'client_operation_id' => 'op-inventory-0001',
					'status'              => 'accepted',
					'result_code'         => 'inventory_reserved',
					'row_version'         => 3,
				),
			)
		);

		$this->assert_same( 0, count( $plan->operation_insert_rows() ) );
		$this->assert_same( 1, count( $plan->operation_replay_rows() ) );
		$this->assert_same( 0, count( $plan->conflict_insert_rows() ) );
		$this->assert_same( 1, $plan->audit_payload()['operation_replay_count'] );
	}

	public function test_planner_rejects_mismatched_or_stale_inputs(): void {
		$planner    = new OfflinePushPersistencePlanner();
		$payload    = $this->push_payload( array( $this->inventory_operation_payload() ) );
		$resolution = $this->resolution( $payload );

		$this->assert_throws_invalid_argument(
			fn () => $planner->plan(
				$payload,
				$resolution,
				array( 'offline_device_id' => 42, 'public_id' => 'other-device' ),
				'2026-06-06T20:00:02Z'
			)
		);

		$this->assert_throws_invalid_argument(
			fn () => $planner->plan(
				$payload,
				$this->mismatched_resolution( $resolution ),
				$this->device_row(),
				'2026-06-06T20:00:02Z'
			)
		);

		$this->assert_throws_invalid_argument(
			fn () => $planner->plan(
				$payload,
				$resolution,
				$this->device_row(),
				'2026-06-06T20:00:02-04:00'
			)
		);

		$this->assert_throws_invalid_argument(
			fn () => $planner->plan(
				$payload,
				$resolution,
				$this->device_row(),
				'2026-06-06T20:00:02Z',
				array(
					'op-inventory-0001' => array(
						'client_operation_id' => 'op-inventory-0001',
						'status'              => 'rejected',
						'result_code'         => 'inventory_reserved',
					),
				)
			)
		);
	}

	private function resolution( OfflinePushPayload $payload ): OfflinePushBatchResolutionPlan {
		return ( new OfflinePushBatchResolver() )->resolve(
			$payload,
			array(
				'op-inventory-0001'        => array(
					'inventory' => array(
						'status'     => 'available',
						'rowVersion' => 4,
					),
				),
				'event:event-100'          => array(
					'event' => array(
						'seatsRemaining' => 0,
						'waitlistEnabled' => true,
						'rowVersion'     => 9,
					),
				),
				'op-credit-redemption-01'  => array(
					'customer' => array(
						'creditBalanceMinorUnits' => 1000,
						'rowVersion'              => 6,
					),
				),
			),
			'2026-06-06T20:00:00Z'
		);
	}

	private function mismatched_resolution( OfflinePushBatchResolutionPlan $resolution ): OfflinePushBatchResolutionPlan {
		return new OfflinePushBatchResolutionPlan(
			'other-batch',
			$resolution->device_id(),
			$resolution->server_time_utc(),
			$resolution->operation_plans(),
			$resolution->operation_result_rows(),
			$resolution->conflict_rows(),
			$resolution->response_payload(),
			$resolution->audit_payload()
		);
	}

	/**
	 * @return array<string, mixed>
	 */
	private function device_row(): array {
		return array(
			'offline_device_id' => 42,
			'public_id'         => 'device-main-01',
		);
	}

	/**
	 * @param list<array<string, mixed>>|null $operations Operation payloads.
	 */
	private function push_payload( ?array $operations = null ): OfflinePushPayload {
		$result = ( new OfflinePushPayloadParser() )->parse(
			array(
				'batch_id'   => 'body-batch-ignored',
				'device_id'  => 'device-main-01',
				'operations' => $operations ?? array(
					$this->inventory_operation_payload(),
					$this->event_operation_payload(),
					$this->credit_operation_payload(),
				),
			),
			'batch-main-01'
		);

		$this->assert_true( $result->is_valid() );

		$payload = $result->payload();
		$this->assert_true( null !== $payload );

		return $payload;
	}

	/**
	 * @return array<string, mixed>
	 */
	private function inventory_operation_payload(): array {
		return array(
			'client_operation_id' => 'op-inventory-0001',
			'device_id'           => 'device-main-01',
			'location_id'         => 3,
			'actor_id'            => 22,
			'operation_type'      => 'inventory_reservation',
			'entity_type'         => 'inventory',
			'entity_id'           => 'inv-1001',
			'base_row_version'    => 4,
			'occurred_at_local'   => '2026-06-06T10:15:00-04:00',
			'queued_at_utc'       => '2026-06-06T14:15:05Z',
			'payload'             => array( 'localStatus' => 'offline_pending_sync' ),
			'schema_version'      => 1,
		);
	}

	/**
	 * @return array<string, mixed>
	 */
	private function event_operation_payload(): array {
		return array(
			'client_operation_id' => 'op-event-0001',
			'device_id'           => 'device-main-01',
			'location_id'         => 3,
			'actor_id'            => 22,
			'operation_type'      => 'event_reservation',
			'entity_type'         => 'event',
			'entity_id'           => 'event-100',
			'base_row_version'    => 9,
			'occurred_at_local'   => '2026-06-06T11:15:00-04:00',
			'queued_at_utc'       => '2026-06-06T15:15:05Z',
			'payload'             => array(),
			'schema_version'      => 1,
		);
	}

	/**
	 * @return array<string, mixed>
	 */
	private function credit_operation_payload(): array {
		return array(
			'client_operation_id' => 'op-credit-redemption-01',
			'device_id'           => 'device-main-01',
			'location_id'         => 3,
			'actor_id'            => 22,
			'operation_type'      => 'credit_redemption',
			'entity_type'         => 'customer_credit',
			'entity_id'           => 'customer-100',
			'base_row_version'    => 6,
			'occurred_at_local'   => '2026-06-06T12:15:00-04:00',
			'queued_at_utc'       => '2026-06-06T16:15:05Z',
			'payload'             => array(
				'amountMinorUnits'        => 4500,
				'cachedBalanceMinorUnits' => 5000,
			),
			'schema_version'      => 1,
		);
	}

	/**
	 * @return mixed
	 */
	private function decode( string $json ): mixed {
		return json_decode( $json, true );
	}

	/**
	 * @param callable(): void $callback Callback expected to throw.
	 */
	private function assert_throws_invalid_argument( callable $callback ): void {
		try {
			$callback();
		} catch ( InvalidArgumentException ) {
			$this->assert_true( true );

			return;
		}

		$this->assert_true( false, 'Expected InvalidArgumentException.' );
	}
}
