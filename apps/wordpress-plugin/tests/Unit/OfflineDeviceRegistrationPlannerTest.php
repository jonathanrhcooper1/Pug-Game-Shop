<?php
/**
 * Offline device registration planner tests.
 *
 * @package TCGStorePlatform
 */

namespace TCGStorePlatform\Tests\Unit;

use InvalidArgumentException;
use TCGStorePlatform\Offline\OfflineDevicePairingRequestParser;
use TCGStorePlatform\Offline\OfflineDeviceRegistrationPlanner;
use TCGStorePlatform\Tests\TestCase;

final class OfflineDeviceRegistrationPlannerTest extends TestCase {
	public function test_planner_builds_device_row_response_and_audit_payload(): void {
		$plan = ( new OfflineDeviceRegistrationPlanner() )->plan(
			$this->pairing_request(),
			'device-main-01',
			'test-device-token-abcdefghijklmnopqrstuvwxyz-123456',
			str_repeat( 'a', 64 ),
			'2026-06-06T16:00:00Z',
			'2026-06-07T16:00:00Z'
		);

		$device_row = $plan->device_row();
		$response   = $plan->response_payload();
		$audit      = $plan->audit_payload();

		$this->assert_same( 'device-main-01', $device_row['public_id'] );
		$this->assert_same( 'install-main-01', $device_row['installation_id'] );
		$this->assert_same( 'Front Counter Kiosk', $device_row['device_label'] );
		$this->assert_same( 'kiosk', $device_row['device_mode'] );
		$this->assert_same( 2, $device_row['location_id'] );
		$this->assert_same( 15, $device_row['manager_id'] );
		$this->assert_same( str_repeat( 'a', 64 ), $device_row['token_hash'] );
		$this->assert_same( 'active', $device_row['status'] );
		$this->assert_same( 'device-main-01', $response['device_id'] );
		$this->assert_same( 'test-device-token-abcdefghijklmnopqrstuvwxyz-123456', $response['device_token'] );
		$this->assert_same( '/wp-json/tcg-store/v1/offline/pull', $response['sync_routes']['pull'] );
		$this->assert_true( $response['first_sync_required'] );
		$this->assert_true( $response['branding_sync_required'] );
		$this->assert_same( 'offline_device_registration_planned', $audit['action'] );
		$this->assert_false( array_key_exists( 'device_token', $audit ) );
		$this->assert_false( array_key_exists( 'token_hash', $audit ) );
	}

	public function test_planner_preserves_scopes_and_capabilities(): void {
		$plan = ( new OfflineDeviceRegistrationPlanner() )->plan(
			$this->pairing_request(),
			'device-main-01',
			'test-device-token-abcdefghijklmnopqrstuvwxyz-123456',
			str_repeat( 'b', 64 ),
			'2026-06-06T16:00:00Z',
			'2026-06-07T16:00:00Z'
		);

		$this->assert_same(
			array( 'offline_pull', 'offline_push', 'kiosk' ),
			$plan->device_row()['scopes']
		);
		$this->assert_true( $plan->device_row()['capabilities']['barcode_scanner'] );
		$this->assert_false( $plan->device_row()['capabilities']['label_printer'] );
		$this->assert_same(
			$plan->device_row()['scopes'],
			$plan->response_payload()['scopes']
		);
	}

	public function test_planner_rejects_invalid_generated_credentials(): void {
		$planner = new OfflineDeviceRegistrationPlanner();
		$request = $this->pairing_request();

		$this->assert_throws_invalid_argument(
			static fn () => $planner->plan(
				$request,
				'bad',
				'test-device-token-abcdefghijklmnopqrstuvwxyz-123456',
				str_repeat( 'a', 64 ),
				'2026-06-06T16:00:00Z',
				'2026-06-07T16:00:00Z'
			)
		);

		$this->assert_throws_invalid_argument(
			static fn () => $planner->plan(
				$request,
				'device-main-01',
				'short',
				str_repeat( 'a', 64 ),
				'2026-06-06T16:00:00Z',
				'2026-06-07T16:00:00Z'
			)
		);

		$this->assert_throws_invalid_argument(
			static fn () => $planner->plan(
				$request,
				'device-main-01',
				'test-device-token-abcdefghijklmnopqrstuvwxyz-123456',
				'not-a-hash',
				'2026-06-06T16:00:00Z',
				'2026-06-07T16:00:00Z'
			)
		);
	}

	public function test_planner_rejects_invalid_expiry_windows(): void {
		$planner = new OfflineDeviceRegistrationPlanner();
		$request = $this->pairing_request();

		$this->assert_throws_invalid_argument(
			static fn () => $planner->plan(
				$request,
				'device-main-01',
				'test-device-token-abcdefghijklmnopqrstuvwxyz-123456',
				str_repeat( 'a', 64 ),
				'2026-06-06T16:00:00-04:00',
				'2026-06-07T16:00:00Z'
			)
		);

		$this->assert_throws_invalid_argument(
			static fn () => $planner->plan(
				$request,
				'device-main-01',
				'test-device-token-abcdefghijklmnopqrstuvwxyz-123456',
				str_repeat( 'a', 64 ),
				'2026-06-06T16:00:00Z',
				'2026-06-06T16:00:00Z'
			)
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
				'app_version'      => '0.45.0',
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
