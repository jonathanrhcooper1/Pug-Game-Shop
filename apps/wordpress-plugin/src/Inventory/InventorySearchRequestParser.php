<?php
/**
 * Inventory search query parser.
 *
 * @package TCGStorePlatform
 */

namespace TCGStorePlatform\Inventory;

final class InventorySearchRequestParser {
	private const VISIBILITY = array( 'public', 'staff', 'hidden', 'all' );

	private const SORTS = array( 'relevance', 'updated_desc', 'price_asc', 'price_desc', 'name_asc' );

	/**
	 * @param array<string, mixed> $query Query string values.
	 */
	public function parse( array $query ): InventorySearchValidationResult {
		$errors     = array();
		$text_query = trim( (string) ( $query['q'] ?? ( $query['query'] ?? '' ) ) );
		$game       = strtolower( trim( (string) ( $query['game'] ?? '' ) ) );
		$set_filter = trim( (string) ( $query['set'] ?? ( $query['set_name'] ?? ( $query['set_filter'] ?? '' ) ) ) );
		$visibility = strtolower( trim( (string) ( $query['visibility'] ?? 'public' ) ) );
		$sort       = strtolower( trim( (string) ( $query['sort'] ?? 'relevance' ) ) );
		$page       = $this->positive_int( $query['page'] ?? 1, 'page', $errors, 1 );
		$page_size  = $this->positive_int( $query['page_size'] ?? 25, 'page_size', $errors, 25 );
		$location   = $this->optional_positive_int( $query['location_id'] ?? null, 'location_id', $errors );
		$statuses   = $this->statuses( $query['status'] ?? array(), $errors );

		if ( strlen( $text_query ) > 120 ) {
			$errors[]   = 'query_too_long';
			$text_query = substr( $text_query, 0, 120 );
		}

		if ( strlen( $set_filter ) > 120 ) {
			$errors[]   = 'set_filter_too_long';
			$set_filter = substr( $set_filter, 0, 120 );
		}

		if ( '' !== $game && 1 !== preg_match( '/^[a-z0-9_-]{2,64}$/', $game ) ) {
			$errors[] = 'game_invalid';
		}

		if ( ! in_array( $visibility, self::VISIBILITY, true ) ) {
			$errors[]   = 'visibility_invalid';
			$visibility = 'public';
		}

		if ( ! in_array( $sort, self::SORTS, true ) ) {
			$errors[] = 'sort_invalid';
			$sort     = 'relevance';
		}

		if ( $page_size > 100 ) {
			$errors[]  = 'page_size_too_large';
			$page_size = 100;
		}

		if ( $errors ) {
			return InventorySearchValidationResult::rejected( array_values( array_unique( $errors ) ) );
		}

		return InventorySearchValidationResult::accepted(
			new InventorySearchRequest(
				$text_query,
				$game,
				$statuses,
				$location,
				$visibility,
				$sort,
				$page,
				$page_size,
				$set_filter
			)
		);
	}

	/**
	 * @param list<string> $errors Validation errors.
	 */
	private function optional_positive_int( mixed $value, string $field, array &$errors ): ?int {
		if ( null === $value || '' === $value ) {
			return null;
		}

		return $this->positive_int( $value, $field, $errors, null );
	}

	/**
	 * @param list<string> $errors Validation errors.
	 */
	private function positive_int( mixed $value, string $field, array &$errors, ?int $fallback ): ?int {
		if ( is_int( $value ) && $value > 0 ) {
			return $value;
		}

		if ( is_string( $value ) && 1 === preg_match( '/^\d+$/', $value ) && (int) $value > 0 ) {
			return (int) $value;
		}

		$errors[] = $field . '_invalid';

		return $fallback;
	}

	/**
	 * @param list<string> $errors Validation errors.
	 * @return list<string>
	 */
	private function statuses( mixed $value, array &$errors ): array {
		if ( is_string( $value ) ) {
			$value = '' === trim( $value ) ? array() : explode( ',', $value );
		}

		if ( ! is_array( $value ) ) {
			$errors[] = 'status_invalid';

			return array();
		}

		$statuses = array();

		foreach ( array_values( $value ) as $status ) {
			$normalized = strtolower( trim( (string) $status ) );

			if ( '' === $normalized ) {
				continue;
			}

			if ( ! InventoryStatus::is_valid( $normalized ) ) {
				$errors[] = 'status_invalid';
				continue;
			}

			$statuses[] = $normalized;
		}

		return array_values( array_unique( $statuses ) );
	}
}
