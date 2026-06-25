<?php
/**
 * ScryDex persistence repository readiness planner tests.
 *
 * @package TCGStorePlatform
 */

namespace TCGStorePlatform\Tests\Unit;

use TCGStorePlatform\ScryDex\ScryDexPersistenceRepositoryReadinessPlanner;
use TCGStorePlatform\ScryDex\ScryDexSyncCheckpoint;
use TCGStorePlatform\Tests\TestCase;

final class ScryDexPersistenceRepositoryReadinessPlannerTest extends TestCase {
	public function test_planner_reports_ready_with_valid_prefix_without_writes(): void {
		$plan = ( new ScryDexPersistenceRepositoryReadinessPlanner( 'wp_' ) )->plan(
			ScryDexSyncCheckpoint::initial( 42, 'cards', 'pokemon' )
		);

		$this->assert_same( 'ready', $plan['status'] );
		$this->assert_true( $plan['repository_configured'] );
		$this->assert_true( $plan['table_prefix_configured'] );
		$this->assert_true( $plan['persistence_query_builder_ready'] );
		$this->assert_true( $plan['persistence_repository_ready'] );
		$this->assert_same( 'wp_tcg_reference_cards', $plan['table_names']['reference_cards'] );
		$this->assert_same( 'wp_tcg_provider_price_observations', $plan['table_names']['provider_price_observations'] );
		$this->assert_same( 'wp_tcg_sync_checkpoints', $plan['table_names']['sync_checkpoints'] );
		$this->assert_true( $plan['checkpoint_upsert_query_present'] );
		$this->assert_same( 0, $plan['reference_insert_query_count'] );
		$this->assert_same( 0, $plan['reference_update_query_count'] );
		$this->assert_same( 0, $plan['price_observation_query_count'] );
		$this->assert_same( 1, $plan['total_query_count'] );
		$this->assert_true( $plan['readiness_probe_uses_empty_page_plan'] );
		$this->assert_true( $plan['provider_requests_deferred'] );
		$this->assert_true( $plan['persistence_query_execution_deferred'] );
		$this->assert_true( $plan['persistence_repository_deferred'] );
		$this->assert_true( $plan['reference_card_writes_deferred'] );
		$this->assert_true( $plan['provider_price_observation_writes_deferred'] );
		$this->assert_true( $plan['checkpoint_upsert_execution_deferred'] );
		$this->assert_true( $plan['database_writes_deferred'] );
		$this->assert_same( array(), $plan['configuration_issues'] );
		$this->assert_same( array(), $plan['block_reasons'] );
		$this->assert_same( 'scrydex_persistence_sql_planned', $plan['persistence_query_plan']['action'] );
		$this->assert_same( 'scrydex_persistence_repository', $plan['persistence_repository_result']['action'] );
	}

	public function test_planner_blocks_invalid_prefix(): void {
		$plan = ( new ScryDexPersistenceRepositoryReadinessPlanner( 'bad-prefix' ) )->plan(
			ScryDexSyncCheckpoint::initial( 42, 'cards', 'pokemon' )
		);

		$this->assert_same( 'blocked', $plan['status'] );
		$this->assert_false( $plan['repository_configured'] );
		$this->assert_true( in_array( 'scrydex_persistence_table_prefix_invalid', $plan['configuration_issues'], true ) );
		$this->assert_true( in_array( 'scrydex_persistence_repository_not_configured', $plan['block_reasons'], true ) );
		$this->assert_true( $plan['database_writes_deferred'] );
	}
}
