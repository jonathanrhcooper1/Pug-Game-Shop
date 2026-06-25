<?php
/**
 * ScryDex cards sync worker orchestration planner tests.
 *
 * @package TCGStorePlatform
 */

namespace TCGStorePlatform\Tests\Unit;

use TCGStorePlatform\ScryDex\ScryDexCardsSyncWorkerPlanner;
use TCGStorePlatform\ScryDex\ScryDexPersistenceRepository;
use TCGStorePlatform\ScryDex\ScryDexPersistenceRepositoryReadinessPlanner;
use TCGStorePlatform\ScryDex\ScryDexProviderFactory;
use TCGStorePlatform\ScryDex\ScryDexResult;
use TCGStorePlatform\ScryDex\ScryDexSyncCheckpoint;
use TCGStorePlatform\ScryDex\ScryDexSyncCheckpointRepositoryPlanner;
use TCGStorePlatform\ScryDex\ScryDexSyncDryRunPlanner;
use TCGStorePlatform\ScryDex\ScryDexSyncExecutionGate;
use TCGStorePlatform\ScryDex\ScryDexUsageBudgetPlanner;
use TCGStorePlatform\Tests\TestCase;

final class ScryDexCardsSyncWorkerPlannerTest extends TestCase {
	public function test_planner_stages_mock_provider_page_without_network_or_database_writes(): void {
		$plan = $this->planner()->plan_cards_page(
			array(
				'game'       => 'pokemon',
				'page_size'  => 2,
				'checkpoint' => ScryDexSyncCheckpoint::initial( 42, 'cards', 'pokemon' )->to_row(),
			),
			new ScryDexResult( ScryDexResult::SUCCESS, 200, $this->cards_fixture() ),
			array(),
			$this->ready_gate_overrides()
		);
		$json = json_encode( $plan );

		$this->assert_same( 'planned', $plan['status'] );
		$this->assert_same( 'scrydex_cards_sync_worker_orchestration_plan', $plan['action'] );
		$this->assert_same( 'success', $plan['provider_result_status'] );
		$this->assert_true( $plan['provider_result_body_received'] );
		$this->assert_true( $plan['provider_result_body_not_logged'] );
		$this->assert_same( 'ready', $plan['execution_gate']['status'] );
		$this->assert_same( 2, $plan['page_plan']['reference_row_count'] );
		$this->assert_same( 2, $plan['page_plan']['price_row_count'] );
		$this->assert_same( 2, $plan['page_plan']['variant_row_count'] );
		$this->assert_same( 2, $plan['persistence_plan']['reference_insert_count'] );
		$this->assert_same( 2, $plan['persistence_plan']['reference_variant_upsert_count'] );
		$this->assert_same( 2, $plan['persistence_plan']['price_observation_count'] );
		$this->assert_same( 2, $plan['persistence_plan']['price_point_count'] );
		$this->assert_same( 9, $plan['persistence_query_plan']['total_query_count'] );
		$this->assert_same( 'deferred', $plan['persistence_repository_result']['status'] );
		$this->assert_true( $plan['network_requests_deferred'] );
		$this->assert_true( $plan['provider_fetch_deferred'] );
		$this->assert_true( $plan['provider_result_must_be_injected'] );
		$this->assert_true( $plan['database_writes_deferred'] );
		$this->assert_true( $plan['reference_card_writes_deferred'] );
		$this->assert_true( $plan['reference_variant_writes_deferred'] );
		$this->assert_true( $plan['provider_price_observation_writes_deferred'] );
		$this->assert_true( $plan['persistence_repository_result']['provider_price_point_writes_deferred'] );
		$this->assert_true( $plan['checkpoint_upsert_execution_deferred'] );
		$this->assert_same( array(), $plan['block_reasons'] );
		$this->assert_not_contains( 'staging-primary-key', false === $json ? '' : $json );
		$this->assert_not_contains( 'staging-team-id', false === $json ? '' : $json );
	}

	public function test_planner_reports_retryable_provider_failure_without_persistence_writes(): void {
		$plan = $this->planner()->plan_cards_page(
			array(
				'game'       => 'pokemon',
				'checkpoint' => ScryDexSyncCheckpoint::initial( 42, 'cards', 'pokemon' )->to_row(),
			),
			new ScryDexResult(
				ScryDexResult::RATE_LIMITED,
				429,
				array(),
				'scrydex_rate_limited',
				'Rate limited.'
			),
			array(),
			$this->ready_gate_overrides()
		);

		$this->assert_same( 'provider_failed', $plan['status'] );
		$this->assert_same( 'rate_limited', $plan['provider_result_status'] );
		$this->assert_same( 429, $plan['provider_result_http_status'] );
		$this->assert_false( $plan['provider_result_body_received'] );
		$this->assert_same( 'failed', $plan['page_plan']['status'] );
		$this->assert_true( $plan['page_plan']['retryable'] );
		$this->assert_same( 'failed', $plan['persistence_plan']['status'] );
		$this->assert_same( 0, $plan['persistence_plan']['reference_write_count'] );
		$this->assert_same( 0, $plan['persistence_query_plan']['total_query_count'] );
		$this->assert_same( 'rejected', $plan['persistence_repository_result']['status'] );
		$this->assert_true( in_array( 'scrydex_rate_limited', $plan['block_reasons'], true ) );
		$this->assert_true( $plan['network_requests_deferred'] );
		$this->assert_true( $plan['database_writes_deferred'] );
	}

