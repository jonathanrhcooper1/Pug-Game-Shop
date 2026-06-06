<?php
/**
 * Offline registered device row normalizer tests.
 *
 * @package TCGStorePlatform
 */

namespace TCGStorePlatform\Tests\Unit;

use TCGStorePlatform\Offline\OfflineRegisteredDeviceRowNormalizer;
use TCGStorePlatform\Tests\TestCase;

final class OfflineRegisteredDeviceRowNormalizerTest extends TestCase {
	public function test_normalizer_builds_auth_ready_row_from_database_fields(): void {
		$result = ( new OfflineRegisteredDeviceRowNormalizer() )->normalize( $this->database_row() );

		$row   = $result->device_row();
		$audit = $result->audit_payload();

		$this->assert_true( $result->is_valid() );
		$this->assert_same( 42, $row['offline_device_id'] );
		$this->assert_same( 'device-main-01', $row['public_id'] );
		$this->assert_same( 2, $row['location_id'] );
		$this->assert_same( null, $row['manager_user_id'] );
		$this->assert_same( 'kiosk', $row['device_mode'] );
		$this->assert_same( 'active', $row['status'] );
		$this->assert_same( '2026-06-07T16:00:00.123456Z', $row['token_expires_at_utc'] );
		$this->assert_same( null, $row['revoked_at_utc'] );
		$this->assert_same( '2026-06-06T15:30:00Z', $row['last_seen_at_utc'] );
		$this->assert_same( array( 'offline_pull', 'offline_push', 'kiosk' ), $row['scopes'] );
		$this->assert_same(
			array(
				'barcode_scanner' => true,
				'label_printer'   => false,
			),
			$row['capabilities']
		);
		$this->assert_same( 8, $row['row_version'] );
		$this->assert_same( 'offline_registered_device_row_normalized', $audit['action'] );
		$this->assert_true( $audit['is_valid'] );
		$this->assert_true( $audit['has_token_hash'] );
		$this->assert_same( 3, $audit['scope_count'] );
		$this->assert_same( 2, $audit['capability_count'] );
		$this->assert_false( array_key_exists( 'token_hash', $audit ) );
	}

	public function test_normalizer_accepts_decoded_payloads_and_iso_times(): void {
		$result = ( new OfflineRegisteredDeviceRowNormalizer() )->normalize(
			$this->database_row(
				array(
					'offline_device_id'    => 43,
					'manager_user_id'      => '9',
					'token_expires_at_utc' => '2026-06-07T16:00:00Z',
					'revoked_at_utc'       => '2026-06-08T16:00:00Z',
					'last_seen_at_utc'     => null,
					'scopes'               => array( 'offline_pull', 'offline_pull', 'events' ),
					'capabilities'         => array( 'touchscreen' => true ),
				)
			)
		);

		$row = $result->device_row();

		$this->assert_true( $result->is_valid() );
		$this->assert_same( 43, $row['offline_device_id'] );
		$this->assert_same( 9, $row['manager_user_id'] );
		$this->assert_same( '2026-06-08T16:00:00Z', $row['revoked_at_utc'] );
		$this->assert_same( null, $row['last_seen_at_utc'] );
		$this->assert_same( array( 'offline_pull', 'events' ), $row['scopes'] );
		$this->assert_same( array( 'touchscreen' => true ), $row['capabilities'] );
	}

	public function test_normalizer_rejects_invalid_identity_hash_and_times(): void {
		$result = ( new OfflineRegisteredDeviceRowNormalizer() )->normalize(
			$this->database_row(
				array(
					'offline_device_id' => 0,
					'public_id'         => 'bad',
					'location_id'       => null,
					'device_label'      => '',
					'device_mode'       => 'mobile',
					'status'            => '',
					'token_hash'        => 'not-a-hash',
					'token_expires_at'  => 'bad-date',
					'revoked_at'        => 'bad-date',
					'last_seen_at'      => 'bad-date',
					'issued_at'         => 'bad-date',
					'created_at'        => 'bad-date',
					'updated_at'        => 'bad-date',
					'row_version'       => 0,
				)
			)
		);

		$errors = $result->errors();
		$audit  = $result->audit_payload();

		$this->assert_false( $result->is_valid() );
		$this->assert_true( in_array( 'offline_device_id_invalid', $errors, true ) );
		$this->assert_true( in_array( 'public_id_invalid', $errors, true ) );
		$this->assert_true( in_array( 'location_id_invalid', $errors, true ) );
		$this->assert_true( in_array( 'device_label_required', $errors, true ) );
		$this->assert_true( in_array( 'device_mode_unsupported', $errors, true ) );
		$this->assert_true( in_array( 'status_required', $errors, true ) );
		$this->assert_true( in_array( 'token_hash_invalid', $errors, true ) );
		$this->assert_true( in_array( 'token_expires_at_invalid', $errors, true ) );
		$this->assert_true( in_array( 'row_version_invalid', $errors, true ) );
		$this->assert_false( $audit['is_valid'] );
		$this->assert_false( array_key_exists( 'token_hash', $audit ) );
	}

	public function test_normalizer_rejects_bad_json_shapes(): void {
		$bad_json = ( new OfflineRegisteredDeviceRowNormalizer() )->normalize(
			$this->database_row(
				array(
					'scopes_json'       => 'not-json',
					'capabilities_json' => 'not-json',
				)
			)
		);

		$bad_shapes = ( new OfflineRegisteredDeviceRowNormalizer() )->normalize(
			$this->database_row(
				array(
					'scopes_json'       => '{"not":"a-list"}',
					'capabilities_json' => '["not", "an", "object"]',
				)
			)
		);

		$this->assert_false( $bad_json->is_valid() );
		$this->assert_true( in_array( 'scopes_json_invalid', $bad_json->errors(), true ) );
		$this->assert_true( in_array( 'capabilities_json_invalid', $bad_json->errors(), true ) );
		$this->assert_false( $bad_shapes->is_valid() );
		$this->assert_true( in_array( 'scopes_invalid', $bad_shapes->errors(), true ) );
		$this->assert_true( in_array( 'capabilities_0_invalid', $bad_shapes->errors(), true ) );
	}

	/**
	 * @param array<string, mixed> $overrides Row overrides.
	 * @return array<string, mixed>
	 */
	private function database_row( array $overrides = array() ): array {
		return array_merge(
			array(
				'offline_device_id'    => '42',
				'public_id'            => 'device-main-01',
				'location_id'          => '2',
				'manager_user_id'      => null,
				'device_label'         => 'Front Counter Kiosk',
				'device_mode'          => 'KIOSK',
				'token_hash'           => str_repeat( 'a', 64 ),
				'token_expires_at'     => '2026-06-07 16:00:00.123456',
				'scopes_json'          => '["offline_pull","offline_push","kiosk"]',
				'capabilities_json'    => '{"barcode_scanner":true,"label_printer":false}',
				'app_version'          => '0.65.0',
				'platform'             => 'windows',
				'status'               => 'ACTIVE',
				'last_seen_at'         => '2026-06-06 15:30:00',
				'revoked_at'           => null,
				'issued_at'            => '2026-06-06 15:00:00',
				'created_at'           => '2026-06-06 15:00:00',
				'updated_at'           => '2026-06-06 15:15:00',
				'row_version'          => '8',
			),
			$overrides
		);
	}
}
