<?php
/**
 * ScryDex cards sync worker tests.
 *
 * @package TCGStorePlatform
 */

namespace TCGStorePlatform\Tests\Unit;

use TCGStorePlatform\ScryDex\ScryDexCardsSyncWorker;
use TCGStorePlatform\ScryDex\ScryDexCardsSyncWorkerPlanner;
use TCGStorePlatform\ScryDex\ScryDexPersistenceRepository;
use TCGStorePlatform\ScryDex\ScryDexPersistenceRepositoryReadinessPlanner;
use TCGStorePlatform\ScryDex\ScryDexProviderFactory;
use TCGStorePlatform\ScryDex\ScryDexSyncCheckpointRepositoryPlanner;
use TCGStorePlatform\ScryDex\ScryDexSyncDryRunPlanner;
use TCGStorePlatform\ScryDex\ScryDexSyncExecutionGate;
use TCGStorePlatform\ScryDex\ScryDexUsageBudgetPlanner;
use TCGStorePlatform\Tests\TestCase;

final class ScryDexCardsSyncWorkerTest extends TestCase {
	public function test_worker_stops_before_provider_call_when_gate_is_blocked(): void {
		$transport_called = false;
		$worker           = new ScryDexCardsSyncWorker(
			'wp_',
			new ScryDexProviderFactory(
				array(),
				function () use ( &$transport_called ): array {
					$transport_called = true;

					return array(
						'status' => 500,
						'body'   => array(),
					);
				}
			)
		);
		$result           = $worker->run_cards_pages();

		$this->assert_same( 'blocked', $result['status'] );
		$this->assert_same( 0, $result['provider_request_count'] );
		$this->assert_true( $result['provider_fetch_deferred'] );
		$this->assert_true( $result['network_requests_deferred'] );
		$this->assert_true( $result['database_writes_deferred'] );
		$this->assert_false( $transport_called );
		$this->assert_true( in_array( 'scrydex_provider_not_configured', $result['block_reasons'], true ) );
	}

	public function test_worker_runs_paginated_card_pages_and_exposes_safe_resume_state(): void {
		$urls   = array();
		$worker = $this->worker(
			function ( string $method, string $url, array $args ) use ( &$urls ): array {
				$this->assert_same( 'GET', $method );
				$this->assert_true( isset( $args['headers']['X-Api-Key'] ) );
				$urls[] = $url;

				if ( str_contains( $url, 'page=2' ) ) {
					return array(
						'status' => 200,
						'body'   => $this->cards_page( 2, '', 'sdx-pkm-002', 'Blastoise' ),
					);
				}

				return array(
					'status' => 200,
					'body'   => $this->cards_page( 1, 'mock-cursor-page-2', 'sdx-pkm-001', 'Charizard' ),
				);
			}
		);
		$result = $worker->run_cards_pages(
			array(
				'game'      => 'pokemon',
				'page_size' => 2,
				'max_pages' => 2,
			),
			array(),
			$this->ready_gate_overrides()
		);
		$json   = json_encode( $result );

		$this->assert_same( 'completed', $result['status'] );
		$this->assert_same( 2, $result['page_count'] );
		$this->assert_same( 2, $result['provider_request_count'] );
		$this->assert_false( $result['network_requests_deferred'] );
		$this->assert_true( $result['database_writes_deferred'] );
		$this->assert_false( $result['continuation_available'] );
		$this->assert_same( 2, $result['last_checkpoint_row']['page_number'] );
		$this->assert_same( 2, $result['last_checkpoint_row']['committed_count'] );
		$this->assert_same( 'mock-cursor-page-2', $result['pages'][1]['provider_request']['cursor'] );
		$this->assert_same( 'planned', $result['pages'][0]['orchestration_plan']['status'] );
		$this->assert_same( 'planned', $result['pages'][1]['orchestration_plan']['status'] );
		$this->assert_same( 2, count( $urls ) );
		$this->assert_not_contains( 'staging-primary-key', false === $json ? '' : $json );
		$this->assert_not_contains( 'staging-team-id', false === $json ? '' : $json );
	}

