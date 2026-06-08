<?php
/**
 * ScryDex persistence repository staging tests.
 *
 * @package TCGStorePlatform
 */

namespace TCGStorePlatform\Tests\Unit;

use TCGStorePlatform\ScryDex\ScryDexPersistencePlan;
use TCGStorePlatform\ScryDex\ScryDexPersistencePlanner;
use TCGStorePlatform\ScryDex\ScryDexPersistenceQueryBuilder;
use TCGStorePlatform\ScryDex\ScryDexPersistenceQueryBuildPlan;
use TCGStorePlatform\ScryDex\ScryDexPersistenceRepository;
use TCGStorePlatform\ScryDex\ScryDexResult;
use TCGStorePlatform\ScryDex\ScryDexSyncCheckpoint;
use TCGStorePlatform\ScryDex\ScryDexSyncPagePlan;
use TCGStorePlatform\ScryDex\ScryDexSyncPageProcessor;
use TCGStorePlatform\Tests\TestCase;

final class ScryDexPersistenceRepositoryTest extends TestCase {
	public function test_repository_stages_persistence_queries_as_deferred(): void {
		$query_plan = ( new ScryDexPersistenceQueryBuilder() )->build(
			( new ScryDexPersistencePlanner() )->plan_page(
				$this->page_plan_from_fixture(),
				array(),
				'2026-06-07 12:00:00'
			),
			'wp_'
		);
		$result     = ( new ScryDexPersistenceRepository() )->stage( $query_plan );
		$audit      = $result->audit_payload();

		$this->assert_true( $result->is_deferred() );
		$this->assert_false( $result->is_rejected() );
		$this->assert_same( 'deferred', $result->status() );
		$this->assert_same( 0, $result->rows_affected() );
		$this->assert_same( 2, $result->reference_insert_query_count() );
		$this->assert_same( 0, $result->reference_update_query_count() );
		$this->assert_same( 2, $result->reference_variant_upsert_query_count() );
		$this->assert_same( 2, $result->price_observation_query_count() );
		$this->assert_same( 1, $result->checkpoint_query_count() );
		$this->assert_same( 7, $result->total_query_count() );
		$this->assert_same( $query_plan->prepare_arg_count(), $result->prepare_arg_count() );
		$this->assert_same( 'reference_card_insert', $result->reference_insert_results()[0]['query_kind'] );
		$this->assert_same( 'sdx-pkm-001', $result->reference_insert_results()[0]['provider_card_id'] );
		$this->assert_same( 'reference_variant_upsert', $result->reference_variant_upsert_results()[0]['query_kind'] );
		$this->assert_same( 'sdx-pkm-001-holo-unlimited', $result->reference_variant_upsert_results()[0]['provider_variant_id'] );
		$this->assert_same( 'provider_price_observation_insert', $result->price_observation_results()[0]['query_kind'] );
		$this->assert_same( 'checkpoint_upsert', $result->checkpoint_result()['query_kind'] );
		$this->assert_same( 'pokemon', $result->checkpoint_result()['resource_key'] );
		$this->assert_same( 'scrydex_persistence_repository', $audit['action'] );
		$this->assert_same( 'scrydex_persistence_sql_planned', $audit['query']['action'] );
		$this->assert_true( $audit['explicit_execution_required'] );
		$this->assert_true( $audit['persistence_repository_deferred'] );
		$this->assert_true( $audit['reference_variant_writes_deferred'] );
		$this->assert_true( $audit['provider_price_observation_writes_deferred'] );
		$this->assert_true( $audit['checkpoint_upsert_execution_deferred'] );
		$this->assert_same( array(), $audit['errors'] );
	}

