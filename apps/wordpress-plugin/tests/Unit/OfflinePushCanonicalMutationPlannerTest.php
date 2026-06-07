<?php
/**
 * Offline push canonical mutation planner tests.
 *
 * @package TCGStorePlatform
 */

namespace TCGStorePlatform\Tests\Unit;

use InvalidArgumentException;
use TCGStorePlatform\Offline\OfflinePushBatchResolutionPlan;
use TCGStorePlatform\Offline\OfflinePushBatchResolver;
use TCGStorePlatform\Offline\OfflinePushCanonicalMutationPlanner;
use TCGStorePlatform\Offline\OfflinePushOperationResolutionPlan;
use TCGStorePlatform\Offline\OfflinePushPayload;
use TCGStorePlatform\Offline\OfflinePushPayloadParser;
use TCGStorePlatform\Tests\TestCase;

final class OfflinePushCanonicalMutationPlannerTest extends TestCase {
	public function test_planner_builds_deferred_canonical_mutations_for_accepted_operations(): void {
		$payload    = $this->push_payload();
		$resolution = ( new OfflinePushBatchResolver() )->resolve(
			$payload,
			array(
				'op-inventory-0001'       => array(
					'inventory' => array(
						'status'     => 'available',
						'rowVersion' => 4,
					),
				),
				'op-event-0001'           => array(
					'event' => array(
						'seatsRemaining'  => 3,
						'registrationMode' => 'website_push_topdeck',
						'topDeckEnabled'   => true,
						'rowVersion'       => 9,
					),
				),
				'op-credit-redemption-01' => array(
					'customer' => array(
						'creditBalanceMinorUnits' => 5000,
						'rowVersion'              => 6,
					),
				),
			),
			'2026-06-06T20:00:00Z',
			array(
				'op-event-0001' => array(
					'paymentStatus' => 'paid',
				),
			)
		);

		$plan      = ( new OfflinePushCanonicalMutationPlanner() )->plan( $payload, $resolution );
		$mutations = $plan->mutation_rows();
		$audit     = $plan->audit_payload();

		$this->assert_same( 'batch-main-01', $plan->batch_id() );
		$this->assert_same( 'device-main-01', $plan->device_id() );
		$this->assert_same( '2026-06-06T20:00:00Z', $plan->server_time_utc() );
		$this->assert_same( 3, $plan->mutation_count() );
		$this->assert_same(
			array( 'op-inventory-0001', 'op-event-0001', 'op-credit-redemption-01' ),
			$plan->mutation_operation_ids()
		);
		$this->assert_same( array(), $plan->skipped_operation_ids() );
		$this->assert_same( 'inventory_reservation', $mutations[0]['mutation_type'] );
		$this->assert_same( 'tcg_inventory_items', $mutations[0]['table_contract'] );
		$this->assert_same( 'reserved', $mutations[0]['target_status'] );
		$this->assert_same( 4, $mutations[0]['expected_base_row_version'] );
		$this->assert_same( 5, $mutations[0]['target_row_version'] );
		$this->assert_true( $mutations[0]['prevent_double_sell_guard'] );
		$this->assert_true( $mutations[0]['canonical_mutation_deferred'] );
		$this->assert_same( 'event_registration', $mutations[1]['mutation_type'] );
		$this->assert_same( 'tcg_event_registrations', $mutations[1]['table_contract'] );
		$this->assert_same( 'reserved', $mutations[1]['registration_status'] );
		$this->assert_same( 10, $mutations[1]['target_row_version'] );
		$this->assert_false( $mutations[1]['queue_topdeck'] );
		$this->assert_true( $mutations[1]['topdeck_worker_deferred'] );
		$this->assert_same( 'customer_credit_redemption', $mutations[2]['mutation_type'] );
		$this->assert_same( 'tcg_customer_credit_ledger', $mutations[2]['table_contract'] );
		$this->assert_same( 4500, $mutations[2]['amount_minor_units'] );
		$this->assert_same( 500, $mutations[2]['balance_after_minor_units'] );
		$this->assert_same( 7, $mutations[2]['target_row_version'] );
		$this->assert_true( $mutations[2]['ledger_write_deferred'] );
		$this->assert_same( 'offline_push_canonical_mutations_planned', $audit['action'] );
		$this->assert_same( 3, $audit['operation_count'] );
		$this->assert_same( 3, $audit['mutation_count'] );
		$this->assert_true( $audit['canonical_mutations_deferred'] );
		$this->assert_true( $audit['route_connected_writes_deferred'] );
		$this->assert_true( $audit['queue_replay_deferred'] );
	}