	public function test_planner_keeps_invalid_repository_prefix_blocked(): void {
		$plan = $this->planner( '' )->plan_cards_page(
			array(
				'game'       => 'pokemon',
				'checkpoint' => ScryDexSyncCheckpoint::initial( 42, 'cards', 'pokemon' )->to_row(),
			),
			new ScryDexResult( ScryDexResult::SUCCESS, 200, $this->cards_fixture() ),
			array(),
			$this->ready_gate_overrides()
		);

		$this->assert_same( 'blocked', $plan['status'] );
		$this->assert_true( in_array( 'scrydex_persistence_repository_not_configured', $plan['block_reasons'], true ) );
		$this->assert_true( in_array( 'scrydex_persistence_table_prefix_invalid', $plan['configuration_issues'], true ) );
		$this->assert_true( $plan['database_writes_deferred'] );
	}

	public function test_planner_can_execute_persistence_when_explicitly_requested(): void {
		$database = $this->database();
		$plan     = $this->planner(
			'wp_',
			new ScryDexPersistenceRepository( $database )
		)->plan_cards_page(
			array(
				'game'       => 'pokemon',
				'page_size'  => 2,
				'checkpoint' => ScryDexSyncCheckpoint::initial( 42, 'cards', 'pokemon' )->to_row(),
			),
			new ScryDexResult( ScryDexResult::SUCCESS, 200, $this->cards_fixture() ),
			array(),
			$this->ready_gate_overrides(),
			true
		);

		$this->assert_same( 'executed', $plan['status'] );
		$this->assert_false( $plan['database_writes_deferred'] );
		$this->assert_false( $plan['reference_card_writes_deferred'] );
		$this->assert_false( $plan['reference_variant_writes_deferred'] );
		$this->assert_false( $plan['provider_price_observation_writes_deferred'] );
		$this->assert_false( $plan['persistence_repository_result']['provider_price_point_writes_deferred'] );
		$this->assert_false( $plan['checkpoint_upsert_execution_deferred'] );
		$this->assert_true( $plan['execute_database_writes_requested'] );
		$this->assert_same( 'executed', $plan['persistence_repository_result']['status'] );
		$this->assert_true( $plan['persistence_repository_result']['transaction_committed'] );
		$this->assert_same( 11, $database->query_count );
		$this->assert_same( 9, $database->prepare_count );
	}

	private function planner(
		string $table_prefix = 'wp_',
		?ScryDexPersistenceRepository $repository = null
	): ScryDexCardsSyncWorkerPlanner {
		return new ScryDexCardsSyncWorkerPlanner(
			$table_prefix,
			new ScryDexSyncExecutionGate(
				new ScryDexSyncDryRunPlanner(
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
				),
				new ScryDexUsageBudgetPlanner(
					array(
						'scrydex_usage_budget' => array(
							'enabled'                        => true,
							'daily_credit_budget'            => 1000,
							'minimum_remaining_credits'      => 100,
							'per_cards_page_credit_estimate' => 5,
						),
					)
				),
				new ScryDexSyncCheckpointRepositoryPlanner( $table_prefix ),
				new ScryDexPersistenceRepositoryReadinessPlanner( $table_prefix )
			),
			null,
			null,
			null,
			$repository
		);
	}

	/**
	 * @return array<string, mixed>
	 */
	private function cards_fixture(): array {
		$full_path = dirname( __DIR__, 4 ) . '/fixtures/mocks/scrydex/cards-page-1.json';
		$contents  = file_get_contents( $full_path );

		if ( false === $contents ) {
			throw new \RuntimeException( 'Unable to read fixture: fixtures/mocks/scrydex/cards-page-1.json' );
		}

		$decoded = json_decode( $contents, true );

		if ( ! is_array( $decoded ) ) {
			throw new \RuntimeException( 'Fixture did not decode as JSON: fixtures/mocks/scrydex/cards-page-1.json' );
		}

		return $decoded;
	}

	/**
	 * @return array<string, bool>
	 */
	private function ready_gate_overrides(): array {
		return array(
			'network_requests_enabled'    => true,
			'database_writes_enabled'     => true,
			'scheduled_worker_configured' => true,
		);
	}

	private function database(): \wpdb {
		return new class() extends \wpdb {
			public string $prefix = 'wp_';
			public int $prepare_count = 0;
			public int $query_count = 0;

			/**
			 * @param list<mixed> $args Prepared arguments.
			 */
			public function prepare( string $query, array $args ): string {
				++$this->prepare_count;
				unset( $args );

				return 'prepared:' . $query;
			}

			public function query( string $query ): int|false {
				++$this->query_count;
				unset( $query );

				return 1;
			}
		};
	}
}
