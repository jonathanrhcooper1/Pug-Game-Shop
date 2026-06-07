<?php
/**
 * Offline device pairing permission callback adapter tests.
 *
 * @package TCGStorePlatform
 */

namespace TCGStorePlatform\Tests\Unit;

use TCGStorePlatform\Offline\OfflineDevicePairingPermissionCallbackAdapter;
use TCGStorePlatform\Offline\OfflineDevicePairingRequest;
use TCGStorePlatform\Tests\TestCase;

final class OfflineDevicePairingPermissionCallbackAdapterTest extends TestCase {
	private const PAIRING_CODE = 'PAIR-2026-READY';

	public function test_callback_reports_authorizer_configuration(): void {
		$this->assert_false( ( new OfflineDevicePairingPermissionCallbackAdapter() )->is_configured() );
		$this->assert_true(
			( new OfflineDevicePairingPermissionCallbackAdapter( null, static fn (): bool => true ) )->is_configured()
		);
	}

	public function test_callback_authorizes_valid_pairing_request_with_injected_authorizer(): void {
		$authorizer_calls = 0;
		$adapter          = new OfflineDevicePairingPermissionCallbackAdapter(
			null,
			function ( OfflineDevicePairingRequest $request, array $context ) use ( &$authorizer_calls ): bool {
				++$authorizer_calls;

				$this->assert_same( self::PAIRING_CODE, $request->pairing_code() );
				$this->assert_same( 11, $context['body_param_count'] );

				return 42 === $request->manager_id()
					&& 2 === $request->location_id()
					&& in_array( 'offline_pull', $request->requested_scopes(), true );
			}
		);

		$allowed = $adapter(
			array(
				'body' => $this->pairing_payload(),
			)
		);
		$audit   = $adapter->last_audit_payload();

		$this->assert_true( $allowed );
		$this->assert_same( 1, $authorizer_calls );
		$this->assert_same( 'offline_device_pairing_permission_callback', $audit['action'] );
		$this->assert_same( 'authorized', $audit['status'] );
		$this->assert_same( array(), $audit['errors'] );
		$this->assert_true( $audit['authorizer_configured'] );
		$this->assert_same( 'kiosk', $audit['device_mode'] );
		$this->assert_not_contains( self::PAIRING_CODE, (string) json_encode( $audit ) );
	}

	public function test_callback_denies_invalid_payload_before_authorizer(): void {
		$authorizer_calls = 0;
		$adapter          = new OfflineDevicePairingPermissionCallbackAdapter(
			null,
			static function () use ( &$authorizer_calls ): bool {
				++$authorizer_calls;

				return true;
			}
		);

		$allowed = $adapter(
			array(
				'body' => array(),
			)
		);
		$audit   = $adapter->last_audit_payload();

		$this->assert_false( $allowed );
		$this->assert_same( 0, $authorizer_calls );
		$this->assert_same( 'invalid', $audit['status'] );
		$this->assert_true( in_array( 'pairing_code_required', $audit['errors'], true ) );
	}

	public function test_callback_denies_when_authorizer_is_not_configured(): void {
		$adapter = new OfflineDevicePairingPermissionCallbackAdapter();

		$allowed = $adapter(
			array(
				'body' => $this->pairing_payload(),
			)
		);
		$audit   = $adapter->last_audit_payload();

		$this->assert_false( $allowed );
		$this->assert_same( 'denied', $audit['status'] );
		$this->assert_same( array( 'pairing_authorizer_not_configured' ), $audit['errors'] );
		$this->assert_false( $audit['authorizer_configured'] );
		$this->assert_not_contains( self::PAIRING_CODE, (string) json_encode( $audit ) );
	}

	public function test_callback_denies_authorizer_rejection(): void {
		$adapter = new OfflineDevicePairingPermissionCallbackAdapter(
			null,
			static fn ( OfflineDevicePairingRequest $request ): bool => 'admin' === $request->device_mode()
		);

		$allowed = $adapter(
			array(
				'body' => $this->pairing_payload(),
			)
		);
		$audit   = $adapter->last_audit_payload();

		$this->assert_false( $allowed );
		$this->assert_same( 'denied', $audit['status'] );
		$this->assert_same( array( 'pairing_authorization_denied' ), $audit['errors'] );
		$this->assert_true( $audit['authorizer_configured'] );
	}

	public function test_callback_denies_authorizer_exceptions_without_leaking_details(): void {
		$adapter = new OfflineDevicePairingPermissionCallbackAdapter(
			null,
			static function (): bool {
				throw new \RuntimeException( 'pairing code leaked in exception context' );
			}
		);

		$allowed = $adapter(
			array(
				'body' => $this->pairing_payload(),
			)
		);
		$audit   = $adapter->last_audit_payload();

		$this->assert_false( $allowed );
		$this->assert_same( array( 'pairing_authorizer_failed' ), $audit['errors'] );
		$this->assert_not_contains( 'leaked', (string) json_encode( $audit ) );
	}

	/**
	 * @return array<string, mixed>
	 */
	private function pairing_payload(): array {
		return array(
			'pairing_code'     => self::PAIRING_CODE,
			'installation_id'  => 'front-counter-install',
			'device_label'     => 'Front Counter Kiosk',
			'device_mode'      => 'kiosk',
			'location_id'      => 2,
			'manager_id'       => 42,
			'app_version'      => '0.114.0',
			'platform'         => 'windows',
			'capabilities'     => array(
				'barcode_scanner' => true,
				'label_printer'   => false,
			),
			'requested_scopes' => array( 'offline_pull', 'offline_push', 'kiosk' ),
			'schema_version'   => 1,
		);
	}
}
