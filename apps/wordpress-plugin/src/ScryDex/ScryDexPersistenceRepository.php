<?php
/**
 * ScryDex persistence repository staging adapter.
 *
 * @package TCGStorePlatform
 */

namespace TCGStorePlatform\ScryDex;

final class ScryDexPersistenceRepository {
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
}
