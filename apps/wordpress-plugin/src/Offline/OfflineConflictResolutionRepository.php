<?php
/**
 * Offline conflict resolution wpdb repository.
 *
 * @package TCGStorePlatform
 */

namespace TCGStorePlatform\Offline;

final class OfflineConflictResolutionRepository {
	private \wpdb $database;
	private OfflineConflictResolutionQueryBuilder $query_builder;

	public function __construct(
		\wpdb $database,
		?OfflineConflictResolutionQueryBuilder $query_builder = null
	) {
		$this->database      = $database;
		$this->query_builder = $query_builder ?? new OfflineConflictResolutionQueryBuilder();
	}

	public function apply(
		OfflineConflictResolutionPlan $resolution_plan
	): OfflineConflictResolutionRepositoryResult {
		$query_plan = $this->query_builder->build( $resolution_plan, $this->database->prefix );

		if ( ! $query_plan->is_valid() ) {
			return OfflineConflictResolutionRepositoryResult::rejected(
				$resolution_plan,
				$query_plan,
				$query_plan->errors()
			);
		}

		$prepared_sql  = $this->database->prepare(
			$query_plan->sql_template(), // phpcs:ignore WordPress.DB.PreparedSQL.NotPrepared
			$query_plan->prepare_args()
		);
		$rows_affected = $this->database->query(
			$prepared_sql // phpcs:ignore WordPress.DB.PreparedSQL.NotPrepared
		);

		if ( false === $rows_affected ) {
			return OfflineConflictResolutionRepositoryResult::rejected(
				$resolution_plan,
				$query_plan,
				array( 'conflict_resolution_update_failed' )
			);
		}

		$rows_affected = (int) $rows_affected;

		if ( 1 === $rows_affected ) {
			return OfflineConflictResolutionRepositoryResult::applied(
				$resolution_plan,
				$query_plan,
				$rows_affected
			);
		}

		if ( 0 === $rows_affected ) {
			return OfflineConflictResolutionRepositoryResult::stale(
				$resolution_plan,
				$query_plan,
				$rows_affected
			);
		}

		return OfflineConflictResolutionRepositoryResult::rejected(
			$resolution_plan,
			$query_plan,
			array( 'conflict_resolution_unexpected_rows' ),
			$rows_affected
		);
	}
}
