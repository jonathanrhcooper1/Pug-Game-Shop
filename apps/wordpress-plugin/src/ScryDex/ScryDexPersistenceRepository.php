<?php
/**
 * ScryDex persistence repository staging adapter.
 *
 * @package TCGStorePlatform
 */

namespace TCGStorePlatform\ScryDex;

final class ScryDexPersistenceRepository {
	public function __construct(
		private ?\wpdb $database = null
	) {
	}

	public function stage( ScryDexPersistenceQueryBuildPlan $query_plan ): ScryDexPersistenceRepositoryResult {
		if ( ! $query_plan->is_valid() ) {
			return ScryDexPersistenceRepositoryResult::rejected(
				$query_plan,
				$query_plan->errors()
			);
		}

		$reference_insert_results = array();
		foreach ( $query_plan->reference_insert_queries() as $index => $query ) {
			$reference_insert_results[] = $this->staged_result( $query, $index, 'reference_card_insert' );
		}

		$reference_update_results = array();
		foreach ( $query_plan->reference_update_queries() as $index => $query ) {
			$reference_update_results[] = $this->staged_result( $query, $index, 'reference_card_update' );
		}

		$price_observation_results = array();
		foreach ( $query_plan->price_observation_queries() as $index => $query ) {
			$price_observation_results[] = $this->staged_result( $query, $index, 'provider_price_observation_insert' );
		}

		$checkpoint_result = null;
		$checkpoint_query  = $query_plan->checkpoint_upsert_query();
		if ( null !== $checkpoint_query ) {
			$checkpoint_result = $this->staged_result( $checkpoint_query, 0, 'checkpoint_upsert' );
		}

		return ScryDexPersistenceRepositoryResult::deferred(
			$query_plan,
			$reference_insert_results,
			$reference_update_results,
			$price_observation_results,
			$checkpoint_result
		);
	}

	public function execute( ScryDexPersistenceQueryBuildPlan $query_plan ): ScryDexPersistenceRepositoryResult {
		if ( ! $query_plan->is_valid() ) {
			return ScryDexPersistenceRepositoryResult::rejected(
				$query_plan,
				$query_plan->errors()
			);
		}

		if ( null === $this->database ) {
			return ScryDexPersistenceRepositoryResult::rejected(
				$query_plan,
				array( 'scrydex_persistence_database_not_configured' )
			);
		}

		$table_errors = $this->validate_table_names( $query_plan );
		if ( array() !== $table_errors ) {
			return ScryDexPersistenceRepositoryResult::rejected(
				$query_plan,
				$table_errors
			);
		}

		$transaction_commands       = array();
		$reference_insert_results  = array();
		$reference_update_results  = array();
		$price_observation_results = array();
		$checkpoint_result         = null;

		if ( false === $this->run_transaction_command( 'START TRANSACTION', $transaction_commands ) ) {
			return ScryDexPersistenceRepositoryResult::rejected(
				$query_plan,
				array( 'scrydex_persistence_transaction_begin_failed' ),
				array(),
				array(),
				array(),
				null,
				$transaction_commands
			);
		}

		foreach ( $query_plan->reference_insert_queries() as $index => $query ) {
			$result = $this->execute_prepared_query( $query );

			if ( false === $result ) {
				$errors = array( 'scrydex_reference_card_insert_failed' );
				$this->rollback_transaction( $transaction_commands, $errors );

				return ScryDexPersistenceRepositoryResult::rejected(
					$query_plan,
					$errors,
					$reference_insert_results,
					$reference_update_results,
					$price_observation_results,
					$checkpoint_result,
					$transaction_commands
				);
			}

			$reference_insert_results[] = $this->executed_result( $query, $index, 'reference_card_insert', $result );
		}

		foreach ( $query_plan->reference_update_queries() as $index => $query ) {
			$result = $this->execute_prepared_query( $query );

			if ( false === $result ) {
				$errors = array( 'scrydex_reference_card_update_failed' );
				$this->rollback_transaction( $transaction_commands, $errors );

				return ScryDexPersistenceRepositoryResult::rejected(
					$query_plan,
					$errors,
					$reference_insert_results,
					$reference_update_results,
					$price_observation_results,
					$checkpoint_result,
					$transaction_commands
				);
			}

			$reference_update_results[] = $this->executed_result( $query, $index, 'reference_card_update', $result );
		}

		foreach ( $query_plan->price_observation_queries() as $index => $query ) {
			$result = $this->execute_prepared_query( $query );

			if ( false === $result ) {
				$errors = array( 'scrydex_provider_price_observation_insert_failed' );
				$this->rollback_transaction( $transaction_commands, $errors );

				return ScryDexPersistenceRepositoryResult::rejected(
					$query_plan,
					$errors,
					$reference_insert_results,
					$reference_update_results,
					$price_observation_results,
					$checkpoint_result,
					$transaction_commands
				);
			}

			$price_observation_results[] = $this->executed_result(
				$query,
				$index,
				'provider_price_observation_insert',
				$result
			);
		}

		$checkpoint_query = $query_plan->checkpoint_upsert_query();
		if ( null !== $checkpoint_query ) {
			$result = $this->execute_prepared_query( $checkpoint_query );

			if ( false === $result ) {
				$errors = array( 'scrydex_checkpoint_upsert_failed' );
				$this->rollback_transaction( $transaction_commands, $errors );

				return ScryDexPersistenceRepositoryResult::rejected(
					$query_plan,
					$errors,
					$reference_insert_results,
					$reference_update_results,
					$price_observation_results,
					$checkpoint_result,
					$transaction_commands
				);
			}

			$checkpoint_result = $this->executed_result( $checkpoint_query, 0, 'checkpoint_upsert', $result );
		}

		if ( false === $this->run_transaction_command( 'COMMIT', $transaction_commands ) ) {
			$errors = array( 'scrydex_persistence_transaction_commit_failed' );
			$this->rollback_transaction( $transaction_commands, $errors );

			return ScryDexPersistenceRepositoryResult::rejected(
				$query_plan,
				$errors,
				$reference_insert_results,
				$reference_update_results,
				$price_observation_results,
				$checkpoint_result,
				$transaction_commands
			);
		}

		return ScryDexPersistenceRepositoryResult::executed(
			$query_plan,
			$reference_insert_results,
			$reference_update_results,
			$price_observation_results,
			$checkpoint_result,
			$transaction_commands
		);
	}

