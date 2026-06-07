<?php
/**
 * ScryDex sync request planner.
 *
 * @package TCGStorePlatform
 */

namespace TCGStorePlatform\ScryDex;

final class ScryDexSyncPlanner {
	/**
	 * @return array<string, string|int>
	 */
	public function next_cards_request( ScryDexSyncCheckpoint $checkpoint, int $page_size = 100 ): array {
		return array(
			'provider'      => ScryDexSyncCheckpoint::PROVIDER,
			'resource_type' => $checkpoint->resource_type(),
			'resource_key'  => $checkpoint->resource_key(),
			'page'          => $checkpoint->next_page(),
			'cursor'        => $checkpoint->cursor(),
			'page_size'     => max( 1, min( 250, $page_size ) ),
		);
	}

	/**
	 * @param array<string, mixed> $response Sanitized provider response.
	 */
	public function checkpoint_after_response(
		ScryDexSyncCheckpoint $checkpoint,
		array $response,
		int $committed_count
	): ScryDexSyncCheckpoint {
		$page_number     = (int) ( $response['page'] ?? $checkpoint->next_page() );
		$next_cursor     = (string) ( $response['next_cursor'] ?? '' );
		$high_water_mark = (string) ( $response['high_water_mark'] ?? '' );
		$payload_hash    = hash( 'sha256', (string) json_encode( $response ) );

		return $checkpoint->after_successful_page(
			$page_number,
			$next_cursor,
			$payload_hash,
			$committed_count,
			$high_water_mark
		);
	}
}
