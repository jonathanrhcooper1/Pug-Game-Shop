<?php
/**
 * Offline device session update query builder tests.
 *
 * @package TCGStorePlatform
 */

namespace TCGStorePlatform\Tests\Unit;

use TCGStorePlatform\Offline\OfflineDeviceAccessDecision;
use TCGStorePlatform\Offline\OfflineDeviceSessionPlan;
use TCGStorePlatform\Offline\OfflineDeviceSessionPlanner;
use TCGStorePlatform\Offline\OfflineDeviceSessionUpdateQueryBuilder;
use TCGStorePlatform\Tests\TestCase;

final class OfflineDeviceSessionUpdateQueryBuilderTest extends TestCase {
	public function test_builder_creates_prepared_update_from_session_plan(): void {
		$query_plan = ( new OfflineDeviceSessionUpdateQueryBuilder() )->build(
			$this->session_plan(),
			'wp_'
		);
		$audit      = $query_plan->audit_payload();

		$this->assert_true( $query_plan->is_valid() );
		$this->assert_same( 'wp_tcg_offline_devices', $query_plan->table_name() );
		$this->assert_contains( 'UPDATE `wp_tcg_offline_devices`', $query_plan->sql_template() );
		$this->assert_contains( '`row_version` = %d WHERE `offline_device_id` = %d', $query_plan->sql_template() );
		$this->assert_contains( 'AND `public_id` = %s AND `row_version` = %d LIMIT %d', $query_plan->sql_template() );
		$this->assert_same( 7, count( $query_plan->prepare_args() ) );
		$this->assert_same( '2026-06-06 18:30:00.000000', $query_plan->prepare_args()[0] );
		$this->assert_same( 9, $query_plan->prepare_args()[2] );
		$this->assert_same( 42, $query_plan->prepare_args()[3] );
		$this->assert_same( 'device-main-01', $query_plan->prepare_args()[4] );
		$this->assert_same( 8, $query_plan->prepare_args()[5] );
		$this->assert_same( 1, $query_plan->prepare_args()[6] );
		$this->assert_same( 'offline_device_session_update_query_planned', $audit['action'] );
		$this->assert_same( 7, $audit['prepare_arg_count'] );
		$this->assert_same( 8, $audit['expected_row_version'] );
		$this->assert_same( 9, $audit['next_row_version'] );
		$this->assert_false( array_key_exists( 'device_token', $audit ) );
		$this->assert_false( array_key_exists( 'token_hash', $audit ) );
	}

	public function test_builder_rejects_invalid_table_prefix_without_sql(): void {
		$query_plan = ( new OfflineDeviceSessionUpdateQueryBuilder() )->build(
			$this->session_plan(),
			'bad-prefix!'
		);

		$this->assert_false( $query_plan->is_valid() );
		$this->assert_same( '', $query_plan->sql_template() );
		$this->assert_same( array(), $query_plan->prepare_args() );
		$this->assert_true( in_array( 'table_prefix_invalid', $query_plan->errors(), true ) );
	}

	public function test_builder_rejects_invalid_session_update_rows(): void {
		$query_plan = ( new OfflineDeviceSessionUpdateQueryBuilder() )->build(
			$this->manual_session_plan(
				array(
					'offline_device_id'    => 0,
					'public_id'            => 'bad',
					'last_seen_at'         => 'not-now',
					'updated_at'           => 'also-bad',
					'row_version'          => 1,
					'expected_row_version' => 8,
					'previous_row_version' => 7,
				)
			),
			'wp_'
		);

		$this->assert_false( $query_plan->is_valid() );
		$this->assert_true( in_array( 'offline_device_id_invalid', $query_plan->errors(), true ) );
		$this->assert_true( in_array( 'public_id_invalid', $query_plan->errors(), true ) );
		$this->assert_true( in_array( 'last_seen_at_invalid', $query_plan->errors(), true ) );
		$this->assert_true( in_array( 'updated_at_invalid', $query_plan->errors(), true ) );
		$this->assert_true( in_array( 'row_version_increment_invalid', $query_plan->errors(), true ) );
		$this->assert_true( in_array( 'previous_row_version_mismatch', $query_plan->errors(), true ) );
	}

	public function test_builder_accepts_string_row_versions_from_session_rows(): void {
		$query_plan = ( new OfflineDeviceSessionUpdateQueryBuilder() )->build(
			$this->manual_session_plan(
				array(
					'offline_device_id'    => '43',
					'public_id'            => 'device-back-01',
					'last_seen_at'         => '2026-06-06T18:45:00Z',
					'updated_at'           => '2026-06-06T18:45:00Z',
					'row_version'          => '4',
					'expected_row_version' => '3',
					'previous_row_version' => '3',
				)
			),
			'wp_'
		);

		$this->assert_true( $query_plan->is_valid() );
		$this->assert_same( 4, $query_plan->prepare_args()[2] );
		$this->assert_same( 43, $query_plan->prepare_args()[3] );
		$this->assert_same( 3, $query_plan->prepare_args()[5] );
	}

	private function session_plan(): OfflineDeviceSessionPlan {
		return ( new OfflineDeviceSessionPlanner() )->plan(
			OfflineDeviceAccessDecision::accepted(
				array(
					'offline_device_id'    => 42,
					'device_id'            => 'device-main-01',
					'device_mode'          => 'kiosk',
					'location_id'          => 2,
					'scopes'               => array( 'offline_pull', 'offline_push', 'kiosk' ),
					'required_scope'       => 'offline_push',
					'auth_type'            => 'device_bearer',
					'token_verified'       => true,
					'authenticated_at_utc' => '2026-06-06T18:29:00Z',
				)
			),
			array(
				'offline_device_id' => 42,
				'public_id'         => 'device-main-01',
				'row_version'       => 8,
			),
			'2026-06-06T18:30:00Z'
		);
	}

	/**
	 * @param array<string, mixed> $update_row Future update row.
	 */
	private function manual_session_plan( array $update_row ): OfflineDeviceSessionPlan {
		return new OfflineDeviceSessionPlan(
			$update_row,
			array(),
			array(
				'action' => 'offline_device_session_planned',
			)
		);
	}
}
