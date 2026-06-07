<?php
/**
 * Offline device pairing authorizer tests.
 *
 * @package TCGStorePlatform
 */

namespace TCGStorePlatform\Tests\Unit;

use TCGStorePlatform\Offline\OfflineDevicePairingAuthorizationResult;
use TCGStorePlatform\Offline\OfflineDevicePairingAuthorizer;
use TCGStorePlatform\Offline\OfflineDevicePairingPermissionCallbackAdapter;
use TCGStorePlatform\Offline\OfflineDevicePairingRequest;
use TCGStorePlatform\Offline\OfflineDevicePairingRequestParser;
use TCGStorePlatform\Tests\TestCase;

final class OfflineDevicePairingAuthorizerTest extends TestCase {
	private const PAIRING_CODE = 'PAIR-2026-STAGING';

	public function test_authorizer_accepts_matching_hashed_code_manager_location_scope_and_expiry(): void {
		$authorizer = new OfflineDevicePairingAuthorizer(
			$this->policy(),
			static fn (): string => '2026-06-06T18:00:00Z'
		);

		$result = $authorizer->authorize( $this->pairing_request(), array( 'body_param_count' => 11 ) );
		$audit  = $result->audit_payload();

		$this->assert_true( $result->is_authorized() );
		$this->assert_same( array(), $result->errors() );
		$this->assert_same( 'authorized', $audit['status'] );
		$this->assert_same(
			substr( hash( 'sha256', self::PAIRING_CODE ), 0, 12 ),
			$audit['pairing_code_fingerprint']
		);
		$this->assert_same( 1, $audit['policy']['pairing_code_hash_count'] );
		$this->assert_same( 11, $audit['request_context']['body_param_count'] );
		$this->assert_not_contains( self::PAIRING_CODE, (string) json_encode( $audit ) );
		$this->assert_not_contains( hash( 'sha256', self::PAIRING_CODE ), (string) json_encode( $audit ) );
	}

	public function test_authorizer_rejects_bad_code_manager_location_scopes_and_expiry(): void {
		$result = ( new OfflineDevicePairingAuthorizer(
			$this->policy(
				array(
					'pairing_code_hashes'    => array( hash( 'sha256', 'PAIR-OTHER-CODE' ) ),
					'manager_ids'            => array( 99 ),
					'location_ids'           => array( 3 ),
					'allowed_scopes_by_mode' => array(
						'kiosk' => array( 'offline_pull' ),
					),
					'expires_at_utc'         => '2026-06-06T17:59:59Z',
				)
			),
			static fn (): string => '2026-06-06T18:00:00Z'
		) )->authorize( $this->pairing_request() );

		$audit = $result->audit_payload();

		$this->assert_false( $result->is_authorized() );
		$this->assert_true( in_array( 'pairing_code_denied', $result->errors(), true ) );
		$this->assert_true( in_array( 'manager_not_allowed', $result->errors(), true ) );
		$this->assert_true( in_array( 'location_not_allowed', $result->errors(), true ) );
		$this->assert_true( in_array( 'requested_scope_not_allowed', $result->errors(), true ) );
		$this->assert_true( in_array( 'pairing_code_expired', $result->errors(), true ) );
		$this->assert_same( array( 'offline_push', 'kiosk' ), $audit['denied_scopes'] );
		$this->assert_same( 'denied', $audit['status'] );
		$this->assert_not_contains( self::PAIRING_CODE, (string) json_encode( $audit ) );
	}

	public function test_authorizer_rejects_unconfigured_policy_without_raw_secret_leakage(): void {
		$result = ( new OfflineDevicePairingAuthorizer(
			array(),
			static fn (): string => 'not-now'
		) )->authorize( $this->pairing_request() );

		$audit = $result->audit_payload();

		$this->assert_false( $result->is_authorized() );
		$this->assert_true( in_array( 'pairing_code_policy_not_configured', $result->errors(), true ) );
		$this->assert_true( in_array( 'manager_policy_not_configured', $result->errors(), true ) );
		$this->assert_true( in_array( 'location_policy_not_configured', $result->errors(), true ) );
		$this->assert_true( in_array( 'scope_policy_not_configured', $result->errors(), true ) );
		$this->assert_true( in_array( 'pairing_code_expiry_not_configured', $result->errors(), true ) );
		$this->assert_same( 'not-now', $audit['now_utc'] );
		$this->assert_not_contains( self::PAIRING_CODE, (string) json_encode( $audit ) );
	}

	public function test_authorizer_can_be_injected_into_pairing_permission_callback(): void {
		$authorizer = new OfflineDevicePairingAuthorizer(
			$this->policy(),
			static fn (): string => '2026-06-06T18:00:00Z'
		);
		$adapter    = new OfflineDevicePairingPermissionCallbackAdapter( null, $authorizer );

		$this->assert_true( $adapter->authorize( array( 'body' => $this->pairing_payload() ) ) );

		$result = $authorizer->last_result();
		$audit  = $adapter->last_audit_payload();

		$this->assert_true( $result instanceof OfflineDevicePairingAuthorizationResult );
		$this->assert_true( $result->is_authorized() );
		$this->assert_same( 'authorized', $audit['status'] );
		$this->assert_same( true, $audit['authorizer_configured'] );
	}

	/**
	 * @param array<string, mixed> $overrides Policy overrides.
	 * @return array<string, mixed>
	 */
	private function policy( array $overrides = array() ): array {
		return array_merge(
			array(
				'pairing_code_hashes'    => array( hash( 'sha256', self::PAIRING_CODE ) ),
				'manager_ids'            => array( 42 ),
				'location_ids'           => array( 2 ),
				'allowed_scopes_by_mode' => array(
					'kiosk' => array( 'offline_pull', 'offline_push', 'kiosk' ),
					'staff' => array( 'offline_pull', 'offline_push', 'inventory', 'events', 'buylist' ),
					'admin' => array(
						'offline_pull',
						'offline_push',
						'inventory',
						'customer_credit',
						'events',
						'buylist',
						'conflicts',
					),
				),
				'expires_at_utc'         => '2026-06-06T19:00:00Z',
			),
			$overrides
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
			'app_version'      => '0.85.0',
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
