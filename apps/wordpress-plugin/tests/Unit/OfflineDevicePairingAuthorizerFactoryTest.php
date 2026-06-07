<?php
/**
 * Offline device pairing authorizer factory tests.
 *
 * @package TCGStorePlatform
 */

namespace TCGStorePlatform\Tests\Unit;

use RuntimeException;
use TCGStorePlatform\Offline\OfflineDevicePairingAuthorizerFactory;
use TCGStorePlatform\Offline\OfflineDevicePairingRequest;
use TCGStorePlatform\Offline\OfflineDevicePairingRequestParser;
use TCGStorePlatform\Tests\TestCase;

final class OfflineDevicePairingAuthorizerFactoryTest extends TestCase {
	private const PAIRING_CODE = 'PAIR-2026-SETTINGS';

	public function test_factory_builds_permission_callback_from_sanitized_settings_policy(): void {
		$settings = array(
			'offline_pairing_authorization' => $this->policy(),
		);
		$factory  = new OfflineDevicePairingAuthorizerFactory(
			static fn (): array => $settings,
			static fn (): string => '2026-06-06T18:30:00Z'
		);
		$callback = $factory->permission_callback();

		$this->assert_true( $callback->is_configured() );
		$this->assert_true( $callback( array( 'body' => $this->pairing_payload() ) ) );

		$audit  = $callback->last_audit_payload();
		$policy = $factory->policy();

		$this->assert_same( 'authorized', $audit['status'] );
		$this->assert_same( array( hash( 'sha256', self::PAIRING_CODE ) ), $policy['pairing_code_hashes'] );
		$this->assert_same( array( 'offline_pull', 'offline_push', 'kiosk' ), $policy['allowed_scopes_by_mode']['kiosk'] );
		$this->assert_false( isset( $policy['pairing_code'] ) );
		$this->assert_not_contains( self::PAIRING_CODE, (string) json_encode( $audit ) );
		$this->assert_not_contains( hash( 'sha256', self::PAIRING_CODE ), (string) json_encode( $audit ) );
	}

	public function test_factory_ignores_raw_pairing_code_settings_and_fails_closed(): void {
		$factory = new OfflineDevicePairingAuthorizerFactory(
			static fn (): array => array(
				'offline_pairing_authorization' => array(
					'pairing_code'           => self::PAIRING_CODE,
					'manager_ids'            => array( 42 ),
					'location_ids'           => array( 2 ),
					'allowed_scopes_by_mode' => array(
						'kiosk' => array( 'offline_pull', 'offline_push', 'kiosk' ),
					),
					'expires_at_utc'         => '2026-06-06T19:00:00Z',
				),
			),
			static fn (): string => '2026-06-06T18:30:00Z'
		);
		$policy  = $factory->policy();
		$result  = $factory->authorizer()->authorize( $this->pairing_request() );
		$audit   = $result->audit_payload();

		$this->assert_same( array(), $policy['pairing_code_hashes'] );
		$this->assert_false( isset( $policy['pairing_code'] ) );
		$this->assert_false( $result->is_authorized() );
		$this->assert_true( in_array( 'pairing_code_policy_not_configured', $result->errors(), true ) );
		$this->assert_not_contains( self::PAIRING_CODE, (string) json_encode( $audit ) );
	}

	public function test_factory_fails_closed_when_settings_provider_fails(): void {
		$factory = new OfflineDevicePairingAuthorizerFactory(
			static function (): array {
				throw new RuntimeException( 'settings provider included a raw pairing code' );
			},
			static fn (): string => '2026-06-06T18:30:00Z'
		);
		$result  = $factory->authorizer()->authorize( $this->pairing_request() );
		$audit   = $result->audit_payload();

		$this->assert_false( $result->is_authorized() );
		$this->assert_true( in_array( 'pairing_code_policy_not_configured', $result->errors(), true ) );
		$this->assert_true( in_array( 'manager_policy_not_configured', $result->errors(), true ) );
		$this->assert_true( in_array( 'location_policy_not_configured', $result->errors(), true ) );
		$this->assert_not_contains( 'raw pairing code', (string) json_encode( $audit ) );
		$this->assert_not_contains( self::PAIRING_CODE, (string) json_encode( $audit ) );
	}

	/**
	 * @return array<string, mixed>
	 */
	private function policy(): array {
		return array(
			'pairing_code_hashes'    => array( strtoupper( hash( 'sha256', self::PAIRING_CODE ) ) ),
			'manager_ids'            => '42, 42',
			'location_ids'           => array( '2' ),
			'allowed_scopes_by_mode' => array(
				'kiosk' => 'offline_pull offline_push kiosk',
				'staff' => array( 'offline_pull' ),
				'admin' => array( 'offline_pull', 'offline_push', 'inventory', 'conflicts' ),
			),
			'expires_at_utc'         => '2026-06-06T19:00:00Z',
		);
	}

	private function pairing_request(): OfflineDevicePairingRequest {
		$result = ( new OfflineDevicePairingRequestParser() )->parse( $this->pairing_payload() );

		$this->assert_true( $result->is_valid() );

		return $result->request();
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
			'app_version'      => '0.89.0',
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