	public function test_repository_rejects_invalid_query_plan_without_results(): void {
		$query_plan = ( new ScryDexPersistenceQueryBuilder() )->build(
			ScryDexPersistencePlan::failed(
				'scrydex_rate_limited',
				true,
				array(
					array(
						'errors' => array( 'scrydex_rate_limited' ),
					),
				)
			),
			'wp_'
		);
		$result     = ( new ScryDexPersistenceRepository() )->stage( $query_plan );
		$audit      = $result->audit_payload();

		$this->assert_true( $result->is_rejected() );
		$this->assert_false( $result->is_deferred() );
		$this->assert_same( 'rejected', $result->status() );
		$this->assert_same( 0, $result->total_query_count() );
		$this->assert_same( 0, $result->prepare_arg_count() );
		$this->assert_same( array(), $result->reference_insert_results() );
		$this->assert_same( array(), $result->reference_variant_upsert_results() );
		$this->assert_same( array(), $result->price_observation_results() );
		$this->assert_same( null, $result->checkpoint_result() );
		$this->assert_same( array( 'scrydex_persistence_source_plan_failed' ), $result->errors() );
		$this->assert_true( $audit['is_rejected'] );
		$this->assert_true( $audit['persistence_repository_deferred'] );
		$this->assert_same( array( 'scrydex_persistence_source_plan_failed' ), $audit['errors'] );
	}

	public function test_repository_executes_valid_query_plan_in_transaction(): void {
		$query_plan = $this->query_plan_from_fixture();
		$database   = $this->database();
		$result     = ( new ScryDexPersistenceRepository( $database ) )->execute( $query_plan );
		$audit      = $result->audit_payload();

		$this->assert_true( $result->is_executed() );
		$this->assert_false( $result->is_deferred() );
		$this->assert_false( $result->is_rejected() );
		$this->assert_same( 'executed', $result->status() );
		$this->assert_same( 7, $result->rows_affected() );
		$this->assert_same( 2, $result->reference_insert_query_count() );
		$this->assert_same( 2, $result->reference_variant_upsert_query_count() );
		$this->assert_same( 2, $result->price_observation_query_count() );
		$this->assert_same( 1, $result->checkpoint_query_count() );
		$this->assert_same( 7, $database->prepare_count );
		$this->assert_same( 9, $database->query_count );
		$this->assert_true( in_array( 'START TRANSACTION', $database->queries, true ) );
		$this->assert_true( in_array( 'COMMIT', $database->queries, true ) );
		$this->assert_same( 'COMMIT', $database->last_query );
		$this->assert_contains( 'INSERT INTO `wp_tcg_reference_cards`', $database->prepare_queries[0] );
		$this->assert_contains( 'INSERT INTO `wp_tcg_reference_variants`', $database->prepare_queries[2] );
		$this->assert_contains( 'INSERT INTO `wp_tcg_provider_price_observations`', $database->prepare_queries[4] );
		$this->assert_contains( 'INSERT INTO `wp_tcg_sync_checkpoints`', $database->prepare_queries[6] );
		$this->assert_same( 'executed', $result->reference_insert_results()[0]['execution_status'] );
		$this->assert_same( 1, $result->reference_insert_results()[0]['rows_affected'] );
		$this->assert_true( $audit['transaction_started'] );
		$this->assert_true( $audit['transaction_committed'] );
		$this->assert_false( $audit['transaction_rolled_back'] );
		$this->assert_false( $audit['persistence_repository_deferred'] );
		$this->assert_false( $audit['reference_card_writes_deferred'] );
		$this->assert_false( $audit['reference_variant_writes_deferred'] );
		$this->assert_false( $audit['provider_price_observation_writes_deferred'] );
		$this->assert_false( $audit['checkpoint_upsert_execution_deferred'] );
		$this->assert_same( array(), $audit['errors'] );
	}

	public function test_repository_execute_rejects_database_prefix_mismatch_before_query(): void {
		$query_plan = $this->query_plan_from_fixture();
		$database   = $this->database( 1, 'shop_' );
		$result     = ( new ScryDexPersistenceRepository( $database ) )->execute( $query_plan );

		$this->assert_true( $result->is_rejected() );
		$this->assert_false( $result->is_executed() );
		$this->assert_same( 0, $database->prepare_count );
		$this->assert_same( 0, $database->query_count );
		$this->assert_same( array( 'scrydex_persistence_table_prefix_mismatch' ), $result->errors() );
	}

