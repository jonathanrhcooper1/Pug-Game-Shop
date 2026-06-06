<?php
/**
 * Offline device session update wpdb repository.
 *
 * @package TCGStorePlatform
 */

namespace TCGStorePlatform\Offline;

final class OfflineDeviceSessionUpdateRepository {
	private \wpdb $database;
	private OfflineDeviceSessionUpdateQueryBuilder $query_builder;

	public function __construct(
		\wpdb $database,
		?OfflineDeviceSessionUpdateQueryBuilder $query_builder = null
	) {
		$this->database      = $database;
		$this->query_builder = $query_builder ?? new OfflineDeviceSessionUpdateQueryBuilder();
	}

	public function apply(
		OfflineDeviceSessionPlan $session_plan
	): OfflineDeviceSessionUpdateRepositoryResult {
		$query_plan = $this->query_builder->build( $session_plan, $this->database->prefix );

		if ( ! $query_plan->is_valid() ) {
			return OfflineDeviceSessionUpdateRepositoryResult::rejected(
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
			return OfflineDeviceSessionUpdateRepositoryResult::rejected(
				$query_plan,
				array( 'session_update_failed' )
			);
		}

		$rows_affected = (int) $rows_affected;

		if ( 1 === $rows_affected ) {
			return OfflineDeviceSessionUpdateRepositoryResult::applied(
				$query_plan,
				$rows_affected
			);
		}

		if ( 0 === $rows_affected ) {
			return OfflineDeviceSessionUpdateRepositoryResult::stale(
				$query_plan,
				$rows_affected
			);
		}

		return OfflineDeviceSessionUpdateRepositoryResult::rejected(
			$query_plan,
			array( 'session_update_unexpected_rows' ),
			$rows_affected
		);
	}
}
