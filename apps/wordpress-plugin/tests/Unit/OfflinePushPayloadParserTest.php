<?php
/**
 * Offline push payload parser tests.
 *
 * @package TCGStorePlatform
 */

namespace TCGStorePlatform\Tests\Unit;

use TCGStorePlatform\Offline\OfflinePushPayloadParser;
use TCGStorePlatform\Tests\TestCase;

final class OfflinePushPayloadParserTest extends TestCase {
	public function test_parser_builds_offline_push_payload_from_valid_batch(): void {
		$result = ( new OfflinePushPayloadParser() )->parse(
			array(
				'batch_id'   => 'body-batch-ignored',
				'device_id'  => 'device-main-01',
				'operations' => array(
					array(
						'client_operation_id'   => 'op-00001',
						'device_id'             => 'device-main-01',
						'location_id'           => '3',
						'actor_id'              => 22,
						'operation_type'        => 'inventory_reservation',
						'entity_type'           => 'inventory',
						'entity_id'             => '1001',
						'base_row_version'      => '4',
						'occurred_at_local'     => '2026-06-06T10:15:00-04:00',
						'queued_at_utc'         => '2026-06-06T14:15:05Z',
						'payload'               => array(
							'localStatus' => 'offline_pending_sync',
						),
						'authorization_context' => array(
							'manager_user_id' => 91,
						),
						'schema_version'        => 1,
					),
				),
			),
			'batch-header-01'
		);

		$this->assert_true( $result->is_valid() );

		$payload = $result->payload();

		$this->assert_true( null !== $payload );
		$this->assert_same( 'batch-header-01', $payload->batch_id() );
		$this->assert_same( 'device-main-01', $payload->device_id() );
		$this->assert_same( 1, count( $payload->operations() ) );

		$operation = $payload->operations()[0];

		$this->assert_same( 'op-00001', $operation->client_operation_id() );
		$this->assert_same( 'op-00001', $operation->idempotency_key() );
		$this->assert_same( 3, $operation->location_id() );
		$this->assert_same( 22, $operation->actor_id() );
		$this->assert_same( 'inventory_reservation', $operation->operation_type() );
		$this->assert_same( 'inventory', $operation->entity_type() );
		$this->assert_same( '1001', $operation->entity_id() );
		$this->assert_same( 4, $operation->base_row_version() );
		$this->assert_same( 'offline_pending_sync', $operation->payload()['localStatus'] );
		$this->assert_same( 91, $operation->authorization_context()['manager_user_id'] );
	}

	public function test_parser_rejects_missing_batch_device_and_operations(): void {

		$result = ( new OfflinePushPayloadParser() )->parse( array() );
		$this->assert_false( $result->is_valid() );
		$this->assert_true( in_array( 'batch_id_required', $result->errors(), true ) );
		$this->assert_true( in_array( 'device_id_required', $result->errors(), true ) );
		$this->assert_true( in_array( 'operations_required', $result->errors(), true ) );
	}

	public function test_parser_accepts_inventory_update_operation_type(): void {

		$result = ( new OfflinePushPayloadParser() )->parse(
			array(
				'batch_id'   => 'batch-inventory-update-01',
				'device_id'  => 'device-main-01',
				'operations' => array(
					array(
						'client_operation_id'   => 'op-update-01',
						'device_id'             => 'device-main-01',
						'location_id'           => 3,
						'actor_id'              => 22,
						'operation_type'        => 'inventory_update',
						'entity_type'           => 'inventory',
						'entity_id'             => 'inv-1001',
						'base_row_version'      => 4,
						'occurred_at_local'     => '2026-06-06T10:15:00-04:00',
						'queued_at_utc'         => '2026-06-06T14:15:05Z',
						'payload'               => array(
							'barcode'           => 'PKM-BASE-004-HOLO',
							'status'            => 'available',
							'location'          => 'Case A3',
							'price_minor_units' => 12500,
						),
						'authorization_context' => array(
							'source' => 'offline_app',
						),
						'schema_version'        => 1,
					),
				),
			)
		);

		$this->assert_true( $result->is_valid() );

		$payload = $result->payload();

		$this->assert_true( null !== $payload );
			$this->assert_same( 'inventory_update', $payload->operations()[0]->operation_type() );
		$this->assert_same( 'inventory', $payload->operations()[0]->entity_type() );
		$this->assert_same( 12500, $payload->operations()[0]->payload()['price_minor_units'] );
	}

