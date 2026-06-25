<?php
/**
 * Offline device registration wpdb repository.
 *
 * @package TCGStorePlatform
 */

namespace TCGStorePlatform\Offline;

final class OfflineDeviceRegistrationRepository {
	private \wpdb $database;
	private OfflineDeviceRegistrationInsertQueryBuilder $query_builder;

	public function __construct(
		\wpdb $database,
		?OfflineDeviceRegistrationInsertQueryBuilder $query_builder = null
	) {
		$this->database      = $database;
		$this->query_builder = $query_builder ?? new OfflineDeviceRegistrationInsertQueryBuilder();
	}

	public function register(
		OfflineDeviceRegistrationPlan $registration_plan
	): OfflineDeviceRegistrationRepositoryResult {
		$query_plan = $this->query_builder->build( $registration_plan, $this->database->prefix );

		if ( ! $query_plan->is_valid() ) {
			return OfflineDeviceRegistrationRepositoryResult::rejected(
				$registration_plan,
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
			return OfflineDeviceRegistrationRepositoryResult::rejected(
				$registration_plan,
				$query_plan,
				array( 'registration_insert_failed' )
			);
		}

		$rows_affected = (int) $rows_affected;

		if ( 1 === $rows_affected ) {
			return OfflineDeviceRegistrationRepositoryResult::inserted(
				$registration_plan,
				$query_plan,
				$rows_affected,
				$this->insert_id()
			);
		}

		if ( 0 === $rows_affected ) {
			return OfflineDeviceRegistrationRepositoryResult::rejected(
				$registration_plan,
				$query_plan,
				array( 'registration_insert_no_rows' ),
				$rows_affected
			);
		}

		return OfflineDeviceRegistrationRepositoryResult::rejected(
			$registration_plan,
			$query_plan,
			array( 'registration_insert_unexpected_rows' ),
			$rows_affected
		);
	}

	private function insert_id(): ?int {
		$insert_id = $this->database->insert_id ?? null;

		if ( ! is_numeric( $insert_id ) ) {
			return null;
		}

		$insert_id = (int) $insert_id;

		if ( $insert_id <= 0 ) {
			return null;
		}

		return $insert_id;
	}
}
