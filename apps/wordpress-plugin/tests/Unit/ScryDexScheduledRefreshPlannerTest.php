<?php
/**
 * ScryDex scheduled refresh planner tests.
 *
 * @package TCGStorePlatform
 */

namespace TCGStorePlatform\Tests\Unit;

use TCGStorePlatform\ScryDex\ScryDexScheduledRefreshPlanner;
use TCGStorePlatform\Tests\TestCase;

final class ScryDexScheduledRefreshPlannerTest extends TestCase {
	public function test_planner_blocks_default_refresh_before_network_or_writes(): void {
		$plan = ( new ScryDexScheduledRefreshPlanner() )->plan(
			array(),
			false,
			'staging',
			'wp_'
		);

		$this->assert_same( 'blocked', $plan['status'] );
		$this->assert_false( $plan['feature_enabled'] );
		$this->assert_true( $plan['feature_available'] );
		$this->assert_false( $plan['scheduled_refresh_configured'] );
		$this->assert_true( in_array( 'scrydex_sync_feature_disabled', $plan['block_reasons'], true ) );
		$this->assert_true( in_array( 'scrydex_scheduled_refresh_disabled', $plan['block_reasons'], true ) );
		$this->assert_true( in_array( 'scrydex_scheduled_network_requests_disabled', $plan['block_reasons'], true ) );
		$this->assert_true( $plan['credential_values_redacted'] );
		$this->assert_true( $plan['provider_result_bodies_not_logged'] );
	}

	public function test_planner_allows_ready_staging_refresh_when_all_gates_are_confirmed(): void {
		$plan = ( new ScryDexScheduledRefreshPlanner() )->plan(
			$this->settings(),
			true,
			'staging',
			'wp_'
		);

		$this->assert_same( 'ready', $plan['status'] );
		$this->assert_true( $plan['feature_enabled'] );
		$this->assert_true( $plan['feature_available'] );
		$this->assert_true( $plan['scheduled_refresh_configured'] );
		$this->assert_false( $plan['production_execution_blocked'] );
		$this->assert_same( array( 'pokemon', 'lorcana' ), $plan['request']['game_keys'] );
		$this->assert_same( 100, $plan['request']['page_size'] );
		$this->assert_same( 3, $plan['request']['max_pages_per_game_run'] );
		$this->assert_true( $plan['request']['execute_database_writes'] );
		$this->assert_true( $plan['gate_overrides']['network_requests_enabled'] );
		$this->assert_true( $plan['gate_overrides']['database_writes_enabled'] );
		$this->assert_true( $plan['gate_overrides']['scheduled_worker_configured'] );
		$this->assert_same( array(), $plan['block_reasons'] );
	}

	public function test_planner_blocks_automatic_production_refresh_even_when_settings_are_confirmed(): void {
		$plan = ( new ScryDexScheduledRefreshPlanner() )->plan(
			$this->settings(),
			true,
			'production',
			'wp_'
		);

		$this->assert_same( 'blocked', $plan['status'] );
		$this->assert_true( $plan['feature_available'] );
		$this->assert_true( $plan['production_execution_blocked'] );
		$this->assert_false( in_array( 'scrydex_sync_unavailable_environment', $plan['block_reasons'], true ) );
		$this->assert_true( in_array( 'scrydex_scheduled_refresh_production_blocked', $plan['block_reasons'], true ) );
	}

	/**
	 * @return array<string, mixed>
	 */
	private function settings(): array {
		return array(
			'scrydex_schedule' => array(
				'enabled'                  => true,
				'game_keys'                => array( 'pokemon', 'lorcana' ),
				'cards_page_size'          => 200,
				'max_pages_per_game_run'   => 3,
				'network_requests_enabled' => true,
				'database_writes_enabled'  => true,
				'execute_database_writes'  => true,
			),
		);
	}
}