	public function test_worker_respects_page_limit_and_returns_continuation_checkpoint(): void {
		$worker = $this->worker(
			fn (): array => array(
				'status' => 200,
				'body'   => $this->cards_page( 1, 'mock-cursor-page-2', 'sdx-pkm-001', 'Charizard' ),
			)
		);
		$result = $worker->run_cards_pages(
			array(
				'game'      => 'pokemon',
				'page_size' => 2,
				'max_pages' => 1,
			),
			array(),
			$this->ready_gate_overrides()
		);

		$this->assert_same( 'page_limit_reached', $result['status'] );
		$this->assert_same( 1, $result['page_count'] );
		$this->assert_same( 1, $result['provider_request_count'] );
		$this->assert_true( $result['continuation_available'] );
		$this->assert_same( 'mock-cursor-page-2', $result['continuation_checkpoint_row']['cursor_value'] );
		$this->assert_same( 1, $result['continuation_checkpoint_row']['page_number'] );
	}

	public function test_worker_can_execute_persistence_when_explicitly_requested(): void {
		$database = $this->database();
		$worker   = $this->worker(
			fn (): array => array(
				'status' => 200,
				'body'   => $this->cards_page( 1, '', 'sdx-pkm-001', 'Charizard' ),
			),
			new ScryDexPersistenceRepository( $database )
		);
		$result   = $worker->run_cards_pages(
			array(
				'game'                    => 'pokemon',
				'page_size'               => 2,
				'max_pages'               => 1,
				'execute_database_writes' => true,
			),
			array(),
			$this->ready_gate_overrides()
		);

		$this->assert_same( 'completed', $result['status'] );
		$this->assert_false( $result['database_writes_deferred'] );
		$this->assert_false( $result['reference_card_writes_deferred'] );
		$this->assert_false( $result['checkpoint_upsert_execution_deferred'] );
		$this->assert_true( $result['execute_database_writes_requested'] );
		$this->assert_same( 'executed', $result['pages'][0]['orchestration_plan']['status'] );
		$this->assert_same( 'executed', $result['pages'][0]['orchestration_plan']['persistence_repository_result']['status'] );
		$this->assert_true( $result['pages'][0]['orchestration_plan']['persistence_repository_result']['transaction_committed'] );
		$this->assert_same( 3, $database->prepare_count );
		$this->assert_same( 5, $database->query_count );
	}

	/**
	 * @param callable $transport ScryDex transport.
	 */
	private function worker( callable $transport, ?ScryDexPersistenceRepository $repository = null ): ScryDexCardsSyncWorker {
		$factory = new ScryDexProviderFactory(
			array(
				'scrydex_provider' => array(
					'enabled'         => true,
					'environment'     => 'staging',
					'team_id'         => 'staging-team-id',
					'primary_api_key' => 'staging-primary-key',
				),
			),
			$transport
		);
		$gate    = new ScryDexSyncExecutionGate(
			new ScryDexSyncDryRunPlanner( $factory ),
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
			new ScryDexSyncCheckpointRepositoryPlanner( 'wp_' ),
			new ScryDexPersistenceRepositoryReadinessPlanner( 'wp_' )
		);
		$page_planner = null === $repository ? null : new ScryDexCardsSyncWorkerPlanner(
			'wp_',
			$gate,
			null,
			null,
			null,
			$repository
		);

		return new ScryDexCardsSyncWorker(
			'wp_',
			$factory,
			$gate,
			$page_planner
		);
	}

	/**
	 * @return array<string, mixed>
	 */
	private function cards_page( int $page, string $next_cursor, string $id, string $name ): array {
		$body = array(
			'page'  => $page,
			'cards' => array(
				array(
					'id'           => $id,
					'game'         => 'pokemon',
					'name'         => $name,
					'set'          => array(
						'code' => 'BS',
						'name' => 'Base Set',
					),
					'number'       => (string) ( $page + 3 ),
					'rarity'       => 'Rare Holo',
					'market_price' => array(
						'amount'   => '12.00',
						'currency' => 'USD',
					),
					'images'       => array(
						'front' => 'https://images.example.test/pokemon/' . strtolower( $name ) . '.png',
					),
					'updated_at'   => '2026-06-06T09:00:00Z',
				),
			),
		);

		if ( '' !== $next_cursor ) {
			$body['pagination'] = array(
				'next_cursor' => $next_cursor,
				'has_more'    => true,
			);
		}

		return $body;
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
