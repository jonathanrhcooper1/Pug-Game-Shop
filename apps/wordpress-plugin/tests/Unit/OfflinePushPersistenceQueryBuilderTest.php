<?php
/**
 * Offline push persistence SQL builder tests.
 *
 * @package TCGStorePlatform
 */

namespace TCGStorePlatform\Tests\Unit;

use TCGStorePlatform\Offline\OfflinePushBatchResolutionPlan;
use TCGStorePlatform\Offline\OfflinePushBatchResolver;
use TCGStorePlatform\Offline\OfflinePushPayload;
use TCGStorePlatform\Offline\OfflinePushPayloadParser;
use TCGStorePlatform\Offline\OfflinePushPersistencePlan;
use TCGStorePlatform\Offline\OfflinePushPersistencePlanner;
use TCGStorePlatform\Offline\OfflinePushPersistenceQueryBuilder;
use TCGStorePlatform\Tests\TestCase;

final class OfflinePushPersistenceQueryBuilderTest extends TestCase {
	public function test_builder_creates_prepared_queue_and_conflict_insert_templates(): void {
		$build      = ( new OfflinePushPersistenceQueryBuilder() )->build( $this->plan(), 'wp_' );
		$audit      = $build->audit_payload();
		$operations = $build->operation_queries();
		$conflicts  = $build->conflict_queries();

		$this->assert_true( $build->is_valid() );
		$this->assert_same( 'wp_tcg_offline_sync_queue', $build->queue_table_name() );
		$this->assert_same( 'wp_tcg_sync_conflicts', $build->conflict_table_name() );
		$this->assert_same( 4, count( $operations ) );
		$this->assert_same( 1, count( $conflicts ) );
		$this->assert_contains( 'INSERT INTO `wp_tcg_offline_sync_queue`', $operations[0]['sql_template'] );
		$this->assert_contains( '`client_operation_id`', $operations[0]['sql_template'] );
		$this->assert_contains( 'NULL', $operations[0]['sql_template'] );
		$this->assert_contains( 'INSERT INTO `wp_tcg_sync_conflicts`', $conflicts[0]['sql_template'] );
		$this->assert_same( 'op-inventory-0001', $operations[0]['client_operation_id'] );
		$this->assert_same( 'accepted', $operations[0]['status'] );
		$this->assert_false( $operations[0]['has_conflict_id'] );
		$this->assert_same( 'op-event-checkin-01', $operations[2]['client_operation_id'] );
		$this->assert_false( $operations[2]['has_conflict_id'] );
		$this->assert_same( 'op-credit-redemption-01', $operations[3]['client_operation_id'] );
		$this->assert_true( $operations[3]['has_conflict_id'] );
		$this->assert_same( 18, count( $operations[0]['prepare_args'] ) );
		$this->assert_same( 18, count( $operations[1]['prepare_args'] ) );
		$this->assert_same( 18, count( $operations[2]['prepare_args'] ) );
		$this->assert_same( 19, count( $operations[3]['prepare_args'] ) );
		$this->assert_same( '2026-06-06 20:00:02.000000', $operations[0]['prepare_args'][15] );
		$this->assert_same( '2026-06-06 20:00:00.000000', $operations[0]['prepare_args'][16] );
		$this->assert_same( 19, count( $conflicts[0]['prepare_args'] ) );
		$this->assert_same( 'open', $conflicts[0]['status'] );
		$this->assert_same( 'offline_push_persistence_sql_planned', $audit['action'] );
		$this->assert_same( 4, $audit['operation_query_count'] );
		$this->assert_same( 1, $audit['conflict_query_count'] );
		$this->assert_same( 92, $audit['prepare_arg_count'] );
		$this->assert_true( $audit['push_repository_deferred'] );
		$this->assert_true( $audit['route_connected_writes_deferred'] );
	}

	public function test_builder_accepts_replay_only_plans_without_insert_queries(): void {
		$build = ( new OfflinePushPersistenceQueryBuilder() )->build( $this->replay_plan(), 'wp_' );

		$this->assert_true( $build->is_valid() );
		$this->assert_same( array(), $build->operation_queries() );
		$this->assert_same( array(), $build->conflict_queries() );
		$this->assert_same( 0, $build->audit_payload()['prepare_arg_count'] );
	}

