<?php
/**
 * ScryDex cards sync worker orchestration planning.
 *
 * @package TCGStorePlatform
 */

namespace TCGStorePlatform\ScryDex;

final class ScryDexCardsSyncWorkerPlanner {
	public function __construct(
		private string $table_prefix = '',
		private ?ScryDexSyncExecutionGate $execution_gate = null,
		private ?ScryDexSyncPageProcessor $page_processor = null,
		private ?ScryDexPersistencePlanner $persistence_planner = null,
		private ?ScryDexPersistenceQueryBuilder $query_builder = null,
		private ?ScryDexPersistenceRepository $repository = null
	) {
		$this->table_prefix        = trim( $this->table_prefix );
		$this->execution_gate      = $this->execution_gate ?? new ScryDexSyncExecutionGate();
		$this->page_processor      = $this->page_processor ?? new ScryDexSyncPageProcessor();
		$this->persistence_planner = $this->persistence_planner ?? new ScryDexPersistencePlanner();
		$this->query_builder       = $this->query_builder ?? new ScryDexPersistenceQueryBuilder();
		$this->repository          = $this->repository ?? new ScryDexPersistenceRepository();
	}

	/**
	 * @param array<string, mixed>        $request Dry-run request settings.
	 * @param list<array<string, mixed>> $existing_reference_rows Current reference rows for change detection.
	 * @param array<string, mixed>        $gate_overrides Gate overrides for controlled tests/staging.
	 * @return array<string, mixed>
	 */
	public function plan_cards_page(
		array $request,
		ScryDexResult $provider_result,
		array $existing_reference_rows = array(),
		array $gate_overrides = array()
	): array {
		$gate                 = $this->execution_gate->plan_cards_worker( $request, $gate_overrides );
		$checkpoint           = ScryDexSyncCheckpoint::from_row( $gate['checkpoint_row'] );
		$page_plan            = $this->page_processor->process_cards_page( $checkpoint, $provider_result );
		$persistence_plan     = $this->persistence_planner->plan_page( $page_plan, $existing_reference_rows );
		$query_plan           = $this->query_builder->build( $persistence_plan, $this->table_prefix );
		$repository_result    = $this->repository->stage( $query_plan );
		$block_reasons        = $this->block_reasons( $gate, $page_plan, $query_plan, $repository_result );
		$provider_result_data = $provider_result->to_array();

		return array(
			'status'                                     => $this->status( $gate, $page_plan, $query_plan, $repository_result ),
			'action'                                     => 'scrydex_cards_sync_worker_orchestration_plan',
			'worker_resource'                            => 'cards',
			'request'                                    => $gate['request'],
			'execution_gate'                             => $gate,
			'provider_result_status'                     => $provider_result->status(),
			'provider_result_http_status'                => $provider_result->http_status(),
			'provider_result_error_code'                 => $provider_result->error_code(),
			'provider_result_body_received'              => array() !== $provider_result_data['body'],
			'provider_result_body_not_logged'            => true,
			'page_plan'                                  => $this->page_plan_summary( $page_plan ),
			'persistence_plan'                           => $this->persistence_plan_summary( $persistence_plan ),
			'persistence_query_plan'                     => $query_plan->audit_payload(),
			'persistence_repository_result'              => $repository_result->audit_payload(),
			'credential_values_redacted'                 => true,
			'network_requests_deferred'                  => true,
			'provider_fetch_deferred'                    => true,
			'provider_result_must_be_injected'           => true,
			'persistence_query_execution_deferred'       => true,
			'persistence_repository_deferred'            => true,
			'reference_card_writes_deferred'             => true,
			'provider_price_observation_writes_deferred' => true,
			'checkpoint_upsert_execution_deferred'       => true,
			'database_writes_deferred'                   => true,
			'scheduled_worker_deferred'                  => true,
			'image_downloads_deferred'                   => true,
			'webhook_registration_deferred'              => true,
			'configuration_issues'                       => $this->configuration_issues( $gate, $page_plan, $query_plan, $repository_result ),
			'block_reasons'                              => $block_reasons,
		);
	}

