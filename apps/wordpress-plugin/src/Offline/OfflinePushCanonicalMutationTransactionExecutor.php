<?php
/**
 * Offline push canonical mutation transaction executor.
 *
 * @package TCGStorePlatform
 */

namespace TCGStorePlatform\Offline;

final class OfflinePushCanonicalMutationTransactionExecutor {
	public function __construct(
		private \wpdb $database
	) {
	}

	public function execute(
		OfflinePushCanonicalMutationQueryBuildPlan $query_plan,
		OfflinePushCanonicalMutationTransactionPreflightResult $preflight_result
	): OfflinePushCanonicalMutationTransactionExecutionResult {
		if ( ! $query_plan->is_valid() ) {
			return OfflinePushCanonicalMutationTransactionExecutionResult::rejected(
				$query_plan,
				$preflight_result,
				array_merge(
					array( 'canonical_mutation_query_plan_invalid' ),
					$query_plan->errors()
				)
			);
		}

		if ( $preflight_result->is_rejected() ) {
			return OfflinePushCanonicalMutationTransactionExecutionResult::rejected(
				$query_plan,
				$preflight_result,
				array_merge(
					array( 'canonical_mutation_transaction_preflight_rejected' ),
					$preflight_result->errors()
				)
			);
		}

		if ( ! $preflight_result->is_ready() ) {
			return OfflinePushCanonicalMutationTransactionExecutionResult::blocked(
				$query_plan,
				$preflight_result,
				array_merge(
					array( 'canonical_mutation_transaction_preflight_not_ready' ),
					$preflight_result->block_reasons()
				)
			);
		}

		$queries = $query_plan->mutation_queries();

		if ( array() === $queries ) {
			return OfflinePushCanonicalMutationTransactionExecutionResult::blocked(
				$query_plan,
				$preflight_result,
				array( 'canonical_mutation_transaction_no_queries' )
			);
		}

		$query_errors = $this->validate_supported_queries( $queries );

		if ( array() !== $query_errors ) {
			return OfflinePushCanonicalMutationTransactionExecutionResult::rejected(
				$query_plan,
				$preflight_result,
				$query_errors
			);
		}

		$transaction_commands = array();
		$mutation_results     = array();

		if ( false === $this->run_transaction_command( 'START TRANSACTION', $transaction_commands ) ) {
			return OfflinePushCanonicalMutationTransactionExecutionResult::rejected(
				$query_plan,
				$preflight_result,
				array( 'canonical_mutation_transaction_begin_failed' ),
				$mutation_results,
				$transaction_commands
			);
		}

		foreach ( $queries as $index => $query ) {
			$operation_id = trim( (string) ( $query['client_operation_id'] ?? '' ) );
			$prepared_sql = $this->database->prepare(
				$query['sql_template'], // phpcs:ignore WordPress.DB.PreparedSQL.NotPrepared
				$query['prepare_args']
			);

			if ( ! is_string( $prepared_sql ) || '' === $prepared_sql ) {
				$errors = array( $this->operation_error( $operation_id, 'canonical_mutation_prepare_failed' ) );
				$this->rollback_transaction( $transaction_commands, $errors );

				return OfflinePushCanonicalMutationTransactionExecutionResult::rejected(
					$query_plan,
					$preflight_result,
					$errors,
					$mutation_results,
					$transaction_commands
				);
			}

			$rows_affected = $this->database->query(
				$prepared_sql // phpcs:ignore WordPress.DB.PreparedSQL.NotPrepared
			);

			if ( false === $rows_affected ) {
				$errors = array( $this->operation_error( $operation_id, 'canonical_mutation_update_failed' ) );
				$this->rollback_transaction( $transaction_commands, $errors );

				return OfflinePushCanonicalMutationTransactionExecutionResult::rejected(
					$query_plan,
					$preflight_result,
					$errors,
					$mutation_results,
					$transaction_commands
				);
			}

			$rows_affected = (int) $rows_affected;

			if ( 1 !== $rows_affected ) {
				$errors = array(
					0 === $rows_affected
						? $this->operation_error( $operation_id, 'inventory_guard_no_rows' )
						: $this->operation_error( $operation_id, 'inventory_guard_unexpected_rows' ),
				);
				$this->rollback_transaction( $transaction_commands, $errors );

				return OfflinePushCanonicalMutationTransactionExecutionResult::rejected(
					$query_plan,
					$preflight_result,
					$errors,
					$mutation_results,
					$transaction_commands
				);
			}

			$mutation_results[] = array(
				'client_operation_id'                => $operation_id,
				'mutation_type'                      => (string) ( $query['mutation_type'] ?? '' ),
				'query_kind'                         => (string) ( $query['query_kind'] ?? '' ),
				'mutation_query_index'               => $index,
				'rows_affected'                      => $rows_affected,
				'execution_status'                   => 'executed',
				'inventory_write_execution_deferred' => false,
				'route_connected_writes_deferred'    => false,
			);
		}

		if ( false === $this->run_transaction_command( 'COMMIT', $transaction_commands ) ) {
			$errors = array( 'canonical_mutation_transaction_commit_failed' );
			$this->rollback_transaction( $transaction_commands, $errors );

			return OfflinePushCanonicalMutationTransactionExecutionResult::rejected(
				$query_plan,
				$preflight_result,
				$errors,
				$mutation_results,
				$transaction_commands
			);
		}

		return OfflinePushCanonicalMutationTransactionExecutionResult::executed(
			$query_plan,
			$preflight_result,
			$mutation_results,
			$transaction_commands
		);
	}

	/**
	 * @param list<array<string, mixed>> $queries Canonical mutation queries.
	 * @return list<string>
	 */
	private function validate_supported_queries( array $queries ): array {
		$errors = array();

		foreach ( $queries as $query ) {
			$operation_id = trim( (string) ( $query['client_operation_id'] ?? '' ) );

			if ( 'inventory_status_guarded_update' !== (string) ( $query['query_kind'] ?? '' ) ) {
				$errors[] = $this->operation_error( $operation_id, 'canonical_mutation_query_kind_unsupported' );
			}

			if ( 'inventory_reservation' !== (string) ( $query['mutation_type'] ?? '' ) ) {
				$errors[] = $this->operation_error( $operation_id, 'canonical_mutation_type_unsupported' );
			}
		}

		return array_values( array_unique( $errors ) );
	}

	/**
	 * @param list<string> $transaction_commands Transaction commands.
	 */
	private function run_transaction_command( string $command, array &$transaction_commands ): int|false {
		$transaction_commands[] = $command;

		return $this->database->query( $command );
	}

	/**
	 * @param list<string> $transaction_commands Transaction commands.
	 * @param list<string> $errors Error codes.
	 */
	private function rollback_transaction( array &$transaction_commands, array &$errors ): void {
		if ( false === $this->run_transaction_command( 'ROLLBACK', $transaction_commands ) ) {
			$errors[] = 'canonical_mutation_transaction_rollback_failed';
		}
	}

	private function operation_error( string $operation_id, string $code ): string {
		return '' === $operation_id ? $code : $operation_id . '_' . $code;
	}
}
