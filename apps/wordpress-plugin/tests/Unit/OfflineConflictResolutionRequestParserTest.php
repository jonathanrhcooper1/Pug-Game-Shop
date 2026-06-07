<?php
/**
 * Offline conflict resolution request parser tests.
 *
 * @package TCGStorePlatform
 */

namespace TCGStorePlatform\Tests\Unit;

use TCGStorePlatform\Offline\OfflineConflictResolutionRequestParser;
use TCGStorePlatform\Tests\TestCase;

final class OfflineConflictResolutionRequestParserTest extends TestCase {
	public function test_parser_builds_resolution_request_from_valid_payload(): void {
		$result = ( new OfflineConflictResolutionRequestParser() )->parse(
			'conflict-main-01',
			array(
				'device_id'                 => 'device-main-01',
				'manager_id'                => '15',
				'resolution_action'         => 'Accept_Device',
				'resolution_note'           => " Use staff verified scan \n outcome ",
				'expected_conflict_version' => '12',
				'resolved_at_utc'           => '2026-06-06T17:00:00Z',
				'resolution_payload'        => array(
					'accepted_inventory_status' => 'sold',
				),
				'schema_version'            => 1,
			),
			'resolution-main-01'
		);

		$this->assert_true( $result->is_valid() );

		$request = $result->request();

		$this->assert_true( null !== $request );
		$this->assert_same( 'conflict-main-01', $request->conflict_id() );
		$this->assert_same( 'resolution-main-01', $request->resolution_id() );
		$this->assert_same( 'device-main-01', $request->device_id() );
		$this->assert_same( 15, $request->manager_id() );
		$this->assert_same( 'accept_device', $request->resolution_action() );
		$this->assert_same( 'Use staff verified scan outcome', $request->resolution_note() );
		$this->assert_same( 12, $request->expected_conflict_version() );
		$this->assert_same( '2026-06-06T17:00:00Z', $request->resolved_at_utc() );
		$this->assert_same( 'sold', $request->resolution_payload()['accepted_inventory_status'] );
		$this->assert_same( 1, $request->schema_version() );
	}

	public function test_parser_uses_payload_resolution_id_fallback(): void {
		$result = ( new OfflineConflictResolutionRequestParser() )->parse(
			'conflict-main-01',
			array(
				'resolution_id'             => 'resolution-fallback-01',
				'device_id'                 => 'device-main-01',
				'manager_id'                => 15,
				'resolution_action'         => 'accept_server',
				'expected_conflict_version' => 3,
				'resolved_at_utc'           => '2026-06-06T17:00:00Z',
				'schema_version'            => 1,
			)
		);

		$this->assert_true( $result->is_valid() );
		$this->assert_same( 'resolution-fallback-01', $result->request()?->resolution_id() );
		$this->assert_same( array(), $result->request()?->resolution_payload() );
	}

	public function test_parser_rejects_missing_required_fields_and_shapes(): void {
		$result = ( new OfflineConflictResolutionRequestParser() )->parse(
			'',
			array(
				'resolution_payload' => 'not-an-object',
			)
		);

		$this->assert_false( $result->is_valid() );
		$this->assert_true( in_array( 'conflict_id_required', $result->errors(), true ) );
		$this->assert_true( in_array( 'resolution_id_required', $result->errors(), true ) );
		$this->assert_true( in_array( 'device_id_required', $result->errors(), true ) );
		$this->assert_true( in_array( 'manager_id_required', $result->errors(), true ) );
		$this->assert_true( in_array( 'expected_conflict_version_required', $result->errors(), true ) );
		$this->assert_true( in_array( 'schema_version_required', $result->errors(), true ) );
		$this->assert_true( in_array( 'resolution_action_unsupported', $result->errors(), true ) );
		$this->assert_true( in_array( 'resolved_at_utc_invalid', $result->errors(), true ) );
		$this->assert_true( in_array( 'resolution_payload_must_be_object', $result->errors(), true ) );
	}

	public function test_parser_rejects_invalid_resolution_payloads(): void {
		$result = ( new OfflineConflictResolutionRequestParser() )->parse(
			'bad',
			array(
				'idempotency_key'            => 'bad key',
				'device_id'                 => 'bad',
				'manager_id'                => 0,
				'resolution_action'         => 'manager_adjust',
				'resolution_note'           => '',
				'expected_conflict_version' => 'zero',
				'resolved_at_utc'           => 'tomorrow',
				'resolution_payload'        => array(),
				'schema_version'            => 2,
			)
		);

		$this->assert_false( $result->is_valid() );
		$this->assert_true( in_array( 'conflict_id_invalid', $result->errors(), true ) );
		$this->assert_true( in_array( 'resolution_id_invalid', $result->errors(), true ) );
		$this->assert_true( in_array( 'device_id_invalid', $result->errors(), true ) );
		$this->assert_true( in_array( 'manager_id_invalid', $result->errors(), true ) );
		$this->assert_true( in_array( 'expected_conflict_version_invalid', $result->errors(), true ) );
		$this->assert_true( in_array( 'resolved_at_utc_invalid', $result->errors(), true ) );
		$this->assert_true( in_array( 'schema_version_unsupported', $result->errors(), true ) );
		$this->assert_true( in_array( 'resolution_note_required', $result->errors(), true ) );
		$this->assert_true( in_array( 'resolution_payload_required', $result->errors(), true ) );
	}
}
