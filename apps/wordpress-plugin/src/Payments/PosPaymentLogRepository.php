<?php
/**
 * POS/payment log repository staging adapter.
 *
 * @package TCGStorePlatform
 */

namespace TCGStorePlatform\Payments;

final class PosPaymentLogRepository {
	public function stage( PosPaymentLogQueryBuildPlan $query_plan ): PosPaymentLogRepositoryResult {
		if ( ! $query_plan->is_valid() ) {
			return PosPaymentLogRepositoryResult::rejected(
				$query_plan,
				$query_plan->errors()
			);
		}

		$pos_sync_results = array();
		foreach ( $query_plan->pos_sync_queries() as $index => $query ) {
			$pos_sync_results[] = array(
				'idempotency_key'                   => (string) ( $query['idempotency_key'] ?? '' ),
				'query_kind'                        => 'pos_sync_insert',
				'query_index'                       => $index,
				'reconciliation_status'             => (string) ( $query['reconciliation_status'] ?? '' ),
				'prepare_arg_count'                 => count( $query['prepare_args'] ?? array() ),
				'execution_status'                  => 'deferred',
				'rows_affected'                     => 0,
				'pos_sync_write_execution_deferred' => true,
				'payment_log_repository_deferred'   => true,
				'route_connected_writes_deferred'   => true,
				'provider_inventory_write_deferred' => true,
				'production_capture_deferred'       => true,
			);
		}

		$payment_provider_results = array();
		foreach ( $query_plan->payment_provider_queries() as $index => $query ) {
			$payment_provider_results[] = array(
				'idempotency_key'                           => (string) ( $query['idempotency_key'] ?? '' ),
				'query_kind'                                => 'payment_provider_insert',
				'query_index'                               => $index,
				'operation'                                 => (string) ( $query['operation'] ?? '' ),
				'status'                                    => (string) ( $query['status'] ?? '' ),
				'prepare_arg_count'                         => count( $query['prepare_args'] ?? array() ),
				'execution_status'                          => 'deferred',
				'rows_affected'                             => 0,
				'payment_provider_write_execution_deferred' => true,
				'payment_log_repository_deferred'           => true,
				'route_connected_writes_deferred'           => true,
				'payment_capture_execution_deferred'        => true,
				'production_capture_deferred'               => true,
			);
		}

		return PosPaymentLogRepositoryResult::deferred(
			$query_plan,
			$pos_sync_results,
			$payment_provider_results
		);
	}
}
