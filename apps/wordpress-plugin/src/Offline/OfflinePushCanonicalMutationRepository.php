<?php
/**
 * Offline push canonical mutation repository staging adapter.
 *
 * @package TCGStorePlatform
 */

namespace TCGStorePlatform\Offline;

final class OfflinePushCanonicalMutationRepository {
	public function stage(
		OfflinePushCanonicalMutationQueryBuildPlan $query_plan
	): OfflinePushCanonicalMutationRepositoryResult {
		if ( ! $query_plan->is_valid() ) {
			return OfflinePushCanonicalMutationRepositoryResult::rejected(
				$query_plan,
				$query_plan->errors()
			);
		}

		$mutation_results = array();

		foreach ( $query_plan->mutation_queries() as $index => $query ) {
			$mutation_results[] = array(
				'client_operation_id'                    => (string) ( $query['client_operation_id'] ?? '' ),
				'mutation_type'                          => (string) ( $query['mutation_type'] ?? '' ),
				'query_kind'                             => (string) ( $query['query_kind'] ?? '' ),
				'mutation_query_index'                   => $index,
				'prepare_arg_count'                      => count( $query['prepare_args'] ?? array() ),
				'execution_status'                       => 'deferred',
				'rows_affected'                          => 0,
				'inventory_write_execution_deferred'     => true,
				'event_registration_write_deferred'      => true,
				'customer_credit_ledger_write_deferred'  => true,
				'topdeck_worker_deferred'                => true,
				'canonical_mutation_repository_deferred' => true,
				'route_connected_writes_deferred'        => true,
			);
		}

		return OfflinePushCanonicalMutationRepositoryResult::deferred(
			$query_plan,
			$mutation_results
		);
	}
}
