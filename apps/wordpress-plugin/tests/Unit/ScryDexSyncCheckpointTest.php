<?php
/**
 * ScryDex sync checkpoint tests.
 *
 * @package TCGStorePlatform
 */

namespace TCGStorePlatform\Tests\Unit;

use TCGStorePlatform\ScryDex\ScryDexSyncCheckpoint;
use TCGStorePlatform\ScryDex\ScryDexSyncPlanner;
use TCGStorePlatform\Tests\TestCase;

final class ScryDexSyncCheckpointTest extends TestCase {
	public function test_initial_checkpoint_starts_with_first_page_and_no_cursor(): void {
		$checkpoint = ScryDexSyncCheckpoint::initial( 101, 'cards', 'pokemon' );
		$request    = ( new ScryDexSyncPlanner() )->next_cards_request( $checkpoint, 500 );

		$this->assert_same( 1, $checkpoint->next_page() );
		$this->assert_same( '', $checkpoint->cursor() );
		$this->assert_same( 100, $request['page_size'] );
		$this->assert_same( 'pokemon', $request['resource_key'] );
	}

	public function test_checkpoint_advances_after_successful_page(): void {
		$checkpoint = ScryDexSyncCheckpoint::initial( 101, 'cards', 'pokemon' );
		$next       = ( new ScryDexSyncPlanner() )->checkpoint_after_response(
			$checkpoint,
			array(
				'page'            => 1,
				'next_cursor'     => 'cursor-page-2',
				'high_water_mark' => '2026-06-06T10:00:00Z',
				'data'            => array( 'card-a', 'card-b' ),
			),
			2
		);

		$this->assert_same( 1, $next->page_number() );
		$this->assert_same( 2, $next->next_page() );
		$this->assert_same( 'cursor-page-2', $next->cursor() );
		$this->assert_same( '2026-06-06T10:00:00Z', $next->high_water_mark() );
		$this->assert_same( 2, $next->committed_count() );
		$this->assert_true( 64 === strlen( $next->payload_hash() ) );
	}

	public function test_checkpoint_reads_nested_pagination_cursor_shapes(): void {
		$checkpoint = ScryDexSyncCheckpoint::initial( 101, 'cards', 'pokemon' );
		$next       = ( new ScryDexSyncPlanner() )->checkpoint_after_response(
			$checkpoint,
			array(
				'pagination' => array(
					'current_page'     => 3,
					'next_page_cursor' => 'cursor-page-4',
					'high_water_mark'  => '2026-06-08T18:00:00Z',
				),
				'cards'      => array(),
			),
			0
		);

		$this->assert_same( 3, $next->page_number() );
		$this->assert_same( 'cursor-page-4', $next->cursor() );
		$this->assert_same( '2026-06-08T18:00:00Z', $next->high_water_mark() );
	}

	public function test_resume_uses_mock_checkpoint_cursor_without_duplicate_count(): void {
		$fixture    = $this->fixture( 'fixtures/mocks/scrydex/checkpoint-resume.json' );
		$checkpoint = ScryDexSyncCheckpoint::from_row(
			array(
				'sync_job_id'     => 101,
				'resource_type'   => 'cards',
				'resource_key'    => 'pokemon',
				'page_number'     => 1,
				'cursor_value'    => (string) $fixture['last_successful_cursor'],
				'high_water_mark' => '',
				'payload_hash'    => str_repeat( 'a', 64 ),
				'committed_count' => (int) $fixture['expected_new_records'],
			)
		);
		$request    = ( new ScryDexSyncPlanner() )->next_cards_request( $checkpoint, 100 );

		$this->assert_same( 'scrydex', $fixture['provider'] );
		$this->assert_same( 2, $checkpoint->next_page() );
		$this->assert_same( 'mock-cursor-page-1', $request['cursor'] );
		$this->assert_same( 0, (int) $fixture['expected_duplicate_count'] );
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