	private function status(
		array $gate,
		ScryDexSyncPagePlan $page_plan,
		ScryDexPersistenceQueryBuildPlan $query_plan,
		ScryDexPersistenceRepositoryResult $repository_result
	): string {
		if ( ScryDexSyncPagePlan::FAILED === $page_plan->status() ) {
			return 'provider_failed';
		}

		if ( 'ready' !== ( $gate['status'] ?? '' ) || ! $query_plan->is_valid() || $repository_result->is_rejected() ) {
			return 'blocked';
		}

		return 'planned';
	}

	/**
	 * @return array<string, mixed>
	 */
	private function page_plan_summary( ScryDexSyncPagePlan $page_plan ): array {
		$next_checkpoint = $page_plan->next_checkpoint();

		return array(
			'status'              => $page_plan->status(),
			'reference_row_count' => count( $page_plan->reference_rows() ),
			'price_row_count'     => count( $page_plan->price_rows() ),
			'error_count'         => count( $page_plan->errors() ),
			'retryable'           => $page_plan->retryable(),
			'error_code'          => $page_plan->error_code(),
			'next_checkpoint_row' => null === $next_checkpoint ? null : $next_checkpoint->to_row(),
		);
	}

	/**
	 * @return array<string, mixed>
	 */
	private function persistence_plan_summary( ScryDexPersistencePlan $persistence_plan ): array {
		return array(
			'status'                    => $persistence_plan->status(),
			'reference_insert_count'    => count( $persistence_plan->reference_inserts() ),
			'reference_update_count'    => count( $persistence_plan->reference_updates() ),
			'unchanged_reference_count' => count( $persistence_plan->unchanged_reference_keys() ),
			'price_observation_count'   => count( $persistence_plan->price_observations() ),
			'reference_write_count'     => $persistence_plan->reference_write_count(),
			'error_count'               => count( $persistence_plan->errors() ),
			'retryable'                 => $persistence_plan->retryable(),
			'error_code'                => $persistence_plan->error_code(),
		);
	}

	/**
	 * @return list<string>
	 */
	private function block_reasons(
		array $gate,
		ScryDexSyncPagePlan $page_plan,
		ScryDexPersistenceQueryBuildPlan $query_plan,
		ScryDexPersistenceRepositoryResult $repository_result
	): array {
		$reasons = $this->string_list( $gate['block_reasons'] ?? array() );

		if ( ScryDexSyncPagePlan::FAILED === $page_plan->status() && null !== $page_plan->error_code() ) {
			$reasons[] = $page_plan->error_code();
		}

		return array_values(
			array_unique(
				array_merge(
					$reasons,
					$query_plan->errors(),
					$repository_result->errors()
				)
			)
		);
	}

	/**
	 * @return list<string>
	 */
	private function configuration_issues(
		array $gate,
		ScryDexSyncPagePlan $page_plan,
		ScryDexPersistenceQueryBuildPlan $query_plan,
		ScryDexPersistenceRepositoryResult $repository_result
	): array {
		return array_values(
			array_unique(
				array_merge(
					$this->string_list( $gate['configuration_issues'] ?? array() ),
					$this->page_errors( $page_plan ),
					$query_plan->errors(),
					$repository_result->errors()
				)
			)
		);
	}

	/**
	 * @return list<string>
	 */
	private function page_errors( ScryDexSyncPagePlan $page_plan ): array {
		$errors = array();

		if ( null !== $page_plan->error_code() ) {
			$errors[] = $page_plan->error_code();
		}

		foreach ( $page_plan->errors() as $row ) {
			$row_errors = $row['errors'] ?? array();

			if ( is_array( $row_errors ) ) {
				$errors = array_merge( $errors, $this->string_list( $row_errors ) );
			}
		}

		return array_values( array_unique( $errors ) );
	}

	/**
	 * @return list<string>
	 */
	private function string_list( mixed $values ): array {
		if ( ! is_array( $values ) ) {
			return array();
		}

		return array_values(
			array_filter(
				array_map(
					static fn ( mixed $value ): string => is_scalar( $value ) ? trim( (string) $value ) : '',
					$values
				),
				static fn ( string $value ): bool => '' !== $value
			)
		);
	}
}
