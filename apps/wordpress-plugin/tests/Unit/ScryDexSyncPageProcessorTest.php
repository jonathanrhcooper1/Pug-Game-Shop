<?php
/**
 * ScryDex sync page processor tests.
 *
 * @package TCGStorePlatform
 */

namespace TCGStorePlatform\Tests\Unit;

use TCGStorePlatform\ScryDex\ScryDexResult;
use TCGStorePlatform\ScryDex\ScryDexSyncCheckpoint;
use TCGStorePlatform\ScryDex\ScryDexSyncPagePlan;
use TCGStorePlatform\ScryDex\ScryDexSyncPageProcessor;
use TCGStorePlatform\Tests\TestCase;

final class ScryDexSyncPageProcessorTest extends TestCase {
	public function test_processor_plans_normalized_rows_and_advances_checkpoint(): void {
		$fixture    = $this->fixture( 'fixtures/mocks/scrydex/cards-page-1.json' );
		$checkpoint = ScryDexSyncCheckpoint::initial( 101, 'cards', 'pokemon' );
		$plan       = ( new ScryDexSyncPageProcessor() )->process_cards_page(
			$checkpoint,
			new ScryDexResult( ScryDexResult::SUCCESS, 200, $fixture )
		);
		$next       = $plan->next_checkpoint();

		$this->assert_same( ScryDexSyncPagePlan::SUCCESS, $plan->status() );
		$this->assert_same( 2, count( $plan->reference_rows() ) );
		$this->assert_same( 2, count( $plan->price_rows() ) );
		$this->assert_same( 2, count( $plan->variant_rows() ) );
		$this->assert_same( 'sdx-pkm-001', $plan->reference_rows()[0]['provider_card_id'] );
		$this->assert_same( 'sdx-pkm-001-holo-unlimited', $plan->variant_rows()[0]['provider_variant_id'] );
		$this->assert_same( '120.0000', $plan->price_rows()[0]['market_price'] );
		$this->assert_true( null !== $next );
		$this->assert_same( 1, $next->page_number() );
		$this->assert_same( 'mock-cursor-page-2', $next->cursor() );
		$this->assert_same( 2, $next->committed_count() );
	}

	public function test_processor_reports_invalid_card_without_counting_commit(): void {
		$checkpoint = ScryDexSyncCheckpoint::initial( 101, 'cards', 'pokemon' );
		$plan       = ( new ScryDexSyncPageProcessor() )->process_cards_page(
			$checkpoint,
			new ScryDexResult(
				ScryDexResult::SUCCESS,
				200,
				array(
					'page'        => 1,
					'next_cursor' => 'cursor-page-2',
					'cards'       => array(
						array(
							'id' => '',
						),
					),
				)
			)
		);
		$next       = $plan->next_checkpoint();

		$this->assert_same( ScryDexSyncPagePlan::PARTIAL_SUCCESS, $plan->status() );
		$this->assert_same( array(), $plan->reference_rows() );
		$this->assert_same( array(), $plan->variant_rows() );
		$this->assert_same( 'missing_provider_card_id', $plan->errors()[0]['errors'][0] );
		$this->assert_true( null !== $next );
		$this->assert_same( 0, $next->committed_count() );
	}

	public function test_rate_limited_result_is_retryable_and_has_no_checkpoint(): void {
		$checkpoint = ScryDexSyncCheckpoint::initial( 101, 'cards', 'pokemon' );
		$plan       = ( new ScryDexSyncPageProcessor() )->process_cards_page(
			$checkpoint,
			new ScryDexResult(
				ScryDexResult::RATE_LIMITED,
				429,
				array(),
				'scrydex_rate_limited',
				'Rate limited.'
			)
		);

		$this->assert_same( ScryDexSyncPagePlan::FAILED, $plan->status() );
		$this->assert_true( $plan->retryable() );
		$this->assert_same( 'scrydex_rate_limited', $plan->error_code() );
		$this->assert_same( null, $plan->next_checkpoint() );
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
