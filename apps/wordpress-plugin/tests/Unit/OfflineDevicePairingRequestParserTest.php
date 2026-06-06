<?php
/**
 * Offline device pairing request parser tests.
 *
 * @package TCGStorePlatform
 */

namespace TCGStorePlatform\Tests\Unit;

use TCGStorePlatform\Offline\OfflineDevicePairingRequestParser;
use TCGStorePlatform\Tests\TestCase;

final class OfflineDevicePairingRequestParserTest extends TestCase {
	public function test_parser_builds_pairing_request_with_normalized_fields(): void {
		$result = ( new OfflineDevicePairingRequestParser() )->parse(
			array(
				'pairing_code'     => 'pair-1234',
				'installation_id'  => 'install-main-01',
				'device_label'     => " Front   Counter \t Kiosk ",
				'device_mode'      => 'KIOSK',
				'location_id'      => '2',
				'manager_id'       => 15,
				'app_version'      => '0.42.0',
				'platform'         => 'Windows',
				'capabilities'     => array(
					'barcode_scanner' => true,
					'label_printer'   => false,
					'touchscreen'     => true,
				),
				'requested_scopes' => array( 'offline_pull', 'KIOSK', 'offline_pull' ),
				'schema_version'   => 1,
			)
		);

		$this->assert_true( $result->is_valid() );

		$request = $result->request();

		$this->assert_true( null !== $request );
		$this->assert_same( 'PAIR-1234', $request->pairing_code() );
		$this->assert_same( 'install-main-01', $request->installation_id() );
		$this->assert_same( 'Front Counter Kiosk', $request->device_label() );
		$this->assert_same( 'kiosk', $request->device_mode() );
		$this->assert_same( 2, $request->location_id() );
		$this->assert_same( 15, $request->manager_id() );
		$this->assert_same( '0.42.0', $request->app_version() );
		$this->assert_same( 'windows', $request->platform() );
		$this->assert_true( $request->capabilities()['barcode_scanner'] );
		$this->assert_false( $request->capabilities()['label_printer'] );
		$this->assert_same( array( 'offline_pull', 'kiosk' ), $request->requested_scopes() );
		$this->assert_same( 1, $request->schema_version() );
	}

	public function test_parser_rejects_missing_core_pairing_fields(): void {
		$result = ( new OfflineDevicePairingRequestParser() )->parse( array() );

		$this->assert_false( $result->is_valid() );
		$this->assert_true( in_array( 'pairing_code_required', $result->errors(), true ) );
		$this->assert_true( in_array( 'installation_id_required', $result->errors(), true ) );
		$this->assert_true( in_array( 'device_label_required', $result->errors(), true ) );
		$this->assert_true( in_array( 'device_mode_unsupported', $result->errors(), true ) );
		$this->assert_true( in_array( 'location_id_required', $result->errors(), true ) );
		$this->assert_true( in_array( 'manager_id_required', $result->errors(), true ) );
		$this->assert_true( in_array( 'app_version_required', $result->errors(), true ) );
		$this->assert_true( in_array( 'platform_unsupported', $result->errors(), true ) );
		$this->assert_true( in_array( 'capabilities_required', $result->errors(), true ) );
		$this->assert_true( in_array( 'requested_scopes_required', $result->errors(), true ) );
		$this->assert_true( in_array( 'schema_version_required', $result->errors(), true ) );
	}

	public function test_parser_rejects_invalid_pairing_shapes(): void {
		$result = ( new OfflineDevicePairingRequestParser() )->parse(
			array(
				'pairing_code'     => 'bad code',
				'installation_id'  => 'bad',
				'device_label'     => 'x',
				'device_mode'      => 'warehouse',
				'location_id'      => 0,
				'manager_id'       => 'manager',
				'app_version'      => 'v1',
				'platform'         => 'linux',
				'capabilities'     => array(
					'barcode_scanner' => 'yes',
					'gps'             => true,
				),
				'requested_scopes' => array( 'offline_pull', 'payments' ),
				'schema_version'   => 2,
			)
		);

		$this->assert_false( $result->is_valid() );
		$this->assert_true( in_array( 'pairing_code_invalid', $result->errors(), true ) );
		$this->assert_true( in_array( 'installation_id_invalid', $result->errors(), true ) );
		$this->assert_true( in_array( 'device_label_invalid', $result->errors(), true ) );
		$this->assert_true( in_array( 'device_mode_unsupported', $result->errors(), true ) );
		$this->assert_true( in_array( 'location_id_invalid', $result->errors(), true ) );
		$this->assert_true( in_array( 'manager_id_invalid', $result->errors(), true ) );
		$this->assert_true( in_array( 'app_version_invalid', $result->errors(), true ) );
		$this->assert_true( in_array( 'platform_unsupported', $result->errors(), true ) );
		$this->assert_true( in_array( 'capabilities_barcode_scanner_invalid', $result->errors(), true ) );
		$this->assert_true( in_array( 'capabilities_gps_unsupported', $result->errors(), true ) );
		$this->assert_true( in_array( 'requested_scopes_1_unsupported', $result->errors(), true ) );
		$this->assert_true( in_array( 'schema_version_unsupported', $result->errors(), true ) );
	}

	public function test_parser_accepts_staff_and_admin_modes_with_supported_scopes(): void {
		$staff = ( new OfflineDevicePairingRequestParser() )->parse(
			$this->valid_payload(
				array(
					'device_mode'      => 'staff',
					'requested_scopes' => array( 'offline_pull', 'offline_push', 'inventory', 'events' ),
				)
			)
		);

		$admin = ( new OfflineDevicePairingRequestParser() )->parse(
			$this->valid_payload(
				array(
					'device_mode'      => 'admin',
					'requested_scopes' => array( 'conflicts', 'customer_credit', 'buylist' ),
				)
			)
		);

		$this->assert_true( $staff->is_valid() );
		$this->assert_true( $admin->is_valid() );
		$this->assert_same( 'staff', $staff->request()?->device_mode() );
		$this->assert_same( 'admin', $admin->request()?->device_mode() );
	}

	/**
	 * @param array<string, mixed> $overrides Payload overrides.
	 * @return array<string, mixed>
	 */
	private function valid_payload( array $overrides = array() ): array {
		return array_merge(
			array(
				'pairing_code'     => 'PAIR-1234',
				'installation_id'  => 'install-main-01',
				'device_label'     => 'Front Counter Kiosk',
				'device_mode'      => 'kiosk',
				'location_id'      => 2,
				'manager_id'       => 15,
				'app_version'      => '0.42.0',
				'platform'         => 'windows',
				'capabilities'     => array(
					'barcode_scanner' => true,
					'label_printer'   => false,
				),
				'requested_scopes' => array( 'offline_pull', 'kiosk' ),
				'schema_version'   => 1,
			),
			$overrides
		);
	}
}
