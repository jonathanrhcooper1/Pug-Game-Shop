<?php
/**
 * Offline registered device permission planner tests.
 *
 * @package TCGStorePlatform
 */

namespace TCGStorePlatform\Tests\Unit;

use TCGStorePlatform\Offline\OfflineDeviceTokenAuthenticator;
use TCGStorePlatform\Offline\OfflineDeviceTokenLookupPlanner;
use TCGStorePlatform\Offline\OfflineRegisteredDevicePermissionPlanner;
use TCGStorePlatform\Tests\TestCase;

final class OfflineRegisteredDevicePermissionPlannerTest extends TestCase {
	private const DEVICE_TOKEN = 'test-device-token-abcdefghijklmnopqrstuvwxyz-123456';

	public function test_planner_requests_device_lookup_from_valid_bearer_token(): void {
		$plan = ( new OfflineRegisteredDevicePermissionPlanner() )->plan(
			$this->headers(),
			null,
			'offline_push',
			'2026-06-06T19:00:00Z'
		);

		$expected_hash = OfflineDeviceTokenLookupPlanner::token_hash( self::DEVICE_TOKEN );
		$audit         = $plan->audit_payload();
		$query         = $plan->lookup_query_args();

		$this->assert_false( $plan->is_authorized() );
		$this->assert_true( $plan->requires_device_lookup() );
		$this->assert_same( array( 'token_hash' => $expected_hash ), $plan->lookup_filters() );
		$this->assert_false( null === $plan->device_lookup_plan() );
		$this->assert_same( 'tcg_offline_devices', $query['table'] );
		$this->assert_same( $expected_hash, $query['where']['token_hash'] );
		$this->assert_same( 'offline_push', $query['where']['required_scope'] );
		$this->assert_same( 'optimistic_last_seen_update', $query['lock_intent'] );
		$this->assert_same( null, $plan->access_decision() );
		$this->assert_same( null, $plan->session_plan() );
		$this->assert_same( array(), $plan->errors() );
		$this->assert_same( 'device_lookup_required', $audit['stage'] );
		$this->assert_true( $audit['requires_device_lookup'] );
		$this->assert_true( $audit['has_lookup_query_plan'] );
		$this->assert_same( 19, $audit['selected_column_count'] );
		$this->assert_same( 'optimistic_last_seen_update', $audit['lock_intent'] );
		$this->assert_true( $audit['scope_check_deferred'] );
		$this->assert_false( array_key_exists( 'device_token', $audit ) );
		$this->assert_false( array_key_exists( 'token_hash', $audit ) );
	}

	public function test_planner_authorizes_loaded_device_and_plans_session_update(): void {
		$plan = ( new OfflineRegisteredDevicePermissionPlanner() )->plan(
			$this->headers(),
			$this->device_row(),
			'offline_push',
			'2026-06-06T19:00:00Z'
		);

		$audit  = $plan->audit_payload();
		$update = $plan->session_plan()?->device_update_row();

		$this->assert_true( $plan->is_authorized() );
		$this->assert_false( $plan->requires_device_lookup() );
		$this->assert_same( null, $plan->device_lookup_plan() );
		$this->assert_same( array(), $plan->lookup_query_args() );
		$this->assert_same( array(), $plan->errors() );
		$this->assert_same( 42, $plan->access_decision()?->context()['offline_device_id'] );
		$this->assert_same( 9, $update['row_version'] );
		$this->assert_same( '2026-06-06T19:00:00Z', $update['last_seen_at'] );
		$this->assert_same( 'authorized', $audit['stage'] );
		$this->assert_true( $audit['is_authorized'] );
		$this->assert_true( $audit['has_session_plan'] );
		$this->assert_same( 9, $audit['next_row_version'] );
		$this->assert_same( 'device-main-01', $audit['device_id'] );
		$this->assert_false( array_key_exists( 'device_token', $audit ) );
		$this->assert_false( array_key_exists( 'token_hash', $audit ) );
	}

