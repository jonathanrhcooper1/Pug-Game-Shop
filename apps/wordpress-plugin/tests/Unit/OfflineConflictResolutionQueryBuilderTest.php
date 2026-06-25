<?php
/**
 * Offline conflict resolution query-builder tests.
 *
 * @package TCGStorePlatform
 */

namespace TCGStorePlatform\Tests\Unit;

use TCGStorePlatform\Offline\OfflineConflictResolutionPlan;
use TCGStorePlatform\Offline\OfflineConflictResolutionPlanner;
use TCGStorePlatform\Offline\OfflineConflictResolutionQueryBuilder;
use TCGStorePlatform\Offline\OfflineConflictResolutionRequestParser;
use TCGStorePlatform\Tests\TestCase;

final class OfflineConflictResolutionQueryBuilderTest extends TestCase {
	public function test_builder_creates_guarded_conflict_resolution_update(): void {
		$query_plan = ( new OfflineConflictResolutionQueryBuilder() )->build(
			$this->resolution_plan(),
			'wp_'
		);

		$this->assert_true( $query_plan->is_valid() );
		$this->assert_same( 'wp_tcg_sync_conflicts', $query_plan->table_name() );
		$this->assert_contains( 'UPDATE `wp_tcg_sync_conflicts`', $query_plan->sql_template() );
		$this->assert_contains( '`resolution_payload_json` = %s', $query_plan->sql_template() );
		$this->assert_contains( 'WHERE `conflict_id` = %s AND `row_version` = %d', $query_plan->sql_template() );
		$this->assert_contains( 'AND `status` IN (%s, %s, %s) LIMIT %d', $query_plan->sql_template() );

		$args = $query_plan->prepare_args();
		$this->assert_same( 13, count( $args ) );
		$this->assert_same( 'resolved', $args[0] );
		$this->assert_same( 'manager_adjust', $args[1] );
		$this->assert_same( 15, $args[3] );
		$this->assert_same( '2026-06-06 17:00:00.000000', $args[4] );
		$this->assert_same( '2026-06-06 18:05:00.000000', $args[5] );
		$this->assert_same( 13, $args[6] );
		$this->assert_same( 'conflict-main-01', $args[7] );
		$this->assert_same( 12, $args[8] );
		$this->assert_same( 'open', $args[9] );
		$this->assert_same( 'assigned', $args[10] );
		$this->assert_same( 'resolving', $args[11] );

		$resolution_payload = json_decode( (string) $args[2], true );
		$this->assert_true( is_array( $resolution_payload ) );
		$this->assert_same( 'resolution-main-01', $resolution_payload['resolution_id'] );
		$this->assert_same( 'device-main-01', $resolution_payload['resolved_by_device_id'] );
		$this->assert_same( 'Use staff verified scan outcome.', $resolution_payload['resolution_note'] );
		$this->assert_same( 'sold', $resolution_payload['payload']['accepted_inventory_status'] );

		$audit = $query_plan->audit_payload();
		$this->assert_same( 'offline_conflict_resolution_query_planned', $audit['action'] );
		$this->assert_same( 13, $audit['prepare_arg_count'] );
		$this->assert_false( array_key_exists( 'resolution_payload', $audit ) );
		$this->assert_false( array_key_exists( 'resolution_payload_json', $audit ) );
	}

	public function test_builder_rejects_invalid_table_prefix_and_update_row(): void {
		$query_plan = ( new OfflineConflictResolutionQueryBuilder() )->build(
			$this->manual_plan(
				array(
					'conflict_id'               => 'bad',
					'resolution_id'             => 'bad key',
					'status'                    => 'closed',
					'resolution_action'         => 'delete',
					'resolved_by_manager_id'    => 0,
					'resolved_by_device_id'     => 'bad',
					'resolved_at_utc'           => '2026-06-06T17:00:00-04:00',
					'updated_at_utc'            => 'not-now',
					'row_version'               => 12,
					'previous_row_version'      => 11,
					'expected_conflict_version' => 12,
					'resolution_payload'        => 'not-an-object',
				)
			),
			'bad-prefix!'
		);

		$this->assert_false( $query_plan->is_valid() );
		$this->assert_same( '', $query_plan->sql_template() );
		$this->assert_true( in_array( 'table_prefix_invalid', $query_plan->errors(), true ) );
		$this->assert_true( in_array( 'conflict_id_invalid', $query_plan->errors(), true ) );
		$this->assert_true( in_array( 'resolution_id_invalid', $query_plan->errors(), true ) );
		$this->assert_true( in_array( 'status_invalid', $query_plan->errors(), true ) );
		$this->assert_true( in_array( 'resolution_action_invalid', $query_plan->errors(), true ) );
		$this->assert_true( in_array( 'resolved_by_manager_id_invalid', $query_plan->errors(), true ) );
		$this->assert_true( in_array( 'resolved_by_device_id_invalid', $query_plan->errors(), true ) );
		$this->assert_true( in_array( 'previous_row_version_mismatch', $query_plan->errors(), true ) );
		$this->assert_true( in_array( 'row_version_increment_invalid', $query_plan->errors(), true ) );
		$this->assert_true( in_array( 'resolved_at_invalid', $query_plan->errors(), true ) );
		$this->assert_true( in_array( 'updated_at_invalid', $query_plan->errors(), true ) );
		$this->assert_true( in_array( 'resolution_payload_invalid', $query_plan->errors(), true ) );
	}

	private function resolution_plan(): OfflineConflictResolutionPlan {
		$result = ( new OfflineConflictResolutionRequestParser() )->parse(
			'conflict-main-01',
			array(
				'device_id'                 => 'device-main-01',
				'manager_id'                => 15,
				'resolution_action'         => 'manager_adjust',
				'resolution_note'           => 'Use staff verified scan outcome.',
				'expected_conflict_version' => 12,
				'resolved_at_utc'           => '2026-06-06T17:00:00Z',
				'resolution_payload'        => array(
					'accepted_inventory_status' => 'sold',
				),
				'schema_version'            => 1,
			),
			'resolution-main-01'
		);

		$this->assert_true( $result->is_valid() );
		$request = $result->request();
		$this->assert_true( null !== $request );

		return ( new OfflineConflictResolutionPlanner() )->plan(
			$request,
			array(
				'conflict_id'        => 'conflict-main-01',
				'status'             => 'open',
				'entity_type'        => 'inventory',
				'entity_id'          => 'inv-1001',
				'conflict_type'      => 'double_sell',
				'row_version'        => 12,
				'resolution_options' => array( 'accept_server', 'accept_device', 'manager_adjust' ),
			),
			'2026-06-06T18:05:00Z'
		);
	}

	/**
	 * @param array<string, mixed> $update_row Future update row.
	 */
	private function manual_plan( array $update_row ): OfflineConflictResolutionPlan {
		return new OfflineConflictResolutionPlan(
			$update_row,
			array(),
			array(
				'action' => 'offline_conflict_resolution_planned',
			)
		);
	}
}