	public function test_planner_skips_conflict_and_rejected_operations(): void {
		$payload    = $this->push_payload(
			array(
				$this->inventory_operation_payload(),
				$this->credit_operation_payload(
					array(
						'amountMinorUnits'        => 0,
						'cachedBalanceMinorUnits' => 5000,
					)
				),
			)
		);
		$resolution = ( new OfflinePushBatchResolver() )->resolve(
			$payload,
			array(
				'op-inventory-0001'       => array(
					'inventory' => array(
						'status'     => 'sold',
						'rowVersion' => 5,
					),
				),
				'op-credit-redemption-01' => array(
					'customer' => array(
						'creditBalanceMinorUnits' => 5000,
						'rowVersion'              => 6,
					),
				),
			),
			'2026-06-06T20:00:00Z'
		);

		$plan     = ( new OfflinePushCanonicalMutationPlanner() )->plan( $payload, $resolution );
		$response = $plan->response_payload();

		$this->assert_same( 0, $plan->mutation_count() );
		$this->assert_same( array( 'op-inventory-0001', 'op-credit-redemption-01' ), $plan->skipped_operation_ids() );
		$this->assert_same( 'resolution_status_conflict', $plan->skipped_reasons()['op-inventory-0001'] );
		$this->assert_same( 'resolution_status_rejected', $plan->skipped_reasons()['op-credit-redemption-01'] );
		$this->assert_same( array(), $response['mutation_operation_ids'] );
		$this->assert_true( $response['canonical_mutations_deferred'] );
	}

	public function test_planner_skips_replayed_operations_before_canonical_writes(): void {
		$payload    = $this->push_payload(
			array(
				$this->inventory_operation_payload(),
			)
		);
		$resolution = ( new OfflinePushBatchResolver() )->resolve(
			$payload,
			array(
				'op-inventory-0001' => array(
					'inventory' => array(
						'status'     => 'available',
						'rowVersion' => 4,
					),
				),
			),
			'2026-06-06T20:00:00Z'
		);

		$plan = ( new OfflinePushCanonicalMutationPlanner() )->plan(
			$payload,
			$resolution,
			array( 'op-inventory-0001' )
		);

		$this->assert_same( 0, $plan->mutation_count() );
		$this->assert_same( array( 'op-inventory-0001' ), $plan->skipped_operation_ids() );
		$this->assert_same( 'operation_replayed', $plan->skipped_reasons()['op-inventory-0001'] );
		$this->assert_same( array( 'op-inventory-0001' ), $plan->response_payload()['replayed_operation_ids'] );
	}

	public function test_planner_rejects_mismatched_payload_and_resolution(): void {
		$payload    = $this->push_payload(
			array(
				$this->inventory_operation_payload(),
			)
		);
		$resolution = ( new OfflinePushBatchResolver() )->resolve(
			$payload,
			array(
				'op-inventory-0001' => array(
					'inventory' => array(
						'status'     => 'available',
						'rowVersion' => 4,
					),
				),
			),
			'2026-06-06T20:00:00Z'
		);
		$mismatched = new OfflinePushBatchResolutionPlan(
			'batch-other-01',
			$resolution->device_id(),
			$resolution->server_time_utc(),
			$resolution->operation_plans(),
			$resolution->operation_result_rows(),
			$resolution->conflict_rows(),
			$resolution->response_payload(),
			$resolution->audit_payload()
		);

		$this->assert_throws_invalid_argument(
			static fn () => ( new OfflinePushCanonicalMutationPlanner() )->plan( $payload, $mismatched )
		);
	}

	public function test_planner_rejects_malformed_accepted_resolution_details(): void {
		$payload = $this->push_payload(
			array(
				$this->event_operation_payload(),
			)
		);
		$plan    = new OfflinePushOperationResolutionPlan(
			'accepted',
			'event_reserved',
			array(
				'canonicalStatus' => 'reserved',
				'rowVersion'      => 10,
			),
			array(
				'client_operation_id' => 'op-event-0001',
				'idempotency_key'     => 'op-event-0001',
				'device_id'           => 'device-main-01',
				'operation_type'      => 'event_reservation',
				'entity_type'         => 'event',
				'entity_id'           => 'event-100',
				'base_row_version'    => 9,
			),
			array(),
			null,
			array()
		);
		$resolution = new OfflinePushBatchResolutionPlan(
			'batch-main-01',
			'device-main-01',
			'2026-06-06T20:00:00Z',
			array( $plan ),
			array( $plan->operation_result_row() ),
			array(),
			array(),
			array()
		);

		$this->assert_throws_invalid_argument(
			static fn () => ( new OfflinePushCanonicalMutationPlanner() )->plan( $payload, $resolution )
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
	 * @param array<string, mixed>|null $operation_payload Operation payload overrides.
	 * @return array<string, mixed>
	 */
	private function credit_operation_payload( ?array $operation_payload = null ): array {
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
			'payload'             => $operation_payload ?? array(
				'amountMinorUnits'        => 4500,
				'cachedBalanceMinorUnits' => 5000,
			),
			'schema_version'      => 1,
		);
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