	public function test_repository_execute_rolls_back_on_reference_write_failure(): void {
		$query_plan = $this->query_plan_from_fixture();
		$database   = $this->database( array( 1, 1, false ) );
		$result     = ( new ScryDexPersistenceRepository( $database ) )->execute( $query_plan );
		$audit      = $result->audit_payload();

		$this->assert_true( $result->is_rejected() );
		$this->assert_false( $result->is_executed() );
		$this->assert_same( array( 'scrydex_reference_card_insert_failed' ), $result->errors() );
		$this->assert_same( 1, $result->rows_affected() );
		$this->assert_same( 2, $database->prepare_count );
		$this->assert_same( 4, $database->query_count );
		$this->assert_same( 'ROLLBACK', $database->last_query );
		$this->assert_true( $audit['transaction_started'] );
		$this->assert_false( $audit['transaction_committed'] );
		$this->assert_true( $audit['transaction_rolled_back'] );
	}

	private function query_plan_from_fixture( string $table_prefix = 'wp_' ): ScryDexPersistenceQueryBuildPlan {
		return ( new ScryDexPersistenceQueryBuilder() )->build(
			( new ScryDexPersistencePlanner() )->plan_page(
				$this->page_plan_from_fixture(),
				array(),
				'2026-06-07 12:00:00'
			),
			$table_prefix
		);
	}

	private function page_plan_from_fixture(): ScryDexSyncPagePlan {
		return ( new ScryDexSyncPageProcessor() )->process_cards_page(
			ScryDexSyncCheckpoint::initial( 101, 'cards', 'pokemon' ),
			new ScryDexResult(
				ScryDexResult::SUCCESS,
				200,
				array(
					'page'        => 1,
					'next_cursor' => 'cursor-page-2',
					'cards'       => $this->fixture( 'fixtures/mocks/scrydex/cards-page-1.json' )['cards'],
				)
			)
		);
	}

	/**
	 * @return array<string, mixed>
	 */
	private function fixture( string $path ): array {
		$full_path = dirname( __DIR__, 4 ) . '/' . $path;
		$contents  = file_get_contents( $full_path );

		if ( false === $contents ) {
			throw new \RuntimeException( 'Unable to read fixture: ' . $path );
		}

		$decoded = json_decode( $contents, true );

		if ( ! is_array( $decoded ) ) {
			throw new \RuntimeException( 'Fixture did not decode as JSON: ' . $path );
		}

		return $decoded;
	}

	private function database( int|false|array $query_result = 1, string $prefix = 'wp_' ): \wpdb {
		return new class( $query_result, $prefix ) extends \wpdb {
			public string $prefix;
			public int $prepare_count = 0;
			public int $query_count = 0;
			public string $last_prepare_query = '';
			public string $last_query = '';
			public array $prepare_queries = array();
			public array $queries = array();
			private int|false $query_result = 1;
			private array $query_results = array();

			/**
			 * @var list<mixed>
			 */
			public array $last_prepare_args = array();

			public function __construct( int|false|array $query_result, string $prefix ) {
				$this->prefix = $prefix;

				if ( is_array( $query_result ) ) {
					$this->query_results = array_values( $query_result );
				} else {
					$this->query_result = $query_result;
				}
			}

			/**
			 * @param list<mixed> $args Prepared arguments.
			 */
			public function prepare( string $query, array $args ): string {
				++$this->prepare_count;
				$this->last_prepare_query = $query;
				$this->last_prepare_args  = array_values( $args );
				$this->prepare_queries[]  = $query;

				return 'prepared:' . $query;
			}

			public function query( string $query ): int|false {
				++$this->query_count;
				$this->last_query = $query;
				$this->queries[]  = $query;

				if ( array() !== $this->query_results ) {
					return array_shift( $this->query_results );
				}

				return $this->query_result;
			}
		};
	}
}