	public function test_parser_accepts_event_checkin_operation_type(): void {

		$result = ( new OfflinePushPayloadParser() )->parse(
			array(
				'batch_id'   => 'batch-event-checkin-01',
				'device_id'  => 'device-main-01',
				'operations' => array(
					array(
						'client_operation_id' => 'op-checkin-01',
						'device_id'           => 'device-main-01',
						'location_id'         => 3,
						'actor_id'            => 22,
						'operation_type'      => 'event_checkin',
						'entity_type'         => 'event',
						'entity_id'           => 'event-100',
						'base_row_version'    => 9,
						'occurred_at_local'   => '2026-06-06T10:15:00-04:00',
						'queued_at_utc'       => '2026-06-06T14:15:05Z',
						'payload'             => array(
							'registration_public_id' => 'registration-event-100-walkin',
							'checkin_method'         => 'manual_lookup',
						),
						'schema_version'      => 1,
					),
				),
			)
		);

		$this->assert_true( $result->is_valid() );

		$payload = $result->payload();

		$this->assert_true( null !== $payload );
		$this->assert_same( 'event_checkin', $payload->operations()[0]->operation_type() );
		$this->assert_same( 'event', $payload->operations()[0]->entity_type() );
		$this->assert_same( 'manual_lookup', $payload->operations()[0]->payload()['checkin_method'] );
	}

	public function test_parser_rejects_duplicate_operation_ids_and_device_mismatch(): void {

		$result = ( new OfflinePushPayloadParser() )->parse(
			array(
				'batch_id'   => 'batch-duplicate-01',
				'device_id'  => 'device-main-01',
				'operations' => array(
					$this->operation_payload( 'op-dup-01', 'device-main-01' ),
					$this->operation_payload( 'op-dup-01', 'device-other-01' ),
				),
			)
		);

		$this->assert_false( $result->is_valid() );
		$this->assert_true( in_array( 'operations_1_client_operation_id_duplicate', $result->errors(), true ) );
		$this->assert_true( in_array( 'operations_1_device_id_mismatch', $result->errors(), true ) );
	}

	public function test_parser_rejects_malformed_operation_envelopes(): void {
		$result = ( new OfflinePushPayloadParser() )->parse(
			array(
				'batch_id'   => 'batch-invalid-01',
				'device_id'  => 'device-main-01',
				'operations' => array(
					array(
						'client_operation_id'   => 'bad',
						'device_id'             => 'device-main-01',
						'location_id'           => 0,
						'actor_id'              => 'cashier',
						'operation_type'        => 'price_override',
						'entity_type'           => 'inventory',
						'entity_id'             => '',
						'base_row_version'      => -1,
						'occurred_at_local'     => '2026-06-06 10:15:00',
						'queued_at_utc'         => '2026-06-06T14:15:05-04:00',
						'payload'               => 'not-an-object',
						'authorization_context' => 'not-an-object',
						'schema_version'        => 2,
					),
				),
			)
		);

		$this->assert_false( $result->is_valid() );
		$this->assert_true( in_array( 'operations_0_client_operation_id_invalid', $result->errors(), true ) );
		$this->assert_true( in_array( 'operations_0_location_id_invalid', $result->errors(), true ) );
		$this->assert_true( in_array( 'operations_0_actor_id_invalid', $result->errors(), true ) );
		$this->assert_true( in_array( 'operations_0_operation_type_unsupported', $result->errors(), true ) );
		$this->assert_true( in_array( 'operations_0_entity_id_required', $result->errors(), true ) );
		$this->assert_true( in_array( 'operations_0_base_row_version_invalid', $result->errors(), true ) );
		$this->assert_true( in_array( 'operations_0_occurred_at_local_invalid', $result->errors(), true ) );
		$this->assert_true( in_array( 'operations_0_queued_at_utc_invalid', $result->errors(), true ) );
		$this->assert_true( in_array( 'operations_0_payload_must_be_object', $result->errors(), true ) );
		$this->assert_true( in_array( 'operations_0_authorization_context_must_be_object', $result->errors(), true ) );
		$this->assert_true( in_array( 'operations_0_schema_version_unsupported', $result->errors(), true ) );
	}

		/**
		 * @return array<string, mixed>
		 */
	private function operation_payload( string $operation_id, string $device_id ): array {
		return array(
			'client_operation_id' => $operation_id,
			'device_id'           => $device_id,
			'operation_type'      => 'event_reservation',
			'entity_type'         => 'event',
			'entity_id'           => 'event-100',
			'occurred_at_local'   => '2026-06-06T11:00:00-04:00',
			'queued_at_utc'       => '2026-06-06T15:00:00Z',
			'payload'             => array(),
			'schema_version'      => 1,
		);
	}
}