	/**
	 * @param array<string, mixed> $query Prepared SQL query template.
	 * @return array<string, mixed>
	 */
	private function staged_result( array $query, int $index, string $query_kind ): array {
		return array(
			'query_kind'                                 => (string) ( $query['query_kind'] ?? $query_kind ),
			'query_index'                                => $index,
			'provider_card_id'                           => (string) ( $query['provider_card_id'] ?? '' ),
			'reference_card_id'                          => $query['reference_card_id'] ?? null,
			'public_id'                                  => (string) ( $query['public_id'] ?? '' ),
			'resource_key'                               => (string) ( $query['resource_key'] ?? '' ),
			'prepare_arg_count'                          => count( $query['prepare_args'] ?? array() ),
			'execution_status'                           => 'deferred',
			'rows_affected'                              => 0,
			'persistence_query_execution_deferred'       => true,
			'persistence_repository_deferred'            => true,
			'reference_card_writes_deferred'             => true,
			'provider_price_observation_writes_deferred' => true,
			'checkpoint_upsert_execution_deferred'       => true,
		);
	}

	/**
	 * @param array<string, mixed> $query Prepared SQL query template.
	 * @return array<string, mixed>
	 */
	private function executed_result( array $query, int $index, string $query_kind, int $rows_affected ): array {
		return array(
			'query_kind'                                 => (string) ( $query['query_kind'] ?? $query_kind ),
			'query_index'                                => $index,
			'provider_card_id'                           => (string) ( $query['provider_card_id'] ?? '' ),
			'reference_card_id'                          => $query['reference_card_id'] ?? null,
			'public_id'                                  => (string) ( $query['public_id'] ?? '' ),
			'resource_key'                               => (string) ( $query['resource_key'] ?? '' ),
			'prepare_arg_count'                          => count( $query['prepare_args'] ?? array() ),
			'execution_status'                           => 'executed',
			'rows_affected'                              => max( 0, $rows_affected ),
			'persistence_query_execution_deferred'       => false,
			'persistence_repository_deferred'            => false,
			'reference_card_writes_deferred'             => false,
			'provider_price_observation_writes_deferred' => false,
			'checkpoint_upsert_execution_deferred'       => false,
		);
	}

	/**
	 * @return list<string>
	 */
	private function validate_table_names( ScryDexPersistenceQueryBuildPlan $query_plan ): array {
		$prefix      = trim( (string) ( $this->database?->prefix ?? '' ) );
		$table_names = $query_plan->table_names();

		if ( '' === $prefix || 1 !== preg_match( '/^[A-Za-z0-9_]+$/', $prefix ) ) {
			return array( 'scrydex_persistence_database_prefix_invalid' );
		}

		$expected = array(
			'reference_cards'             => $prefix . 'tcg_reference_cards',
			'provider_price_observations' => $prefix . 'tcg_provider_price_observations',
			'sync_checkpoints'            => $prefix . 'tcg_sync_checkpoints',
		);

		foreach ( $expected as $key => $table_name ) {
			if ( (string) ( $table_names[ $key ] ?? '' ) !== $table_name ) {
				return array( 'scrydex_persistence_table_prefix_mismatch' );
			}
		}

		return array();
	}

	/**
	 * @param array<string, mixed> $query Prepared SQL query template.
	 */
	private function execute_prepared_query( array $query ): int|false {
		if ( null === $this->database ) {
			return false;
		}

		$prepared_sql = $this->database->prepare(
			(string) ( $query['sql_template'] ?? '' ), // phpcs:ignore WordPress.DB.PreparedSQL.NotPrepared
			$query['prepare_args'] ?? array()
		);

		if ( ! is_string( $prepared_sql ) || '' === $prepared_sql ) {
			return false;
		}

		$result = $this->database->query(
			$prepared_sql // phpcs:ignore WordPress.DB.PreparedSQL.NotPrepared
		);

		return false === $result ? false : (int) $result;
	}

	/**
	 * @param list<string> $transaction_commands Transaction commands.
	 */
	private function run_transaction_command( string $command, array &$transaction_commands ): int|false {
		if ( null === $this->database ) {
			return false;
		}

		$transaction_commands[] = $command;

		return $this->database->query( $command );
	}

	/**
	 * @param list<string> $transaction_commands Transaction commands.
	 * @param list<string> $errors Error codes.
	 */
	private function rollback_transaction( array &$transaction_commands, array &$errors ): void {
		if ( false === $this->run_transaction_command( 'ROLLBACK', $transaction_commands ) ) {
			$errors[] = 'scrydex_persistence_transaction_rollback_failed';
		}
	}
}
