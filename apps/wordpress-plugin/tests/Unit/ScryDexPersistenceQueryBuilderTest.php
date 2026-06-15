<?php
/**
 * ScryDex persistence SQL builder tests.
 *
 * @package TCGStorePlatform
 */

namespace TCGStorePlatform\Tests\Unit;

use TCGStorePlatform\ScryDex\ScryDexPersistencePlan;
use TCGStorePlatform\ScryDex\ScryDexPersistencePlanner;
use TCGStorePlatform\ScryDex\ScryDexPersistenceQueryBuilder;
use TCGStorePlatform\ScryDex\ScryDexResult;
use TCGStorePlatform\ScryDex\ScryDexSyncCheckpoint;
use TCGStorePlatform\ScryDex\ScryDexSyncPagePlan;
use TCGStorePlatform\ScryDex\ScryDexSyncPageProcessor;
use TCGStorePlatform\Tests\TestCase;

final class ScryDexPersistenceQueryBuilderTest extends TestCase {
	public function test_builder_creates_reference_price_and_checkpoint_queries(): void {
		$persistence_plan = ( new ScryDexPersistencePlanner() )->plan_page(
			$this->page_plan_from_fixture(),
			array(),
			'2026-06-07 12:00:00'
		);
		$query_plan      = ( new ScryDexPersistenceQueryBuilder() )->build( $persistence_plan, 'wp_' );
		$audit           = $query_plan->audit_payload();
		$reference       = $query_plan->reference_insert_queries()[0];
		$variant         = $query_plan->reference_variant_upsert_queries()[0];
		$price           = $query_plan->price_observation_queries()[0];
		$checkpoint      = $query_plan->checkpoint_upsert_query();

		$this->assert_true( $query_plan->is_valid() );
		$this->assert_same(
			array(
				'reference_cards'              => 'wp_tcg_reference_cards',
				'reference_variants'           => 'wp_tcg_reference_variants',
				'provider_price_observations' => 'wp_tcg_provider_price_observations',
				'provider_price_points'       => 'wp_tcg_provider_price_points',
				'sync_checkpoints'            => 'wp_tcg_sync_checkpoints',
			),
			$query_plan->table_names()
		);
		$this->assert_same( 2, count( $query_plan->reference_insert_queries() ) );
		$this->assert_same( 0, count( $query_plan->reference_update_queries() ) );
		$this->assert_same( 2, count( $query_plan->reference_variant_upsert_queries() ) );
		$this->assert_same( 2, count( $query_plan->price_observation_queries() ) );
		$this->assert_same( 2, count( $query_plan->price_point_queries() ) );
		$this->assert_true( is_array( $checkpoint ) );
		$this->assert_same( 9, $query_plan->total_query_count() );
		$this->assert_contains( 'INSERT INTO `wp_tcg_reference_cards`', $reference['sql_template'] );
		$this->assert_contains( 'ON DUPLICATE KEY UPDATE', $reference['sql_template'] );
		$this->assert_contains( '`row_version` = `row_version` + 1', $reference['sql_template'] );
		$this->assert_contains( '`public_id`', $reference['sql_template'] );
		$this->assert_same( 'reference_card_insert', $reference['query_kind'] );
		$this->assert_true( $reference['reference_card_insert_idempotent'] );
		$this->assert_same( 'sdx-pkm-001', $reference['provider_card_id'] );
		$this->assert_contains( 'INSERT INTO `wp_tcg_reference_variants`', $variant['sql_template'] );
		$this->assert_contains( 'ON DUPLICATE KEY UPDATE', $variant['sql_template'] );
		$this->assert_same( 'reference_variant_upsert', $variant['query_kind'] );
		$this->assert_same( 'sdx-pkm-001-holo-unlimited', $variant['provider_variant_id'] );
		$this->assert_contains( 'INSERT INTO `wp_tcg_provider_price_observations`', $price['sql_template'] );
		$this->assert_contains( 'ON DUPLICATE KEY UPDATE', $price['sql_template'] );
		$this->assert_contains( 'SELECT reference_card_id FROM `wp_tcg_reference_cards`', $price['sql_template'] );
		$this->assert_same( 'provider_price_observation_insert', $price['query_kind'] );
		$this->assert_same( 'sdx-pkm-001', $price['provider_card_id'] );
		$this->assert_true( in_array( 'scrydex', $price['prepare_args'], true ) );
		$this->assert_true( in_array( 'sdx-pkm-001', $price['prepare_args'], true ) );
		$this->assert_true( is_string( $price['public_id'] ) );
		$this->assert_contains( 'INSERT INTO `wp_tcg_provider_price_points`', $query_plan->price_point_queries()[0]['sql_template'] );
		$this->assert_contains( 'SELECT reference_card_id FROM `wp_tcg_reference_cards`', $query_plan->price_point_queries()[0]['sql_template'] );
		$this->assert_same( 'provider_price_point_insert', $query_plan->price_point_queries()[0]['query_kind'] );
		$this->assert_contains( 'INSERT INTO `wp_tcg_sync_checkpoints`', $checkpoint['sql_template'] );
		$this->assert_same( 'checkpoint_upsert', $checkpoint['query_kind'] );
		$this->assert_same( 'pokemon', $checkpoint['resource_key'] );
		$this->assert_true( $audit['persistence_query_execution_deferred'] );
		$this->assert_true( $audit['provider_price_observation_writes_deferred'] );
		$this->assert_same( array(), $audit['errors'] );
	}

