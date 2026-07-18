<?php
/**
 * Offline pull cursor advancement planner tests.
 *
 * @package TCGStorePlatform
 */

namespace TCGStorePlatform\Tests\Unit;

use TCGStorePlatform\Offline\OfflinePullCursorAdvancePlanner;
use TCGStorePlatform\Offline\OfflinePullDeviceContextPlan;
use TCGStorePlatform\Offline\OfflinePullRequest;
use TCGStorePlatform\Tests\TestCase;

final class OfflinePullCursorAdvancePlannerTest extends TestCase {
	public function test_planner_builds_cursor_rows_for_complete_change_sets(): void {
		$plan  = ( new OfflinePullCursorAdvancePlanner() )->plan(
			$this->request( array( 'inventory', 'events' ) ),
			$this->context(),
			array(
				'inventory' => array(
					'cursor'     => 'inv-cursor-42',
					'has_more'   => false,
					'data'       => array(
						array(
							'entity_id' => 'inv-1001',
						),
					),
					'tombstones' => array(
						array(
							'entity_id' => 'inv-9001',
						),
					),
				),
				'events'    => array(
					'cursor'     => 'evt-cursor-5',
					'has_more'   => true,
					'data'       => array(),
					'tombstones' => array(),
				),
			),
			'2026-06-06T22:00:00Z'
		);
		$audit = $plan->audit_payload();
		$rows  = $plan->cursor_rows();

		$this->assert_true( $plan->is_valid() );
		$this->assert_same( 'wp_tcg_offline_pull_cursors', $plan->table_name() );
		$this->assert_same( 1, count( $rows ) );
		$this->assert_same( 42, $rows[0]['offline_device_id'] );
		$this->assert_same( 'device-main-01', $rows[0]['device_public_id'] );
		$this->assert_same( 'inventory', $rows[0]['domain'] );
		$this->assert_same( 'inv-cursor-42', $rows[0]['cursor_value'] );
		$this->assert_same( '2026-06-06 22:00:00', $rows[0]['last_server_time_utc'] );
		$this->assert_same( 2, $rows[0]['row_count'] );
		$this->assert_true( $rows[0]['cursor_write_deferred'] );
		$this->assert_same( 'offline_pull_cursor_advance_planned', $audit['action'] );
		$this->assert_same( 1, $audit['planned_domain_count'] );
		$this->assert_same( 2, $audit['planned_change_count'] );
		$this->assert_true( $audit['route_connected_writes_deferred'] );
	}

	public function test_planner_preserves_empty_cursor_as_nullable_row_value(): void {
		$plan = ( new OfflinePullCursorAdvancePlanner() )->plan(
			$this->request( array( 'branding' ) ),
			$this->context(),
			array(
				'branding' => array(
					'cursor'     => '',
					'has_more'   => false,
					'data'       => array(),
					'tombstones' => array(),
				),
			),
			'2026-06-06T22:00:00.123456Z'
		);
		$rows = $plan->cursor_rows();

		$this->assert_true( $plan->is_valid() );
		$this->assert_same( null, $rows[0]['cursor_value'] );
		$this->assert_same( '2026-06-06 22:00:00.123456', $rows[0]['last_pulled_at'] );
		$this->assert_same( 0, $rows[0]['row_count'] );
	}

	public function test_planner_rejects_invalid_context_time_and_cursor(): void {
		$plan = ( new OfflinePullCursorAdvancePlanner() )->plan(
			$this->request( array( 'inventory' ) ),
			OfflinePullDeviceContextPlan::rejected(
				'device-main-01',
				array( 'table_prefix_invalid' )
			),
			array(
				'inventory' => array(
					'cursor'     => 'cursor with spaces',
					'has_more'   => false,
					'data'       => array(),
					'tombstones' => array(),
				),
			),
			'not-a-time'
		);

		$this->assert_false( $plan->is_valid() );
		$this->assert_true( in_array( 'device_context_invalid', $plan->errors(), true ) );
		$this->assert_true( in_array( 'table_prefix_invalid', $plan->errors(), true ) );
		$this->assert_true( in_array( 'server_time_utc_invalid', $plan->errors(), true ) );
		$this->assert_true( in_array( 'inventory_cursor_invalid', $plan->errors(), true ) );
		$this->assert_same( array(), $plan->cursor_rows() );
	}

	public function test_planner_rejects_missing_and_malformed_change_sets(): void {
		$plan = ( new OfflinePullCursorAdvancePlanner() )->plan(
			$this->request( array( 'inventory', 'events' ) ),
			$this->context(),
			array(
				'inventory' => array(
					'cursor'     => 'inv-cursor-42',
					'has_more'   => 'no',
					'data'       => 'not-a-list',
					'tombstones' => 'not-a-list',
				),
			),
			'2026-06-06T22:00:00Z'
		);

		$this->assert_false( $plan->is_valid() );
		$this->assert_true( in_array( 'inventory_has_more_invalid', $plan->errors(), true ) );
		$this->assert_true( in_array( 'inventory_data_invalid', $plan->errors(), true ) );
		$this->assert_true( in_array( 'inventory_tombstones_invalid', $plan->errors(), true ) );
		$this->assert_true( in_array( 'events_change_set_missing', $plan->errors(), true ) );
	}

	/**
	 * @param list<string> $domains Pull domains.
	 */
	private function request( array $domains ): OfflinePullRequest {
		return new OfflinePullRequest(
			'device-main-01',
			$domains,
			array(),
			50,
			true,
			1
		);
	}

	private function context(): OfflinePullDeviceContextPlan {
		return OfflinePullDeviceContextPlan::accepted(
			'device-main-01',
			42,
			'wp_',
			array(
				'device_id'         => 'device-main-01',
				'offline_device_id' => 42,
				'required_scope'    => 'offline_pull',
			)
		);
	}
}
