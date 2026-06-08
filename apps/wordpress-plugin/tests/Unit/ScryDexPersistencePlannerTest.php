<?php
/**
 * ScryDex persistence planner tests.
 *
 * @package TCGStorePlatform
 */

namespace TCGStorePlatform\Tests\Unit;

use TCGStorePlatform\ScryDex\ScryDexPersistencePlan;
use TCGStorePlatform\ScryDex\ScryDexPersistencePlanner;
use TCGStorePlatform\ScryDex\ScryDexResult;
use TCGStorePlatform\ScryDex\ScryDexSyncCheckpoint;
use TCGStorePlatform\ScryDex\ScryDexSyncPagePlan;
use TCGStorePlatform\ScryDex\ScryDexSyncPageProcessor;
use TCGStorePlatform\Tests\TestCase;

final class ScryDexPersistencePlannerTest extends TestCase {
	public function test_planner_prepares_reference_inserts_and_price_observations(): void {
		$page_plan = $this->page_plan_from_fixture();
		$plan      = ( new ScryDexPersistencePlanner() )->plan_page(
			$page_plan,
			array(),
			'2026-06-06 12:00:00'
		);
		$insert    = $plan->reference_inserts()[0];
		$price     = $plan->price_observations()[0];

		$this->assert_same( ScryDexPersistencePlan::READY, $plan->status() );
		$this->assert_same( 2, count( $plan->reference_inserts() ) );
		$this->assert_same( 0, count( $plan->reference_updates() ) );
		$this->assert_same( 2, count( $plan->price_observations() ) );
		$this->assert_same( 'sdx-pkm-001', $insert['provider_card_id'] );
		$this->assert_same( '2026-06-06 12:00:00', $insert['created_at'] );
		$this->assert_same( '2026-06-06 12:00:00', $insert['updated_at'] );
		$this->assert_same( 1, $insert['row_version'] );
		$this->assert_true( 1 === preg_match( '/^[a-f0-9-]{36}$/', $insert['public_id'] ) );
		$this->assert_same( 'scrydex:sdx-pkm-001', $price['provider_key'] );
		$this->assert_true( 1 === preg_match( '/^[a-f0-9-]{36}$/', $price['public_id'] ) );
		$this->assert_same( null, $price['reference_card_id'] );
		$this->assert_same( 'pokemon', $price['game'] );
		$this->assert_same( '120.0000', $price['market_price'] );
		$this->assert_same( 'USD', $price['currency'] );
		$this->assert_same( '2026-06-06 12:00:00', $price['observed_at'] );
		$this->assert_same( 101, $price['sync_job_id'] );
	}
	public function test_planner_prepares_changed_reference_updates_with_row_version(): void {
		$page_plan = $this->page_plan_from_fixture();
		$existing  = array(
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
		);
		$plan      = ( new ScryDexPersistencePlanner() )->plan_page(
			$page_plan,
			$existing,
			'2026-06-06 12:00:00'
		);
		$update    = $plan->reference_updates()[0];
		$price     = $plan->price_observations()[0];

		$this->assert_same( ScryDexPersistencePlan::READY, $plan->status() );
		$this->assert_same( 1, count( $plan->reference_inserts() ) );
		$this->assert_same( 1, count( $plan->reference_updates() ) );
		$this->assert_same( 88, $update['reference_card_id'] );
		$this->assert_same( 'Charizard', $update['name'] );
		$this->assert_same( 'charizard', $update['normalized_name'] );
		$this->assert_same( '2026-06-06 12:00:00', $update['updated_at'] );
		$this->assert_same( 4, $update['row_version'] );
		$this->assert_same( 88, $price['reference_card_id'] );
		$this->assert_same( 'pokemon', $price['game'] );
	}
	public function test_planner_marks_unchanged_reference_rows_without_update(): void {
		$page_plan = $this->page_plan_from_cards(
			array(
				$this->fixture( 'fixtures/mocks/scrydex/cards-page-1.json' )['cards'][0],
			)
		);
		$row       = $page_plan->reference_rows()[0];
		$existing  = array(
			array_merge(
				$row,
				array(
					'reference_card_id' => 55,
					'row_version'       => 2,
				)
			),
		);
		$plan      = ( new ScryDexPersistencePlanner() )->plan_page(
			$page_plan,
			$existing,
			'2026-06-06 12:00:00'
		);

		$this->assert_same( ScryDexPersistencePlan::READY, $plan->status() );
		$this->assert_same( 0, $plan->reference_write_count() );
		$this->assert_same( array( 'scrydex:sdx-pkm-001' ), $plan->unchanged_reference_keys() );
		$this->assert_same( 55, $plan->price_observations()[0]['reference_card_id'] );
	}

	public function test_failed_page_plan_is_not_persisted(): void {
		$checkpoint = ScryDexSyncCheckpoint::initial( 101, 'cards', 'pokemon' );
		$page_plan  = ( new ScryDexSyncPageProcessor() )->process_cards_page(
			$checkpoint,
			new ScryDexResult(
				ScryDexResult::RATE_LIMITED,
				429,
				array(),
				'scrydex_rate_limited',
				'Rate limited.'
			)
		);
		$plan       = ( new ScryDexPersistencePlanner() )->plan_page( $page_plan );

		$this->assert_same( ScryDexPersistencePlan::FAILED, $plan->status() );
		$this->assert_true( $plan->retryable() );
		$this->assert_same( 'scrydex_rate_limited', $plan->error_code() );
		$this->assert_same( 0, $plan->reference_write_count() );
		$this->assert_same( array(), $plan->price_observations() );
		$this->assert_same( null, $plan->next_checkpoint() );
	}

	private function page_plan_from_fixture(): ScryDexSyncPagePlan {
		return $this->page_plan_from_cards(
			$this->fixture( 'fixtures/mocks/scrydex/cards-page-1.json' )['cards']
		);
	}

	/**
	 * @param list<array<string, mixed>> $cards Fixture card rows.
	 */
	private function page_plan_from_cards( array $cards ): ScryDexSyncPagePlan {
		return ( new ScryDexSyncPageProcessor() )->process_cards_page(
			ScryDexSyncCheckpoint::initial( 101, 'cards', 'pokemon' ),
			new ScryDexResult(
				ScryDexResult::SUCCESS,
				200,
				array(
					'page'        => 1,
					'next_cursor' => 'cursor-page-2',
					'cards'       => $cards,
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
