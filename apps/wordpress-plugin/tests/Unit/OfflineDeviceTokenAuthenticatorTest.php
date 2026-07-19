<?php
/**
 * Offline device token authenticator tests.
 *
 * @package TCGStorePlatform
 */

namespace TCGStorePlatform\Tests\Unit;

use TCGStorePlatform\Offline\OfflineDeviceTokenAuthenticator;
use TCGStorePlatform\Tests\TestCase;

final class OfflineDeviceTokenAuthenticatorTest extends TestCase {
	private const DEVICE_TOKEN = 'test-device-token-abcdefghijklmnopqrstuvwxyz-123456';

	public function test_authenticator_accepts_valid_bearer_token_and_scope(): void {
		$decision = ( new OfflineDeviceTokenAuthenticator() )->authenticate(
			array(
				'Authorization' => 'Bearer ' . self::DEVICE_TOKEN,
			),
			$this->device_row(),
			'offline_push',
			'2026-06-06T16:15:00Z'
		);

		$this->assert_true( $decision->is_allowed() );
		$this->assert_same( 42, $decision->context()['offline_device_id'] );
		$this->assert_same( 'device-main-01', $decision->context()['device_id'] );
		$this->assert_same( 'offline_push', $decision->context()['required_scope'] );
		$this->assert_same( 'device_bearer', $decision->context()['auth_type'] );
		$this->assert_true( $decision->context()['token_verified'] );
		$this->assert_same( '2026-06-06T16:15:00Z', $decision->context()['authenticated_at_utc'] );
		$this->assert_false( array_key_exists( 'device_token', $decision->context() ) );
		$this->assert_false( array_key_exists( 'token_hash', $decision->context() ) );
	}

	public function test_authenticator_accepts_normalized_wordpress_header_arrays(): void {
		$decision = ( new OfflineDeviceTokenAuthenticator() )->authenticate(
			array(
				'http-authorization' => array( 'Bearer ' . self::DEVICE_TOKEN ),
			),
			$this->device_row(
				array(
					'offline_device_id' => '43',
				)
			),
			'offline_pull',
			'2026-06-06T16:15:00Z'
		);

		$this->assert_true( $decision->is_allowed() );
		$this->assert_same( 43, $decision->context()['offline_device_id'] );
		$this->assert_same( 'offline_pull', $decision->context()['required_scope'] );
	}

	public function test_authenticator_rejects_missing_malformed_or_short_tokens(): void {
		$authenticator = new OfflineDeviceTokenAuthenticator();

		$missing = $authenticator->authenticate(
			array(),
			$this->device_row(),
			'offline_push',
			'2026-06-06T16:15:00Z'
		);

		$malformed = $authenticator->authenticate(
			array(
				'Authorization' => 'Basic ' . self::DEVICE_TOKEN,
			),
			$this->device_row(),
			'offline_push',
			'2026-06-06T16:15:00Z'
		);

		$short = $authenticator->authenticate(
			array(
				'Authorization' => 'Bearer short',
			),
			$this->device_row(),
			'offline_push',
			'2026-06-06T16:15:00Z'
		);

		$this->assert_false( $missing->is_allowed() );
		$this->assert_true( in_array( 'authorization_header_required', $missing->errors(), true ) );
		$this->assert_false( $malformed->is_allowed() );
		$this->assert_true( in_array( 'authorization_header_invalid', $malformed->errors(), true ) );
		$this->assert_false( $short->is_allowed() );
		$this->assert_true( in_array( 'device_token_invalid', $short->errors(), true ) );
	}

	public function test_authenticator_rejects_bad_device_hash_and_wrong_token(): void {
		$authenticator = new OfflineDeviceTokenAuthenticator();

		$bad_hash = $authenticator->authenticate(
			array(
				'Authorization' => 'Bearer ' . self::DEVICE_TOKEN,
			),
			$this->device_row(
				array(
					'token_hash' => 'not-a-hash',
				)
			),
			'offline_push',
			'2026-06-06T16:15:00Z'
		);

		$wrong_token = $authenticator->authenticate(
			array(
				'Authorization' => 'Bearer test-device-token-abcdefghijklmnopqrstuvwxyz-999999',
			),
			$this->device_row(),
			'offline_push',
			'2026-06-06T16:15:00Z'
		);

		$this->assert_false( $bad_hash->is_allowed() );
		$this->assert_true( in_array( 'device_token_hash_invalid', $bad_hash->errors(), true ) );
		$this->assert_false( $wrong_token->is_allowed() );
		$this->assert_true( in_array( 'device_token_mismatch', $wrong_token->errors(), true ) );
	}

	public function test_authenticator_requires_persisted_device_id(): void {
		$decision = ( new OfflineDeviceTokenAuthenticator() )->authenticate(
			array(
				'Authorization' => 'Bearer ' . self::DEVICE_TOKEN,
			),
			$this->device_row(
				array(
					'offline_device_id' => 0,
				)
			),
			'offline_push',
			'2026-06-06T16:15:00Z'
		);

		$this->assert_false( $decision->is_allowed() );
		$this->assert_true( in_array( 'offline_device_id_invalid', $decision->errors(), true ) );
	}

	public function test_authenticator_delegates_revocation_expiry_and_scope_policy(): void {
		$authenticator = new OfflineDeviceTokenAuthenticator();

		$revoked = $authenticator->authenticate(
			array(
				'Authorization' => 'Bearer ' . self::DEVICE_TOKEN,
			),
			$this->device_row(
				array(
					'revoked_at_utc' => '2026-06-06T16:10:00Z',
				)
			),
			'offline_push',
			'2026-06-06T16:15:00Z'
		);

		$scope_denied = $authenticator->authenticate(
			array(
				'Authorization' => 'Bearer ' . self::DEVICE_TOKEN,
			),
			$this->device_row(
				array(
					'scopes' => array( 'offline_pull' ),
				)
			),
			'offline_push',
			'2026-06-06T16:15:00Z'
		);

		$this->assert_false( $revoked->is_allowed() );
		$this->assert_true( in_array( 'device_revoked', $revoked->errors(), true ) );
		$this->assert_false( $scope_denied->is_allowed() );
		$this->assert_true( in_array( 'required_scope_denied', $scope_denied->errors(), true ) );
	}

	/**
	 * @param array<string, mixed> $overrides Device row overrides.
	 * @return array<string, mixed>
	 */
	private function device_row( array $overrides = array() ): array {
		return array_merge(
			array(
				'offline_device_id'    => 42,
				'public_id'            => 'device-main-01',
				'device_mode'          => 'kiosk',
				'location_id'          => 2,
				'status'               => 'active',
				'token_hash'           => OfflineDeviceTokenAuthenticator::token_hash( self::DEVICE_TOKEN ),
				'token_expires_at_utc' => '2026-06-07T16:00:00Z',
				'revoked_at_utc'       => null,
				'scopes'               => array( 'offline_pull', 'offline_push', 'kiosk' ),
			),
			$overrides
		);
	}
}
