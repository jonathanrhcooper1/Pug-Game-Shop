<?php
/**
 * Offline push persistence wpdb repository.
 *
 * @package TCGStorePlatform
 */

namespace TCGStorePlatform\Offline;

final class OfflinePushPersistenceRepository {
	private \wpdb $database;
	private OfflinePushPersistenceQueryBuilder $query_builder;

	public function __construct(
		\wpdb $database,
		?OfflinePushPersistenceQueryBuilder $query_builder = null
	) {
		$this->database      = $database;
		$this->query_builder = $query_builder ?? new OfflinePushPersistenceQueryBuilder();
	}

	public function persist(
		OfflinePushPersistencePlan $persistence_plan
	): OfflinePushPersistenceRepositoryResult {
		$query_plan = $this->query_builder->build( $persistence_plan, $this->database->prefix );

		if ( ! $query_plan->is_valid() ) {
			return OfflinePushPersistenceRepositoryResult::rejected(
				$query_plan,
				$query_plan->errors()
			);
		}

		$operation_results       = array();
		$conflict_results        = array();
		$operation_rows_affected = 0;
		$conflict_rows_affected  = 0;

		foreach ( $query_plan->operation_queries() as $index => $operation_query ) {
			$result       = $this->execute_query( $operation_query );
			$operation_id = (string) ( $operation_query['client_operation_id'] ?? 'unknown' );

			if ( false === $result ) {
				return OfflinePushPersistenceRepositoryResult::rejected(
					$query_plan,
					array( $operation_id . '_operation_insert_failed' ),
					$operation_results,
					$conflict_results,
					$operation_rows_affected,
					$conflict_rows_affected
				);
			}

			if ( 0 > $result ) {
				return OfflinePushPersistenceRepositoryResult::rejected(
					$query_plan,
					array( $operation_id . '_operation_insert_invalid_rows_affected' ),
					$operation_results,
					$conflict_results,
					$operation_rows_affected,
					$conflict_rows_affected
				);
			}

			$operation_rows_affected += $result;
			$operation_results[]      = array(
				'client_operation_id'             => $operation_id,
				'operation_query_index'           => $index,
				'rows_affected'                   => $result,
				'status'                          => (string) ( $operation_query['status'] ?? '' ),
				'has_conflict_id'                 => true === ( $operation_query['has_conflict_id'] ?? false ),
				'prepare_arg_count'               => count( $operation_query['prepare_args'] ?? array() ),
				'route_connected_writes_deferred' => true,
			);
		}

		foreach ( $query_plan->conflict_queries() as $index => $conflict_query ) {
			$result      = $this->execute_query( $conflict_query );
			$conflict_id = (string) ( $conflict_query['conflict_id'] ?? 'unknown' );

			if ( false === $result ) {
				return OfflinePushPersistenceRepositoryResult::rejected(
					$query_plan,
					array( $conflict_id . '_conflict_insert_failed' ),
					$operation_results,
					$conflict_results,
					$operation_rows_affected,
					$conflict_rows_affected
				);
			}

			if ( 0 > $result ) {
				return OfflinePushPersistenceRepositoryResult::rejected(
					$query_plan,
					array( $conflict_id . '_conflict_insert_invalid_rows_affected' ),
					$operation_results,
					$conflict_results,
					$operation_rows_affected,
					$conflict_rows_affected
				);
			}

			$conflict_rows_affected += $result;
			$conflict_results[]      = array(
				'conflict_id'                     => $conflict_id,
				'client_operation_id'             => (string) ( $conflict_query['client_operation_id'] ?? '' ),
				'conflict_query_index'            => $index,
				'rows_affected'                   => $result,
				'status'                          => (string) ( $conflict_query['status'] ?? '' ),
				'prepare_arg_count'               => count( $conflict_query['prepare_args'] ?? array() ),
				'route_connected_writes_deferred' => true,
			);
		}

		return OfflinePushPersistenceRepositoryResult::persisted(
			$query_plan,
			$operation_results,
			$conflict_results,
			$operation_rows_affected,
			$conflict_rows_affected
		);
	}

	/**
	 * @param array<string, mixed> $query Prepared query template.
	 */
	private function execute_query( array $query ): int|false {
		$prepared_sql = $this->database->prepare(
			$query['sql_template'], // phpcs:ignore WordPress.DB.PreparedSQL.NotPrepared
			$query['prepare_args']
		);

		$result = $this->database->query(
			$prepared_sql // phpcs:ignore WordPress.DB.PreparedSQL.NotPrepared
		);

		return false === $result ? false : (int) $result;
	}
}
