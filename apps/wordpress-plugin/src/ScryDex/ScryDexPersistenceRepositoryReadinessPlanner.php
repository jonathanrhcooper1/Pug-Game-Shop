<?php
/**
 * ScryDex persistence repository readiness planning.
 *
 * @package TCGStorePlatform
 */

namespace TCGStorePlatform\ScryDex;

final class ScryDexPersistenceRepositoryReadinessPlanner {
	public function __construct(
		private string $table_prefix = '',
		private ?ScryDexPersistencePlanner $persistence_planner = null,
		private ?ScryDexPersistenceQueryBuilder $query_builder = null,
		private ?ScryDexPersistenceRepository $repository = null
	) {
		$this->table_prefix        = trim( $this->table_prefix );
		$this->persistence_planner = $this->persistence_planner ?? new ScryDexPersistencePlanner();
		$this->query_builder       = $this->query_builder ?? new ScryDexPersistenceQueryBuilder();
		$this->repository          = $this->repository ?? new ScryDexPersistenceRepository();
	}

	/**
	 * @param array<string, mixed>|ScryDexSyncCheckpoint $checkpoint Checkpoint row or value object.
	 * @return array<string, mixed>
	 */
	public function plan( array|ScryDexSyncCheckpoint $checkpoint ): array {
		$checkpoint       = is_array( $checkpoint ) ? ScryDexSyncCheckpoint::from_row( $checkpoint ) : $checkpoint;
		$page_plan        = ScryDexSyncPagePlan::planned( array(), array(), array(), $checkpoint );
		$persistence_plan = $this->persistence_planner->plan_page( $page_plan );
		$query_plan       = $this->query_builder->build( $persistence_plan, $this->table_prefix );
		$result           = $this->repository->stage( $query_plan );
		$errors           = array_values(
			array_unique(
				array_merge(
					$query_plan->errors(),
					$result->errors()
				)
			)
		);
		$configured       = $query_plan->is_valid()
			&& ! $result->is_rejected()
			&& method_exists( $this->repository, 'stage' );

		return array(
			'status'                                     => $configured ? 'ready' : 'blocked',
			'action'                                     => 'scrydex_persistence_repository_readiness',
			'repository_configured'                      => $configured,
			'table_prefix_configured'                    => '' !== $this->table_prefix,
			'table_names'                                => $query_plan->table_names(),
			'query_builder_class'                        => $this->query_builder::class,
			'persistence_repository_class'               => $this->repository::class,
			'persistence_query_builder_ready'            => method_exists( $this->query_builder, 'build' ),
			'persistence_repository_ready'               => method_exists( $this->repository, 'stage' ),
			'persistence_planner_status'                 => $persistence_plan->status(),
			'persistence_query_plan'                     => $query_plan->audit_payload(),
			'persistence_repository_result'              => $result->audit_payload(),
			'checkpoint_upsert_query_present'            => null !== $query_plan->checkpoint_upsert_query(),
			'reference_insert_query_count'               => count( $query_plan->reference_insert_queries() ),
			'reference_update_query_count'               => count( $query_plan->reference_update_queries() ),
			'price_observation_query_count'              => count( $query_plan->price_observation_queries() ),
			'total_query_count'                          => $query_plan->total_query_count(),
			'prepare_arg_count'                          => $query_plan->prepare_arg_count(),
			'readiness_probe_uses_empty_page_plan'       => true,
			'provider_requests_deferred'                 => true,
			'persistence_query_execution_deferred'       => true,
			'persistence_repository_deferred'            => true,
			'reference_card_writes_deferred'             => true,
			'provider_price_observation_writes_deferred' => true,
			'checkpoint_upsert_execution_deferred'       => true,
			'database_writes_deferred'                   => true,
			'configuration_issues'                       => $errors,
			'block_reasons'                              => $configured ? array() : array( 'scrydex_persistence_repository_not_configured' ),
		);
	}
}