	public function test_builder_rejects_bad_prefix_and_tampered_rows(): void {
		$build = ( new OfflinePushPersistenceQueryBuilder() )->build(
			new OfflinePushPersistencePlan(
				'batch-main-01',
				'device-main-01',
				42,
				array(
					array(
						'offline_device_id'   => 0,
						'device_public_id'    => 'bad id',
						'batch_id'            => 'bad batch',
						'client_operation_id' => 'bad op',
						'sequence_number'     => 0,
						'operation_type'      => 'bad_type',
						'domain'              => 'bad_domain',
						'action_name'         => 'bad action',
						'entity_type'         => 'bad entity',
						'entity_id'           => 'bad entity id',
						'base_row_version'    => -1,
						'payload_json'        => '{bad',
						'status'              => 'bad',
						'result_code'         => 'bad code',
						'result_details_json' => '{bad',
						'conflict_id'         => 'bad conflict',
						'received_at'         => 'bad',
						'resolved_at'         => 'bad',
						'last_attempt_at'     => 'bad',
						'next_retry_at'       => 'bad',
						'row_version'         => 0,
					),
				),
				array(),
				array(
					array(
						'conflict_id'             => 'bad conflict',
						'offline_queue_id'        => 0,
						'offline_device_id'       => 0,
						'device_public_id'        => 'bad device',
						'batch_id'                => 'bad batch',
						'client_operation_id'     => 'bad op',
						'status'                  => 'bad',
						'entity_type'             => 'bad entity',
						'entity_id'               => 'bad entity id',
						'conflict_type'           => 'bad type',
						'severity'                => 'bad',
						'summary'                 => '',
						'server_row_version'      => -1,
						'device_row_version'      => -1,
						'server_payload_json'     => '{bad',
						'device_payload_json'     => '{bad',
						'resolution_options_json' => '{bad',
						'resolution_action'       => 'bad action',
						'resolution_payload_json' => '{bad',
						'manager_user_id'         => 0,
						'detected_at'             => 'bad',
						'resolved_at'             => 'bad',
						'updated_at'              => 'bad',
						'row_version'             => 0,
					),
				),
				array( 'action' => 'offline_push_persistence_planned' )
			),
			'wp-bad_'
		);
		$errors = $build->errors();

		$this->assert_false( $build->is_valid() );
		$this->assert_true( in_array( 'table_prefix_invalid', $errors, true ) );
		$this->assert_true( in_array( 'operation_row_0_offline_device_id_invalid', $errors, true ) );
		$this->assert_true( in_array( 'operation_row_0_payload_json_invalid', $errors, true ) );
		$this->assert_true( in_array( 'operation_row_0_received_at_invalid', $errors, true ) );
		$this->assert_true( in_array( 'conflict_row_0_conflict_id_invalid', $errors, true ) );
		$this->assert_true( in_array( 'conflict_row_0_server_payload_json_invalid', $errors, true ) );
		$this->assert_true( in_array( 'conflict_row_0_updated_at_invalid', $errors, true ) );
	}

	private function plan(): OfflinePushPersistencePlan {
		$payload    = $this->push_payload();
		$resolution = $this->resolution( $payload );

		return ( new OfflinePushPersistencePlanner() )->plan(
			$payload,
			$resolution,
			$this->device_row(),
			'2026-06-06T20:00:02Z'
		);
	}

	private function replay_plan(): OfflinePushPersistencePlan {
		$payload    = $this->push_payload( array( $this->inventory_operation_payload() ) );
		$resolution = $this->resolution( $payload );

		return ( new OfflinePushPersistencePlanner() )->plan(
			$payload,
			$resolution,
			$this->device_row(),
			'2026-06-06T20:00:02Z',
			array(
				'op-inventory-0001' => array(
					'client_operation_id' => 'op-inventory-0001',
					'status'              => 'accepted',
					'result_code'         => 'inventory_reserved',
				),
			)
		);
	}

	private function resolution( OfflinePushPayload $payload ): OfflinePushBatchResolutionPlan {
		return ( new OfflinePushBatchResolver() )->resolve(
			$payload,
			array(
				'op-inventory-0001'       => array(
					'inventory' => array(
						'status'     => 'available',
						'rowVersion' => 4,
					),
				),
				'event:event-100'         => array(
					'event' => array(
						'seatsRemaining' => 0,
						'waitlistEnabled' => true,
						'rowVersion'     => 9,
					),
				),
				'op-credit-redemption-01' => array(
					'customer' => array(
						'creditBalanceMinorUnits' => 1000,
						'rowVersion'              => 6,
					),
				),
			),
			'2026-06-06T20:00:00Z'
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
				$this->event_checkin_operation_payload(),
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
	private function event_checkin_operation_payload(): array {
		return array(
			'client_operation_id' => 'op-event-checkin-01',
			'device_id'           => 'device-main-01',
			'location_id'         => 3,
			'actor_id'            => 22,
			'operation_type'      => 'event_checkin',
			'entity_type'         => 'event',
			'entity_id'           => 'event-100',
			'base_row_version'    => 9,
			'occurred_at_local'   => '2026-06-06T11:45:00-04:00',
			'queued_at_utc'       => '2026-06-06T15:45:05Z',
			'payload'             => array(
				'registration_public_id' => 'registration-event-100-walkin',
				'checkin_method'         => 'manual_lookup',
			),
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
}
