<?php
/**
 * Offline pull cursor advancement wpdb repository.
 *
 * @package TCGStorePlatform
 */

namespace TCGStorePlatform\Offline;

final class OfflinePullCursorAdvanceRepository {
	private \wpdb $database;
	private OfflinePullCursorAdvanceQueryBuilder $query_builder;

	public function __construct(
		\wpdb $database,
		?OfflinePullCursorAdvanceQueryBuilder $query_builder = null
	) {
		$this->database      = $database;
		$this->query_builder = $query_builder ?? new OfflinePullCursorAdvanceQueryBuilder();
	}

	public function advance(
		OfflinePullCursorAdvancePlan $advance_plan
	): OfflinePullCursorAdvanceRepositoryResult {
		$query_plan = $this->query_builder->build( $advance_plan );

		if ( ! $query_plan->is_valid() ) {
			return OfflinePullCursorAdvanceRepositoryResult::rejected(
				$query_plan,
				$query_plan->errors()
			);
		}

		$cursor_results = array();
		$rows_affected  = 0;

		foreach ( $query_plan->cursor_queries() as $index => $cursor_query ) {
			$prepared_sql = $this->database->prepare(
				$cursor_query['sql_template'], // phpcs:ignore WordPress.DB.PreparedSQL.NotPrepared
				$cursor_query['prepare_args']
			);
			$result       = $this->database->query(
				$prepared_sql // phpcs:ignore WordPress.DB.PreparedSQL.NotPrepared
			);
			$domain       = (string) ( $cursor_query['domain'] ?? 'unknown' );

			if ( false === $result ) {
				return OfflinePullCursorAdvanceRepositoryResult::rejected(
					$query_plan,
					array( $domain . '_cursor_upsert_failed' ),
					$cursor_results,
					$rows_affected
				);
			}

			$result = (int) $result;

			if ( 0 > $result ) {
				return OfflinePullCursorAdvanceRepositoryResult::rejected(
					$query_plan,
					array( $domain . '_cursor_upsert_invalid_rows_affected' ),
					$cursor_results,
					$rows_affected
				);
			}

			$rows_affected   += $result;
			$cursor_results[] = array(
				'domain'                          => $domain,
				'cursor_query_index'              => $index,
				'rows_affected'                   => $result,
				'prepare_arg_count'               => count( $cursor_query['prepare_args'] ?? array() ),
				'cursor_value_is_null'            => true === ( $cursor_query['cursor_value_is_null'] ?? false ),
				'route_connected_writes_deferred' => true,
			);
		}

		return OfflinePullCursorAdvanceRepositoryResult::advanced(
			$query_plan,
			$cursor_results,
			$rows_affected
		);
	}
}