	public function test_planner_rejects_bad_token_before_lookup(): void {
		$plan = ( new OfflineRegisteredDevicePermissionPlanner() )->plan(
			array(
				'Authorization' => 'Bearer short',
			),
			null,
			'offline_push',
			'2026-06-06T19:00:00Z'
		);

		$audit = $plan->audit_payload();

		$this->assert_false( $plan->is_authorized() );
		$this->assert_false( $plan->requires_device_lookup() );
		$this->assert_same( array( 'device_token_invalid' ), $plan->errors() );
		$this->assert_same( array(), $plan->lookup_filters() );
		$this->assert_same( null, $plan->device_lookup_plan() );
		$this->assert_same( array(), $plan->lookup_query_args() );
		$this->assert_same( 'token_lookup_rejected', $audit['stage'] );
		$this->assert_false( $audit['has_lookup_query_plan'] );
		$this->assert_same( array( 'device_token_invalid' ), $audit['errors'] );
	}

	public function test_planner_rejects_invalid_lookup_query_before_repository_call(): void {
		$plan = ( new OfflineRegisteredDevicePermissionPlanner() )->plan(
			$this->headers(),
			null,
			'admin_secret',
			'not-a-time'
		);

		$audit = $plan->audit_payload();

		$this->assert_false( $plan->is_authorized() );
		$this->assert_false( $plan->requires_device_lookup() );
		$this->assert_false( null === $plan->device_lookup_plan() );
		$this->assert_false( $plan->device_lookup_plan()?->is_valid() );
		$this->assert_same( array(), $plan->lookup_query_args() );
		$this->assert_true( in_array( 'required_scope_unsupported', $plan->errors(), true ) );
		$this->assert_true( in_array( 'server_time_utc_invalid', $plan->errors(), true ) );
		$this->assert_same( 'device_lookup_rejected', $audit['stage'] );
		$this->assert_false( $audit['has_lookup_query_plan'] );
		$this->assert_same( '', $audit['lock_intent'] );
		$this->assert_false( $audit['scope_check_deferred'] );
	}

	public function test_planner_rejects_loaded_device_denials_without_session_plan(): void {
		$plan = ( new OfflineRegisteredDevicePermissionPlanner() )->plan(
			$this->headers(),
			$this->device_row(
				array(
					'scopes' => array( 'offline_pull' ),
				)
			),
			'offline_push',
			'2026-06-06T19:00:00Z'
		);

		$audit = $plan->audit_payload();

		$this->assert_false( $plan->is_authorized() );
		$this->assert_false( $plan->requires_device_lookup() );
		$this->assert_true( in_array( 'required_scope_denied', $plan->errors(), true ) );
		$this->assert_same( null, $plan->session_plan() );
		$this->assert_same( 'device_authorization_denied', $audit['stage'] );
		$this->assert_false( $audit['has_session_plan'] );
	}

	public function test_planner_rejects_rows_that_cannot_plan_session_update(): void {
		$plan = ( new OfflineRegisteredDevicePermissionPlanner() )->plan(
			$this->headers(),
			$this->device_row(
				array(
					'row_version' => 0,
				)
			),
			'offline_push',
			'2026-06-06T19:00:00Z'
		);

		$audit = $plan->audit_payload();

		$this->assert_false( $plan->is_authorized() );
		$this->assert_same( array( 'device_session_plan_invalid' ), $plan->errors() );
		$this->assert_same( 'device_session_rejected', $audit['stage'] );
		$this->assert_same( 42, $audit['offline_device_id'] );
		$this->assert_false( $audit['has_session_plan'] );
	}

	/**
	 * @return array<string, string>
	 */
	private function headers(): array {
		return array(
			'Authorization' => 'Bearer ' . self::DEVICE_TOKEN,
		);
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
				'row_version'          => 8,
			),
			$overrides
		);
	}
}
