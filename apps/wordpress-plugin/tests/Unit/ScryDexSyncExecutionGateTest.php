<?php
/**
 * ScryDex sync execution gate tests.
 *
 * @package TCGStorePlatform
 */

namespace TCGStorePlatform\Tests\Unit;

use TCGStorePlatform\ScryDex\ScryDexProviderFactory;
use TCGStorePlatform\ScryDex\ScryDexSyncDryRunPlanner;
use TCGStorePlatform\ScryDex\ScryDexSyncExecutionGate;
use TCGStorePlatform\Tests\TestCase;

final class ScryDexSyncExecutionGateTest extends TestCase {
	public function test_default_gate_is_blocked_without_provider_or_execution_dependencies(): void {
		$gate = ( new ScryDexSyncExecutionGate(
			new ScryDexSyncDryRunPlanner(
				new ScryDexProviderFactory( array() )
			)
		) )->plan_cards_worker();

		$this->assert_same( 'blocked', $gate['status'] );
		$this->assert_false( $gate['provider_ready'] );
		$this->assert_true( $gate['worker_execution_deferred'] );
		$this->assert_true( $gate['network_requests_deferred'] );
		$this->assert_true( $gate['database_writes_deferred'] );
		$this->assert_true( $gate['image_downloads_deferred'] );
		$this->assert_true( $gate['webhook_registration_deferred'] );
		$this->assert_true( in_array( 'scrydex_provider_not_configured', $gate['block_reasons'], true ) );
		$this->assert_true( in_array( 'scrydex_network_requests_disabled', $gate['block_reasons'], true ) );
		$this->assert_true( in_array( 'scrydex_usage_budget_not_configured', $gate['block_reasons'], true ) );
		$this->assert_same( 'search_cards', $gate['provider_method'] );
		$this->assert_same( '/cards/search', $gate['provider_endpoint'] );
		$this->assert_same( 'pokemon', $gate['request']['resource_key'] );
	}

	public function test_configured_provider_stays_gated_until_execution_dependencies_are_enabled(): void {
		$gate = ( new ScryDexSyncExecutionGate(
			$this->configured_dry_run_planner()
		) )->plan_cards_worker(
			array(
				'game'      => 'magic',
				'page_size' => 50,
			)
		);
		$json = json_encode( $gate );

		$this->assert_same( 'gated', $gate['status'] );
		$this->assert_true( $gate['provider_ready'] );
		$this->assert_true( $gate['credential_values_redacted'] );
		$this->assert_same( 'magic', $gate['request']['resource_key'] );
		$this->assert_same( 50, $gate['request']['page_size'] );
		$this->assert_true( $gate['page_processor_ready'] );
		$this->assert_true( $gate['persistence_planner_ready'] );
		$this->assert_true( in_array( 'scrydex_checkpoint_repository_not_configured', $gate['block_reasons'], true ) );
		$this->assert_true( in_array( 'scrydex_persistence_repository_not_configured', $gate['block_reasons'], true ) );
		$this->assert_not_contains( 'staging-team-id', false === $json ? '' : $json );
		$this->assert_not_contains( 'staging-primary-key', false === $json ? '' : $json );
	}

	public function test_gate_can_report_future_ready_state_without_running_network_or_writes(): void {
		$gate = ( new ScryDexSyncExecutionGate(
			$this->configured_dry_run_planner()
		) )->plan_cards_worker(
			array(),
			array(
				'network_requests_enabled'          => true,
				'usage_budget_configured'           => true,
				'checkpoint_repository_configured'  => true,
				'persistence_repository_configured' => true,
				'database_writes_enabled'           => true,
				'scheduled_worker_configured'       => true,
			)
		);

		$this->assert_same( 'ready', $gate['status'] );
		$this->assert_false( $gate['worker_execution_deferred'] );
		$this->assert_false( $gate['network_requests_deferred'] );
		$this->assert_false( $gate['database_writes_deferred'] );
		$this->assert_true( $gate['image_downloads_deferred'] );
		$this->assert_true( $gate['webhook_registration_deferred'] );
		$this->assert_same( array(), $gate['block_reasons'] );
	}

	private function configured_dry_run_planner(): ScryDexSyncDryRunPlanner {
		return new ScryDexSyncDryRunPlanner(
			new ScryDexProviderFactory(
				array(
					'scrydex_provider' => array(
						'enabled'         => true,
						'environment'     => 'staging',
						'team_id'         => 'staging-team-id',
						'primary_api_key' => 'staging-primary-key',
					),
				)
			)
		);
	}
}
