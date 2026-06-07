<?php
/**
 * Offline device registration insert query builder tests.
 *
 * @package TCGStorePlatform
 */

namespace TCGStorePlatform\Tests\Unit;

use TCGStorePlatform\Offline\OfflineDevicePairingRequestParser;
use TCGStorePlatform\Offline\OfflineDeviceRegistrationInsertQueryBuilder;
use TCGStorePlatform\Offline\OfflineDeviceRegistrationPlan;
use TCGStorePlatform\Offline\OfflineDeviceRegistrationPlanner;
use TCGStorePlatform\Tests\TestCase;

final class OfflineDeviceRegistrationInsertQueryBuilderTest extends TestCase {
	public function test_builder_creates_prepared_insert_from_registration_plan(): void {
		$query_plan = ( new OfflineDeviceRegistrationInsertQueryBuilder() )->build(
			$this->registration_plan(),
			'wp_'
		);
		$sql        = $query_plan->sql_template();
		$args       = $query_plan->prepare_args();
		$audit      = $query_plan->audit_payload();

		$this->assert_true( $query_plan->is_valid() );
		$this->assert_same( 'wp_tcg_offline_devices', $query_plan->table_name() );
		$this->assert_contains( 'INSERT INTO `wp_tcg_offline_devices`', $sql );
		$this->assert_contains( '`public_id`, `location_id`, `manager_user_id`', $sql );
		$this->assert_contains( '`last_seen_at`, `revoked_at`, `issued_at`', $sql );
		$this->assert_contains( 'NULL, NULL, %s, %s, %s, %d', $sql );
		$this->assert_same( 18, count( $query_plan->columns() ) );
		$this->assert_same( 16, count( $args ) );
		$this->assert_same( 'device-main-01', $args[0] );
		$this->assert_same( 2, $args[1] );
		$this->assert_same( 15, $args[2] );
		$this->assert_same( 'Front Counter Kiosk', $args[3] );
		$this->assert_same( 'kiosk', $args[4] );
		$this->assert_same( str_repeat( 'a', 64 ), $args[5] );
		$this->assert_same( '2026-06-07 16:00:00.000000', $args[6] );
		$this->assert_same( '["offline_pull","offline_push","kiosk"]', $args[7] );
		$this->assert_same( '{"barcode_scanner":true,"label_printer":false}', $args[8] );
		$this->assert_same( '0.74.0', $args[9] );
		$this->assert_same( 'windows', $args[10] );
		$this->assert_same( 'active', $args[11] );
		$this->assert_same( '2026-06-06 16:00:00.000000', $args[12] );
		$this->assert_same( '2026-06-06 16:00:00.000000', $args[13] );
		$this->assert_same( '2026-06-06 16:00:00.000000', $args[14] );
		$this->assert_same( 1, $args[15] );
		$this->assert_same( 'offline_device_registration_insert_query_planned', $audit['action'] );
		$this->assert_same( 18, $audit['column_count'] );
		$this->assert_same( 16, $audit['prepare_arg_count'] );
		$this->assert_false( array_key_exists( 'token_hash', $audit ) );
		$this->assert_false( array_key_exists( 'device_token', $audit ) );
	}

	public function test_builder_rejects_invalid_table_prefix_without_sql(): void {
		$query_plan = ( new OfflineDeviceRegistrationInsertQueryBuilder() )->build(
			$this->registration_plan(),
			'wp;drop_'
		);

		$this->assert_false( $query_plan->is_valid() );
		$this->assert_same( '', $query_plan->sql_template() );
		$this->assert_same( array(), $query_plan->prepare_args() );
		$this->assert_true( in_array( 'table_prefix_invalid', $query_plan->errors(), true ) );
	}

	public function test_builder_rejects_malformed_device_rows_without_sql(): void {
		$row                           = $this->registration_plan()->device_row();
		$row['public_id']              = 'device-id-is-too-long-for-schema-char-36';
		$row['token_hash']             = 'not-a-token-hash';
		$row['token_expires_at_utc']   = '2026-06-06T15:00:00Z';
		$row['capabilities']['unsafe'] = 'yes';

		$query_plan = ( new OfflineDeviceRegistrationInsertQueryBuilder() )->build(
			new OfflineDeviceRegistrationPlan( $row, array(), array() ),
			'wp_'
		);
		$errors     = $query_plan->errors();

		$this->assert_false( $query_plan->is_valid() );
		$this->assert_same( '', $query_plan->sql_template() );
		$this->assert_true( in_array( 'public_id_invalid', $errors, true ) );
		$this->assert_true( in_array( 'token_hash_invalid', $errors, true ) );
		$this->assert_true( in_array( 'token_expiry_window_invalid', $errors, true ) );
		$this->assert_true( in_array( 'capabilities_invalid', $errors, true ) );
	}

	public function test_builder_rejects_unexpected_session_state_fields(): void {
		$row                         = $this->registration_plan()->device_row();
		$row['last_seen_at_utc']     = '2026-06-06T17:00:00Z';
		$row['revoked_at_utc']       = '2026-06-06T18:00:00Z';
		$row['status']               = 'revoked';
		$row['scopes'][]             = 'unsafe scope';
		$row['manager_id']           = 0;
		$row['token_expires_at_utc'] = 'bad-time';

		$query_plan = ( new OfflineDeviceRegistrationInsertQueryBuilder() )->build(
			new OfflineDeviceRegistrationPlan( $row, array(), array() ),
			'wp_'
		);
		$errors     = $query_plan->errors();

		$this->assert_false( $query_plan->is_valid() );
		$this->assert_true( in_array( 'last_seen_at_must_be_null', $errors, true ) );
		$this->assert_true( in_array( 'revoked_at_must_be_null', $errors, true ) );
		$this->assert_true( in_array( 'status_invalid', $errors, true ) );
		$this->assert_true( in_array( 'scopes_invalid', $errors, true ) );
		$this->assert_true( in_array( 'manager_user_id_invalid', $errors, true ) );
		$this->assert_true( in_array( 'token_expires_at_invalid', $errors, true ) );
	}

	private function registration_plan(): \TCGStorePlatform\Offline\OfflineDeviceRegistrationPlan {
		return ( new OfflineDeviceRegistrationPlanner() )->plan(
			$this->pairing_request(),
			'device-main-01',
			'test-device-token-abcdefghijklmnopqrstuvwxyz-123456',
			str_repeat( 'a', 64 ),
			'2026-06-06T16:00:00Z',
			'2026-06-07T16:00:00Z'
		);
	}

	private function pairing_request(): \TCGStorePlatform\Offline\OfflineDevicePairingRequest {
		$result = ( new OfflineDevicePairingRequestParser() )->parse(
			array(
				'pairing_code'     => 'PAIR-1234',
				'installation_id'  => 'install-main-01',
				'device_label'     => 'Front Counter Kiosk',
				'device_mode'      => 'kiosk',
				'location_id'      => 2,
				'manager_id'       => 15,
				'app_version'      => '0.74.0',
				'platform'         => 'windows',
				'capabilities'     => array(
					'barcode_scanner' => true,
					'label_printer'   => false,
				),
				'requested_scopes' => array( 'offline_pull', 'offline_push', 'kiosk' ),
				'schema_version'   => 1,
			)
		);

		$this->assert_true( $result->is_valid() );

		return $result->request();
	}
}
