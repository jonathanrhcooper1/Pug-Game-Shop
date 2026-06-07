<?php
/**
 * Offline registered device lookup planner tests.
 *
 * @package TCGStorePlatform
 */

namespace TCGStorePlatform\Tests\Unit;

use TCGStorePlatform\Offline\OfflineDeviceTokenLookupPlanner;
use TCGStorePlatform\Offline\OfflineRegisteredDeviceLookupPlanner;
use TCGStorePlatform\Offline\OfflineRegisteredDeviceRowNormalizer;
use TCGStorePlatform\Tests\TestCase;

final class OfflineRegisteredDeviceLookupPlannerTest extends TestCase {
	private const DEVICE_TOKEN = 'test-device-token-abcdefghijklmnopqrstuvwxyz-123456';

	public function test_planner_builds_repository_query_contract_from_token_lookup(): void {
		$token_lookup_plan = $this->token_lookup_plan();
		$plan              = ( new OfflineRegisteredDeviceLookupPlanner() )->plan(
			$token_lookup_plan,
			'offline_push',
			'2026-06-06T20:30:00Z'
		);

		$query = $plan->query_args();
		$where = $query['where'];
		$audit = $plan->audit_payload();

		$this->assert_true( $plan->is_valid() );
		$this->assert_same( 'tcg_offline_devices', $query['table'] );
		$this->assert_same( $token_lookup_plan->token_hash(), $where['token_hash'] );
		$this->assert_same( 'active', $where['status'] );
		$this->assert_true( $where['revoked_at_is_null'] );
		$this->assert_same( '2026-06-06T20:30:00Z', $where['token_expires_after_utc'] );
		$this->assert_same( 'offline_push', $where['required_scope'] );
		$this->assert_true( $where['scope_check_is_deferred'] );
		$this->assert_same( 1, $query['limit'] );
		$this->assert_same( array( 'offline_device_id' => 'ASC' ), $query['order_by'] );
		$this->assert_same( 'optimistic_last_seen_update', $plan->lock_intent() );
		$this->assert_same( OfflineRegisteredDeviceRowNormalizer::class, $query['row_normalizer'] );
		$this->assert_same( 'offline_registered_device_lookup_planned', $audit['action'] );
		$this->assert_true( $audit['is_valid'] );
		$this->assert_true( $audit['has_lookup_filter'] );
		$this->assert_true( $audit['scope_check_deferred'] );
		$this->assert_false( array_key_exists( 'device_token', $audit ) );
		$this->assert_false( array_key_exists( 'token_hash', $audit ) );
	}

	public function test_planner_rejects_invalid_token_lookup_scope_and_time_without_query_args(): void {
		$token_lookup_plan = ( new OfflineDeviceTokenLookupPlanner() )->plan(
			array(
				'Authorization' => 'Bearer short',
			)
		);

		$plan = ( new OfflineRegisteredDeviceLookupPlanner() )->plan(
			$token_lookup_plan,
			'admin_secret',
			'not-a-time'
		);

		$errors = $plan->errors();
		$audit  = $plan->audit_payload();

		$this->assert_false( $plan->is_valid() );
		$this->assert_same( array(), $plan->query_args() );
		$this->assert_same( array(), $plan->lookup_filters() );
		$this->assert_true( in_array( 'device_token_invalid', $errors, true ) );
		$this->assert_true( in_array( 'required_scope_unsupported', $errors, true ) );
		$this->assert_true( in_array( 'server_time_utc_invalid', $errors, true ) );
		$this->assert_false( $audit['is_valid'] );
		$this->assert_false( $audit['has_lookup_filter'] );
		$this->assert_false( $audit['scope_check_deferred'] );
		$this->assert_same( $errors, $audit['errors'] );
	}

	public function test_selected_columns_cover_row_normalizer_inputs(): void {
		$plan = ( new OfflineRegisteredDeviceLookupPlanner() )->plan(
			$this->token_lookup_plan(),
			'offline_pull',
			'2026-06-06T20:30:00Z'
		);

		$columns = $plan->selected_columns();

		foreach (
			array(
				'offline_device_id',
				'public_id',
				'location_id',
				'manager_user_id',
				'device_label',
				'device_mode',
				'status',
				'token_hash',
				'token_expires_at',
				'revoked_at',
				'last_seen_at',
				'issued_at',
				'created_at',
				'updated_at',
				'scopes_json',
				'capabilities_json',
				'app_version',
				'platform',
				'row_version',
			) as $column
		) {
			$this->assert_true( in_array( $column, $columns, true ) );
		}
	}

	public function test_supported_scopes_are_plannable_but_json_matching_is_deferred(): void {
		$planner = new OfflineRegisteredDeviceLookupPlanner();

		foreach ( array( 'offline_pull', 'offline_push', 'conflicts', 'kiosk' ) as $scope ) {
			$plan  = $planner->plan( $this->token_lookup_plan(), $scope, '2026-06-06T20:30:00Z' );
			$where = $plan->lookup_filters();

			$this->assert_true( $plan->is_valid() );
			$this->assert_same( $scope, $where['required_scope'] );
			$this->assert_true( $where['scope_check_is_deferred'] );
			$this->assert_same( 'deferred_to_access_policy', $plan->query_args()['scope_check'] );
		}
	}

	private function token_lookup_plan(): \TCGStorePlatform\Offline\OfflineDeviceTokenLookupPlan {
		return ( new OfflineDeviceTokenLookupPlanner() )->plan(
			array(
				'Authorization' => 'Bearer ' . self::DEVICE_TOKEN,
			)
		);
	}
}
