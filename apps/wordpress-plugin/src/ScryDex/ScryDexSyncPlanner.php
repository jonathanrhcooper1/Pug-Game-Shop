<?php
/**
 * ScryDex sync request planner.
 *
 * @package TCGStorePlatform
 */

namespace TCGStorePlatform\ScryDex;

final class ScryDexSyncPlanner {
	private const MAX_PAGE_SIZE = 100;

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
			'page_size'     => max( 1, min( self::MAX_PAGE_SIZE, $page_size ) ),
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
		$page_number     = $this->page_number_from_response( $response, $checkpoint );
		$next_cursor     = $this->cursor_from_response( $response );
		$high_water_mark = $this->high_water_mark_from_response( $response );
		$payload_hash    = hash( 'sha256', (string) json_encode( $response ) );

		return $checkpoint->after_successful_page(
			$page_number,
			$next_cursor,
			$payload_hash,
			$committed_count,
			$high_water_mark
		);
	}

	/**
	 * @param array<string, mixed> $response Sanitized provider response.
	 */
	private function page_number_from_response( array $response, ScryDexSyncCheckpoint $checkpoint ): int {
		$page = $this->first_scalar_from_paths(
			$response,
			array(
				array( 'page' ),
				array( 'current_page' ),
				array( 'pagination', 'page' ),
				array( 'pagination', 'current_page' ),
				array( 'meta', 'page' ),
				array( 'meta', 'current_page' ),
			)
		);

		return max( 1, (int) ( null === $page ? $checkpoint->next_page() : $page ) );
	}

	/**
	 * @param array<string, mixed> $response Sanitized provider response.
	 */
	private function cursor_from_response( array $response ): string {
		return (string) ( $this->first_scalar_from_paths(
			$response,
			array(
				array( 'next_cursor' ),
				array( 'nextCursor' ),
				array( 'next_page_cursor' ),
				array( 'pagination', 'next_cursor' ),
				array( 'pagination', 'nextCursor' ),
				array( 'pagination', 'next_page_cursor' ),
				array( 'meta', 'next_cursor' ),
				array( 'meta', 'nextCursor' ),
				array( 'meta', 'next_page_cursor' ),
			)
		) ?? '' );
	}

	/**
	 * @param array<string, mixed> $response Sanitized provider response.
	 */
	private function high_water_mark_from_response( array $response ): string {
		return (string) ( $this->first_scalar_from_paths(
			$response,
			array(
				array( 'high_water_mark' ),
				array( 'highWaterMark' ),
				array( 'pagination', 'high_water_mark' ),
				array( 'pagination', 'highWaterMark' ),
				array( 'meta', 'high_water_mark' ),
				array( 'meta', 'highWaterMark' ),
			)
		) ?? '' );
	}

	/**
	 * @param array<string, mixed> $source Source array.
	 * @param list<list<string>>   $paths Candidate lookup paths.
	 */
	private function first_scalar_from_paths( array $source, array $paths ): string|int|float|null {
		foreach ( $paths as $path ) {
			$value = $source;

			foreach ( $path as $segment ) {
				if ( ! is_array( $value ) || ! array_key_exists( $segment, $value ) ) {
					continue 2;
				}

				$value = $value[ $segment ];
			}

			if ( is_scalar( $value ) && '' !== trim( (string) $value ) ) {
				return $value;
			}
		}

		return null;
	}
}
