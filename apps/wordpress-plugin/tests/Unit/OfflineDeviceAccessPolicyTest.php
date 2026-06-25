<?php
/**
 * Offline device access policy tests.
 *
 * @package TCGStorePlatform
 */

namespace TCGStorePlatform\Tests\Unit;

use TCGStorePlatform\Offline\OfflineDeviceAccessPolicy;
use TCGStorePlatform\Tests\TestCase;

final class OfflineDeviceAccessPolicyTest extends TestCase {
	public function test_policy_accepts_active_device_with_required_scope(): void {
		$decision = ( new OfflineDeviceAccessPolicy() )->authorize(
			$this->device_row(),
			'offline_pull',
			'2026-06-06T16:15:00Z'
		);

		$this->assert_true( $decision->is_allowed() );
		$this->assert_same( 'device-main-01', $decision->context()['device_id'] );
		$this->assert_same( 'kiosk', $decision->context()['device_mode'] );
		$this->assert_same( 2, $decision->context()['location_id'] );
		$this->assert_same( 'offline_pull', $decision->context()['required_scope'] );
		$this->assert_same( array( 'offline_pull', 'offline_push', 'kiosk' ), $decision->context()['scopes'] );
	}

	public function test_policy_rejects_revoked_inactive_and_expired_devices(): void {
		$policy = new OfflineDeviceAccessPolicy();

		$revoked = $policy->authorize(
			$this->device_row(
				array(
					'revoked_at_utc' => '2026-06-06T16:10:00Z',
				)
			),
			'offline_pull',
			'2026-06-06T16:15:00Z'
		);

		$inactive = $policy->authorize(
			$this->device_row(
				array(
					'status' => 'disabled',
				)
			),
			'offline_pull',
			'2026-06-06T16:15:00Z'
		);

		$expired = $policy->authorize(
			$this->device_row(
				array(
					'token_expires_at_utc' => '2026-06-06T16:15:00Z',
				)
			),
			'offline_pull',
			'2026-06-06T16:15:00Z'
		);

		$this->assert_false( $revoked->is_allowed() );
		$this->assert_true( in_array( 'device_revoked', $revoked->errors(), true ) );
		$this->assert_false( $inactive->is_allowed() );
		$this->assert_true( in_array( 'device_not_active', $inactive->errors(), true ) );
		$this->assert_false( $expired->is_allowed() );
		$this->assert_true( in_array( 'device_token_expired', $expired->errors(), true ) );
	}

	public function test_policy_rejects_missing_or_unsupported_scopes(): void {
		$policy = new OfflineDeviceAccessPolicy();

		$missing = $policy->authorize(
			$this->device_row(
				array(
					'scopes' => array( 'offline_pull' ),
				)
			),
			'offline_push',
			'2026-06-06T16:15:00Z'
		);

		$unsupported_required = $policy->authorize(
			$this->device_row(),
			'payments',
			'2026-06-06T16:15:00Z'
		);

		$unsupported_row = $policy->authorize(
			$this->device_row(
				array(
					'scopes' => array( 'offline_pull', 'payments' ),
				)
			),
			'offline_pull',
			'2026-06-06T16:15:00Z'
		);

		$this->assert_false( $missing->is_allowed() );
		$this->assert_true( in_array( 'required_scope_denied', $missing->errors(), true ) );
		$this->assert_false( $unsupported_required->is_allowed() );
		$this->assert_true( in_array( 'required_scope_unsupported', $unsupported_required->errors(), true ) );
		$this->assert_false( $unsupported_row->is_allowed() );
		$this->assert_true( in_array( 'scopes_1_unsupported', $unsupported_row->errors(), true ) );
	}

	public function test_policy_rejects_malformed_device_context(): void {
		$decision = ( new OfflineDeviceAccessPolicy() )->authorize(
			array(
				'public_id'            => 'bad',
				'device_mode'          => 'warehouse',
				'location_id'          => 0,
				'status'               => '',
				'token_expires_at_utc' => 'tomorrow',
				'revoked_at_utc'       => 'yesterday',
				'scopes'               => array(),
			),
			'offline_pull',
			'not-now'
		);

		$this->assert_false( $decision->is_allowed() );
		$this->assert_true( in_array( 'device_id_invalid', $decision->errors(), true ) );
		$this->assert_true( in_array( 'device_mode_unsupported', $decision->errors(), true ) );
		$this->assert_true( in_array( 'location_id_invalid', $decision->errors(), true ) );
		$this->assert_true( in_array( 'device_not_active', $decision->errors(), true ) );
		$this->assert_true( in_array( 'token_expires_at_utc_invalid', $decision->errors(), true ) );
		$this->assert_true( in_array( 'revoked_at_utc_invalid', $decision->errors(), true ) );
		$this->assert_true( in_array( 'scopes_required', $decision->errors(), true ) );
		$this->assert_true( in_array( 'required_scope_denied', $decision->errors(), true ) );
		$this->assert_true( in_array( 'now_utc_invalid', $decision->errors(), true ) );
	}

	/**
	 * @param array<string, mixed> $overrides Device row overrides.
	 * @return array<string, mixed>
	 */
	private function device_row( array $overrides = array() ): array {
		return array_merge(
			array(
				'public_id'            => 'device-main-01',
				'device_mode'          => 'kiosk',
				'location_id'          => 2,
				'status'               => 'active',
				'token_expires_at_utc' => '2026-06-07T16:00:00Z',
				'revoked_at_utc'       => null,
				'scopes'               => array( 'offline_pull', 'offline_push', 'kiosk' ),
			),
			$overrides
		);
	}
}
