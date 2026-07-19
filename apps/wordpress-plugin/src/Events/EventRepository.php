<?php
/**
 * Event table read repository.
 *
 * @package TCGStorePlatform
 */

namespace TCGStorePlatform\Events;

final class EventRepository {
	private \wpdb $database;

	public function __construct( \wpdb $database ) {
		$this->database = $database;
	}

	/**
	 * @return list<array<string, mixed>>
	 */
	public function list_public( EventFilters $filters, int $limit = 20, int $offset = 0 ): array {
		$table_name = $this->database->prefix . 'tcg_events';
		$where      = array( 'public_visibility = %s' );
		$args       = array( 'published' );

		$this->apply_filters( $filters, $where, $args );
		$this->apply_active_event_filter( $filters, $where, $args );

		$limit  = min( 100, max( 1, $limit ) );
		$offset = max( 0, $offset );
		$sql    = "SELECT * FROM {$table_name} WHERE " . implode( ' AND ', $where ) . ' ORDER BY featured_event DESC, start_datetime ASC, event_id ASC LIMIT %d OFFSET %d';
		$args[] = $limit;
		$args[] = $offset;

		$results = $this->database->get_results(
			$this->database->prepare( $sql, $args ), // phpcs:ignore WordPress.DB.PreparedSQL.NotPrepared
			ARRAY_A
		);

		return is_array( $results ) ? $results : array();
	}

	/**
	 * @param list<string> $where SQL where fragments.
	 * @param list<mixed>  $args Prepared SQL arguments.
	 */
	private function apply_active_event_filter( EventFilters $filters, array &$where, array &$args ): void {
		if ( $filters->get_bool( 'include_past' ) ) {
			return;
		}

		$where[] = 'COALESCE(end_datetime, start_datetime) >= %s';
		$args[]  = gmdate( 'Y-m-d H:i:s' );
	}

	/**
	 * @return array<string, mixed>|null
	 */
	public function get_public_by_slug( string $slug ): ?array {
		$table_name = $this->database->prefix . 'tcg_events';
		$slug       = EventFilters::from_array( array( 'event_type' => $slug ) )->get_string( 'event_type' ) ?? '';

		if ( '' === $slug ) {
			return null;
		}

		$result = $this->database->get_row(
			$this->database->prepare(
				"SELECT * FROM {$table_name} WHERE public_visibility = %s AND slug = %s LIMIT 1", // phpcs:ignore WordPress.DB.PreparedSQL.InterpolatedNotPrepared
				'published',
				$slug
			),
			ARRAY_A
		);

		return is_array( $result ) ? $result : null;
	}

	/**
	 * @param list<string> $where SQL where fragments.
	 * @param list<mixed>  $args Prepared SQL arguments.
	 */
	private function apply_filters( EventFilters $filters, array &$where, array &$args ): void {
		foreach ( array( 'game', 'format', 'event_type', 'registration_status' ) as $key ) {
			$value = $filters->get_string( $key );

			if ( null === $value ) {
				continue;
			}

			$where[] = "{$key} = %s";
			$args[]  = $value;
		}

		if ( $filters->get_bool( 'featured' ) ) {
			$where[] = 'featured_event = %d';
			$args[]  = 1;
		}

		$date_from = $filters->get_string( 'date_from' );

		if ( null !== $date_from ) {
			$where[] = 'start_datetime >= %s';
			$args[]  = $date_from . ' 00:00:00';
		}

		$date_to = $filters->get_string( 'date_to' );

		if ( null !== $date_to ) {
			$where[] = 'start_datetime <= %s';
			$args[]  = $date_to . ' 23:59:59';
		}

		$free_paid = $filters->get_string( 'free_paid' );

		if ( 'free' === $free_paid ) {
			$where[] = 'entry_fee <= %f';
			$args[]  = 0;
		}

		if ( 'paid' === $free_paid ) {
			$where[] = 'entry_fee > %f';
			$args[]  = 0;
		}

		$tone = $filters->get_string( 'tone' );

		if ( 'competitive' === $tone ) {
			$where[] = 'rules_level IN (%s, %s, %s)';
			$args[]  = 'competitive';
			$args[]  = 'professional';
			$args[]  = 'premier';
		}

		if ( 'casual' === $tone ) {
			$where[] = 'rules_level IN (%s, %s)';
			$args[]  = 'casual';
			$args[]  = 'regular';
		}
	}
}