	public function test_builder_creates_changed_reference_updates(): void {
		$persistence_plan = ( new ScryDexPersistencePlanner() )->plan_page(
			$this->page_plan_from_fixture(),
			array(
				array(
					'reference_card_id'   => 88,
					'provider_name'       => 'scrydex',
					'provider_card_id'    => 'sdx-pkm-001',
					'game'                => 'pokemon',
					'name'                => 'Old Charizard',
					'normalized_name'     => 'old charizard',
					'set_name'            => 'Base Set',
					'set_code'            => 'BS',
					'card_number'         => '4',
					'printed_number'      => null,
					'rarity'              => 'Rare Holo',
					'provider_updated_at' => '2026-06-06 09:00:00',
					'search_text'         => 'pokemon Old Charizard Base Set BS 4 Rare Holo',
					'row_version'         => 3,
				),
			),
			'2026-06-07 12:00:00'
		);
		$query_plan      = ( new ScryDexPersistenceQueryBuilder() )->build( $persistence_plan, 'wp_' );
		$update          = $query_plan->reference_update_queries()[0];
		$price           = $query_plan->price_observation_queries()[0];

		$this->assert_true( $query_plan->is_valid() );
		$this->assert_same( 1, count( $query_plan->reference_insert_queries() ) );
		$this->assert_same( 1, count( $query_plan->reference_update_queries() ) );
		$this->assert_same( 2, count( $query_plan->reference_variant_upsert_queries() ) );
		$this->assert_contains( 'UPDATE `wp_tcg_reference_cards` SET', $update['sql_template'] );
		$this->assert_contains( 'WHERE reference_card_id = %d', $update['sql_template'] );
		$this->assert_same( 88, $update['reference_card_id'] );
		$this->assert_same( 'sdx-pkm-001', $update['provider_card_id'] );
		$this->assert_true( in_array( 88, $update['prepare_args'], true ) );
		$this->assert_true( in_array( 88, $price['prepare_args'], true ) );
	}

	public function test_builder_accepts_scrydex_provider_ids_with_question_and_bang_marks(): void {
		$fixture = $this->fixture( 'fixtures/mocks/scrydex/cards-page-1.json' );
		$cards   = array( $fixture['cards'][0] );

		$cards[0]['id']                   = 'ex10-?';
		$cards[0]['name']                 = 'Unown ?';
		$cards[0]['variants'][0]['id']    = 'ex10-?:normal';
		$cards[0]['variants'][0]['variant'] = 'Normal ?';
		$cards[0]['variants'][1]['id']    = 'ex10-!:reverse';
		$cards[0]['variants'][1]['variant'] = 'Reverse !';

		$page_plan = ( new ScryDexSyncPageProcessor() )->process_cards_page(
			ScryDexSyncCheckpoint::initial( 101, 'cards', 'pokemon:ex10' ),
			new ScryDexResult(
				ScryDexResult::SUCCESS,
				200,
				array(
					'page'  => 1,
					'cards' => $cards,
				)
			)
		);
		$query_plan = ( new ScryDexPersistenceQueryBuilder() )->build(
			( new ScryDexPersistencePlanner() )->plan_page( $page_plan ),
			'wp_'
		);

		$this->assert_true( $query_plan->is_valid() );
		$this->assert_same( array(), $query_plan->errors() );
		$this->assert_same( 'ex10-?', $query_plan->reference_insert_queries()[0]['provider_card_id'] );
		$this->assert_same( 'ex10-?:normal', $query_plan->reference_variant_upsert_queries()[0]['provider_variant_id'] );
		$this->assert_same( 'ex10-!', substr( $query_plan->reference_variant_upsert_queries()[1]['provider_variant_id'], 0, 6 ) );
	}

	public function test_builder_rejects_failed_source_plan_and_invalid_prefix(): void {
		$failed = ScryDexPersistencePlan::failed(
			'scrydex_rate_limited',
			true,
			array(
				array(
					'errors' => array( 'scrydex_rate_limited' ),
				),
			)
		);
		$result = ( new ScryDexPersistenceQueryBuilder() )->build( $failed, 'wp_' );

		$this->assert_false( $result->is_valid() );
		$this->assert_same( array( 'scrydex_persistence_source_plan_failed' ), $result->errors() );
		$this->assert_same( 0, $result->total_query_count() );

		$invalid_prefix = ( new ScryDexPersistenceQueryBuilder() )->build(
			( new ScryDexPersistencePlanner() )->plan_page( $this->page_plan_from_fixture() ),
			'wp-bad_'
		);

		$this->assert_false( $invalid_prefix->is_valid() );
		$this->assert_true( in_array( 'scrydex_persistence_table_prefix_invalid', $invalid_prefix->errors(), true ) );
		$this->assert_same( 0, $invalid_prefix->total_query_count() );
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
