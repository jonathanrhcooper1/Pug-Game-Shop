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
		$this->assert_same( 2, $result->price_observation_query_count() );
		$this->assert_same( 1, $result->checkpoint_query_count() );
		$this->assert_same( 5, $result->total_query_count() );
		$this->assert_same( $query_plan->prepare_arg_count(), $result->prepare_arg_count() );
		$this->assert_same( 'reference_card_insert', $result->reference_insert_results()[0]['query_kind'] );
		$this->assert_same( 'sdx-pkm-001', $result->reference_insert_results()[0]['provider_card_id'] );
		$this->assert_same( 'provider_price_observation_insert', $result->price_observation_results()[0]['query_kind'] );
		$this->assert_same( 'checkpoint_upsert', $result->checkpoint_result()['query_kind'] );
		$this->assert_same( 'pokemon', $result->checkpoint_result()['resource_key'] );
		$this->assert_same( 'scrydex_persistence_repository', $audit['action'] );
		$this->assert_same( 'scrydex_persistence_sql_planned', $audit['query']['action'] );
		$this->assert_true( $audit['explicit_execution_required'] );
		$this->assert_true( $audit['persistence_repository_deferred'] );
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
		$this->assert_same( array(), $result->price_observation_results() );
		$this->assert_same( null, $result->checkpoint_result() );
		$this->assert_same( array( 'scrydex_persistence_source_plan_failed' ), $result->errors() );
		$this->assert_true( $audit['is_rejected'] );
		$this->assert_true( $audit['persistence_repository_deferred'] );
		$this->assert_same( array( 'scrydex_persistence_source_plan_failed' ), $audit['errors'] );
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
}
