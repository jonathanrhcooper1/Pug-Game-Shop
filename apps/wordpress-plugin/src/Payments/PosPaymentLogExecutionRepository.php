<?php
/**
 * POS/payment log explicit execution repository.
 *
 * @package TCGStorePlatform
 */

namespace TCGStorePlatform\Payments;

final class PosPaymentLogExecutionRepository {
	private \wpdb $database;

	public function __construct( \wpdb $database ) {
		$this->database = $database;
	}

	public function execute(
		PosPaymentLogQueryBuildPlan $query_plan,
		PosPaymentLogTransactionPreflightResult $preflight_result
	): PosPaymentLogExecutionRepositoryResult {
		if ( ! $query_plan->is_valid() ) {
			return PosPaymentLogExecutionRepositoryResult::rejected(
				$query_plan,
				$preflight_result,
				$query_plan->errors()
			);
		}

		if ( ! $preflight_result->is_ready() ) {
			return PosPaymentLogExecutionRepositoryResult::rejected(
				$query_plan,
				$preflight_result,
				array_merge(
					$preflight_result->errors(),
					$preflight_result->block_reasons(),
					array( 'pos_payment_log_preflight_not_ready' )
				)
			);
		}

		$table_errors = $this->validate_table_names( $query_plan );
		if ( array() !== $table_errors ) {
			return PosPaymentLogExecutionRepositoryResult::rejected(
				$query_plan,
				$preflight_result,
				$table_errors
			);
		}

		$pos_sync_results       = array();
		$payment_results        = array();
		$pos_sync_rows_affected = 0;
		$payment_rows_affected  = 0;

		foreach ( $query_plan->pos_sync_queries() as $index => $query ) {
			$result          = $this->execute_query( $query );
			$idempotency_key = (string) ( $query['idempotency_key'] ?? 'unknown' );

			if ( false === $result ) {
				return PosPaymentLogExecutionRepositoryResult::rejected(
					$query_plan,
					$preflight_result,
					array( $idempotency_key . '_pos_sync_insert_failed' ),
					$pos_sync_results,
					$payment_results,
					$pos_sync_rows_affected,
					$payment_rows_affected
				);
			}

			if ( 0 > $result ) {
				return PosPaymentLogExecutionRepositoryResult::rejected(
					$query_plan,
					$preflight_result,
					array( $idempotency_key . '_pos_sync_insert_invalid_rows_affected' ),
					$pos_sync_results,
					$payment_results,
					$pos_sync_rows_affected,
					$payment_rows_affected
				);
			}

			$pos_sync_rows_affected += $result;
			$pos_sync_results[]      = array(
				'idempotency_key'                   => $idempotency_key,
				'query_kind'                        => 'pos_sync_insert',
				'query_index'                       => $index,
				'reconciliation_status'             => (string) ( $query['reconciliation_status'] ?? '' ),
				'prepare_arg_count'                 => count( $query['prepare_args'] ?? array() ),
				'rows_affected'                     => $result,
				'pos_sync_write_execution_deferred' => false,
				'route_connected_writes_deferred'   => true,
				'provider_inventory_write_deferred' => true,
				'production_capture_deferred'       => true,
			);
		}

		foreach ( $query_plan->payment_provider_queries() as $index => $query ) {
			$result          = $this->execute_query( $query );
			$idempotency_key = (string) ( $query['idempotency_key'] ?? 'unknown' );

			if ( false === $result ) {
				return PosPaymentLogExecutionRepositoryResult::rejected(
					$query_plan,
					$preflight_result,
					array( $idempotency_key . '_payment_provider_insert_failed' ),
					$pos_sync_results,
					$payment_results,
					$pos_sync_rows_affected,
					$payment_rows_affected
				);
			}

			if ( 0 > $result ) {
				return PosPaymentLogExecutionRepositoryResult::rejected(
					$query_plan,
					$preflight_result,
					array( $idempotency_key . '_payment_provider_insert_invalid_rows_affected' ),
					$pos_sync_results,
					$payment_results,
					$pos_sync_rows_affected,
					$payment_rows_affected
				);
			}

			$payment_rows_affected += $result;
			$payment_results[]      = array(
				'idempotency_key'                    => $idempotency_key,
				'query_kind'                         => 'payment_provider_insert',
				'query_index'                        => $index,
				'operation'                          => (string) ( $query['operation'] ?? '' ),
				'status'                             => (string) ( $query['status'] ?? '' ),
				'prepare_arg_count'                  => count( $query['prepare_args'] ?? array() ),
				'rows_affected'                      => $result,
				'payment_provider_write_execution_deferred' => false,
				'route_connected_writes_deferred'    => true,
				'payment_capture_execution_deferred' => true,
				'production_capture_deferred'        => true,
			);
		}

		return PosPaymentLogExecutionRepositoryResult::persisted(
			$query_plan,
			$preflight_result,
			$pos_sync_results,
			$payment_results,
			$pos_sync_rows_affected,
			$payment_rows_affected
		);
	}

	/**
	 * @return list<string>
	 */
	private function validate_table_names( PosPaymentLogQueryBuildPlan $query_plan ): array {
		$prefix      = (string) ( $this->database->prefix ?? '' );
		$table_names = $query_plan->table_names();
		$errors      = array();

		if (
			'' === $prefix
			|| 1 !== preg_match( '/^[A-Za-z0-9_]+$/', $prefix )
			|| ( $table_names['pos_sync_log'] ?? '' ) !== $prefix . 'tcg_pos_sync_log'
			|| ( $table_names['payment_provider_log'] ?? '' ) !== $prefix . 'tcg_payment_provider_log'
		) {
			$errors[] = 'pos_payment_log_table_prefix_mismatch';
		}

		return $errors;
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
