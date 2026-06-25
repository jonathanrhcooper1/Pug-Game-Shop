<?php
/**
 * ScryDex checkpoint repository planner tests.
 *
 * @package TCGStorePlatform
 */

namespace TCGStorePlatform\Tests\Unit;

use TCGStorePlatform\ScryDex\ScryDexSyncCheckpoint;
use TCGStorePlatform\ScryDex\ScryDexSyncCheckpointRepositoryPlanner;
use TCGStorePlatform\Tests\TestCase;

final class ScryDexSyncCheckpointRepositoryPlannerTest extends TestCase {
	public function test_planner_builds_read_and_upsert_templates_for_checkpoint(): void {
		$checkpoint = new ScryDexSyncCheckpoint(
			101,
			'cards',
			'pokemon',
			4,
			'cursor-page-5',
			'2026-06-07T10:00:00Z',
			str_repeat( 'a', 64 ),
			750
		);
		$plan       = ( new ScryDexSyncCheckpointRepositoryPlanner( 'wp_' ) )->plan( $checkpoint );
		$read       = $plan['read_query'];
		$upsert     = $plan['upsert_query'];

		$this->assert_same( 'ready', $plan['status'] );
		$this->assert_true( $plan['repository_configured'] );
		$this->assert_same( 'wp_tcg_sync_checkpoints', $plan['table_name'] );
		$this->assert_true( $plan['sync_job_id_configured'] );
		$this->assert_false( $plan['active_sync_job_creation_deferred'] );
		$this->assert_contains( 'SELECT sync_job_id, provider_name', $read['sql_template'] );
		$this->assert_same( array( 101, 'scrydex', 'cards', 'pokemon' ), $read['prepare_args'] );
		$this->assert_contains( 'INSERT INTO `wp_tcg_sync_checkpoints`', $upsert['sql_template'] );
		$this->assert_contains( 'ON DUPLICATE KEY UPDATE', $upsert['sql_template'] );
		$this->assert_false( $upsert['cursor_value_is_null'] );
		$this->assert_false( $upsert['high_water_mark_is_null'] );
		$this->assert_false( $upsert['payload_hash_is_null'] );
		$this->assert_same( 11, $upsert['prepare_arg_count'] );
		$this->assert_true( $upsert['checkpoint_write_deferred'] );
		$this->assert_same( array(), $plan['block_reasons'] );
	}

	public function test_initial_checkpoint_plan_uses_null_literals_for_empty_resume_fields(): void {
		$plan   = ( new ScryDexSyncCheckpointRepositoryPlanner( 'wp_' ) )->plan(
			ScryDexSyncCheckpoint::initial( 0, 'cards', 'pokemon' )
		);
		$upsert = $plan['upsert_query'];

		$this->assert_true( $plan['repository_configured'] );
		$this->assert_false( $plan['sync_job_id_configured'] );
		$this->assert_true( $plan['active_sync_job_creation_deferred'] );
		$this->assert_contains( 'NULL, NULL, NULL', $upsert['sql_template'] );
		$this->assert_true( $upsert['cursor_value_is_null'] );
		$this->assert_true( $upsert['high_water_mark_is_null'] );
		$this->assert_true( $upsert['payload_hash_is_null'] );
		$this->assert_same( 8, $upsert['prepare_arg_count'] );
	}

	public function test_planner_rejects_invalid_table_prefix(): void {
		$plan = ( new ScryDexSyncCheckpointRepositoryPlanner( 'wp-bad' ) )->plan(
			ScryDexSyncCheckpoint::initial( 101, 'cards', 'pokemon' )
		);

		$this->assert_same( 'blocked', $plan['status'] );
		$this->assert_false( $plan['repository_configured'] );
		$this->assert_same( null, $plan['read_query'] );
		$this->assert_same( null, $plan['upsert_query'] );
		$this->assert_true( in_array( 'scrydex_checkpoint_table_prefix_invalid', $plan['configuration_issues'], true ) );
		$this->assert_true( in_array( 'scrydex_checkpoint_repository_not_configured', $plan['block_reasons'], true ) );
	}

	public function test_planner_rejects_invalid_checkpoint_identity(): void {
		$plan = ( new ScryDexSyncCheckpointRepositoryPlanner( 'wp_' ) )->plan(
			new ScryDexSyncCheckpoint(
				101,
				'bad type',
				'../bad',
				1,
				'',
				'',
				'not-a-hash',
				0
			)
		);

		$this->assert_false( $plan['repository_configured'] );
		$this->assert_true( in_array( 'scrydex_checkpoint_resource_type_invalid', $plan['configuration_issues'], true ) );
		$this->assert_true( in_array( 'scrydex_checkpoint_resource_key_invalid', $plan['configuration_issues'], true ) );
		$this->assert_true( in_array( 'scrydex_checkpoint_payload_hash_invalid', $plan['configuration_issues'], true ) );
	}
}
