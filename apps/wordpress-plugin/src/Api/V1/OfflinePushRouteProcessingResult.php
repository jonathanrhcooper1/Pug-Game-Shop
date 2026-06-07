<?php
/**
 * Staged offline push route processing result.
 *
 * @package TCGStorePlatform
 */

namespace TCGStorePlatform\Api\V1;

use TCGStorePlatform\Offline\OfflinePushBatchResolutionPlan;
use TCGStorePlatform\Offline\OfflinePushCanonicalMutationPlan;
use TCGStorePlatform\Offline\OfflinePushCanonicalMutationQueryBuildPlan;
use TCGStorePlatform\Offline\OfflinePushCanonicalMutationRepositoryExecutionResult;
use TCGStorePlatform\Offline\OfflinePushCanonicalMutationRepositoryResult;
use TCGStorePlatform\Offline\OfflinePushPersistenceRepositoryResult;

final class OfflinePushRouteProcessingResult {
	/**
	 * @param array<string, mixed>       $permission_audit Secret-free permission audit payload.
	 * @param list<array<string, mixed>> $operation_replay_rows Existing queue rows for replay response hydration.
	 */
	public function __construct(
		private OfflinePushBatchResolutionPlan $resolution_plan,
		private OfflinePushPersistenceRepositoryResult $persistence_result,
		private array $permission_audit = array(),
		private array $operation_replay_rows = array(),
		private ?OfflinePushCanonicalMutationPlan $canonical_mutation_plan = null,
		private ?OfflinePushCanonicalMutationQueryBuildPlan $canonical_mutation_query_build_plan = null,
		private ?OfflinePushCanonicalMutationRepositoryResult $canonical_mutation_repository_result = null,
		private ?OfflinePushCanonicalMutationRepositoryExecutionResult $canonical_mutation_repository_execution_result = null
	) {
	}

	public function resolution_plan(): OfflinePushBatchResolutionPlan {
		return $this->resolution_plan;
	}

	public function persistence_result(): OfflinePushPersistenceRepositoryResult {
		return $this->persistence_result;
	}

	public function canonical_mutation_plan(): ?OfflinePushCanonicalMutationPlan {
		return $this->canonical_mutation_plan;
	}

	public function canonical_mutation_query_build_plan(): ?OfflinePushCanonicalMutationQueryBuildPlan {
		return $this->canonical_mutation_query_build_plan;
	}

	public function canonical_mutation_repository_result(): ?OfflinePushCanonicalMutationRepositoryResult {
		return $this->canonical_mutation_repository_result;
	}

	public function canonical_mutation_repository_execution_result(): ?OfflinePushCanonicalMutationRepositoryExecutionResult {
		return $this->canonical_mutation_repository_execution_result;
	}

	/**
	 * @return array<string, mixed>
	 */
	public function response_payload(): array {
		$payload = $this->resolution_plan->response_payload();

		if ( ! isset( $payload['results'] ) || ! is_array( $payload['results'] ) ) {
			return $payload;
		}

		$replay_ids          = array_fill_keys( $this->persistence_result->operation_replay_ids(), true );
		$replay_rows         = $this->operation_replay_rows_by_id();
		$annotated_results   = array();
		$operation_statuses  = array();
		$hydrated_replay_ids = array();

		foreach ( $payload['results'] as $result ) {
			if ( ! is_array( $result ) ) {
				$annotated_results[] = $result;
				continue;
			}

			$operation_id = trim( (string) ( $result['client_operation_id'] ?? '' ) );
			$is_replayed  = '' !== $operation_id && isset( $replay_ids[ $operation_id ] );
			$status       = $is_replayed ? 'replayed' : 'inserted';
			$source       = 'resolution_plan';

			if ( $is_replayed && isset( $replay_rows[ $operation_id ] ) ) {
				$result                = $this->replay_response_result( $result, $replay_rows[ $operation_id ] );
				$source                = 'existing_queue_row';
				$hydrated_replay_ids[] = $operation_id;
			}

			$result['persistence'] = array(
				'status'          => $status,
				'replayed'        => $is_replayed,
				'response_source' => $source,
			);

			if ( '' !== $operation_id ) {
				$operation_statuses[ $operation_id ] = $status;
			}

			$annotated_results[] = $result;
		}

		$payload['results']                                  = $annotated_results;
		$payload['operation_persistence_statuses']           = $operation_statuses;
		$payload['operation_replay_response_hydrated_count'] = count( $hydrated_replay_ids );
		$payload['operation_replay_response_hydrated_ids']   = array_values( array_unique( $hydrated_replay_ids ) );

		if ( null !== $this->canonical_mutation_plan ) {
			$canonical                                     = $this->canonical_mutation_plan->response_payload();
			$payload['canonical_mutation_count']          = $canonical['mutation_count'];
			$payload['canonical_mutation_operation_ids']  = $canonical['mutation_operation_ids'];
			$payload['canonical_mutation_skipped_ids']    = $canonical['skipped_operation_ids'];
			$payload['canonical_mutation_skipped_reasons'] = $canonical['skipped_reasons'];
			$payload['canonical_mutation_planning_deferred'] = false;
			$payload['canonical_mutations_deferred']      = true;
		}

		if ( null !== $this->canonical_mutation_query_build_plan ) {
			$payload['canonical_mutation_sql_query_count'] = count(
				$this->canonical_mutation_query_build_plan->mutation_queries()
			);
			$payload['canonical_mutation_sql_operation_ids'] = $this->canonical_mutation_sql_operation_ids();
			$payload['canonical_mutation_sql_prepare_arg_count'] = $this->canonical_mutation_query_build_plan->prepare_arg_count();
			$payload['canonical_mutation_sql_planning_deferred'] = false;
			$payload['canonical_mutation_sql_execution_deferred'] = true;
			$payload['canonical_mutation_repository_deferred'] = true;
		}

		if ( null !== $this->canonical_mutation_repository_result ) {
			$payload['canonical_mutation_repository_status'] = $this->canonical_mutation_repository_result->status();
			$payload['canonical_mutation_repository_query_count'] = $this->canonical_mutation_repository_result->mutation_query_count();
			$payload['canonical_mutation_repository_operation_ids'] = $this->canonical_mutation_repository_result->mutation_operation_ids();
			$payload['canonical_mutation_repository_prepare_arg_count'] = $this->canonical_mutation_repository_result->prepare_arg_count();
			$payload['canonical_mutation_repository_rows_affected'] = $this->canonical_mutation_repository_result->rows_affected();
			$payload['canonical_mutation_repository_errors'] = $this->canonical_mutation_repository_result->errors();
			$payload['canonical_mutation_repository_execution_deferred'] = true;
			$payload['canonical_mutation_repository_deferred'] = true;
		}

		if ( null !== $this->canonical_mutation_repository_execution_result ) {
			$payload['canonical_mutation_repository_execution_status'] = $this->canonical_mutation_repository_execution_result->status();
			$payload['canonical_mutation_repository_execution_blocked'] = $this->canonical_mutation_repository_execution_result->is_blocked();
			$payload['canonical_mutation_repository_execution_ready'] = $this->canonical_mutation_repository_execution_result->is_ready();
			$payload['canonical_mutation_repository_execution_block_reasons'] = $this->canonical_mutation_repository_execution_result->block_reasons();
			$payload['canonical_mutation_repository_execution_errors'] = $this->canonical_mutation_repository_execution_result->errors();
			$payload['canonical_mutation_repository_transaction_deferred'] = true;
			$payload['canonical_mutation_repository_execution_deferred'] = true;
			$payload['canonical_mutation_repository_deferred'] = true;
		}

		return $payload;
	}

	/**
	 * @return array<string, mixed>
	 */
	public function audit_payload(): array {
		$hydrated_replay_ids = $this->operation_replay_response_hydrated_ids();

		return array(
			'action'                                  => 'offline_push_route_processing',
			'batch_id'                                => $this->resolution_plan->batch_id(),
			'device_id'                               => $this->resolution_plan->device_id(),
			'server_time_utc'                         => $this->resolution_plan->server_time_utc(),
			'operation_count'                         => count( $this->resolution_plan->operation_plans() ),
			'persistence_status'                      => $this->persistence_result->status(),
			'persistence_rows_affected'               => $this->persistence_result->rows_affected(),
			'operation_rows_affected'                 => $this->persistence_result->operation_rows_affected(),
			'conflict_rows_affected'                  => $this->persistence_result->conflict_rows_affected(),
			'operation_replay_count'                  => $this->persistence_result->operation_replay_count(),
			'operation_replay_ids'                    => $this->persistence_result->operation_replay_ids(),
			'operation_replay_response_hydrated_count' => count( $hydrated_replay_ids ),
			'operation_replay_response_hydrated_ids'  => $hydrated_replay_ids,
			'canonical_mutation_count'                => null !== $this->canonical_mutation_plan
				? $this->canonical_mutation_plan->mutation_count()
				: 0,
			'canonical_mutation_operation_ids'        => null !== $this->canonical_mutation_plan
				? $this->canonical_mutation_plan->mutation_operation_ids()
				: array(),
			'canonical_mutation_skipped_ids'          => null !== $this->canonical_mutation_plan
				? $this->canonical_mutation_plan->skipped_operation_ids()
				: array(),
			'canonical_mutation_sql_query_count'      => null !== $this->canonical_mutation_query_build_plan
				? count( $this->canonical_mutation_query_build_plan->mutation_queries() )
				: 0,
			'canonical_mutation_sql_operation_ids'    => $this->canonical_mutation_sql_operation_ids(),
			'canonical_mutation_sql_prepare_arg_count' => null !== $this->canonical_mutation_query_build_plan
				? $this->canonical_mutation_query_build_plan->prepare_arg_count()
				: 0,
			'canonical_mutation_repository_status' => null !== $this->canonical_mutation_repository_result
				? $this->canonical_mutation_repository_result->status()
				: 'deferred',
			'canonical_mutation_repository_query_count' => null !== $this->canonical_mutation_repository_result
				? $this->canonical_mutation_repository_result->mutation_query_count()
				: 0,
			'canonical_mutation_repository_operation_ids' => null !== $this->canonical_mutation_repository_result
				? $this->canonical_mutation_repository_result->mutation_operation_ids()
				: array(),
			'canonical_mutation_repository_prepare_arg_count' => null !== $this->canonical_mutation_repository_result
				? $this->canonical_mutation_repository_result->prepare_arg_count()
				: 0,
			'canonical_mutation_repository_rows_affected' => null !== $this->canonical_mutation_repository_result
				? $this->canonical_mutation_repository_result->rows_affected()
				: 0,
			'canonical_mutation_repository_execution_status' => null !== $this->canonical_mutation_repository_execution_result
				? $this->canonical_mutation_repository_execution_result->status()
				: 'blocked',
			'canonical_mutation_repository_execution_blocked' => null !== $this->canonical_mutation_repository_execution_result
				? $this->canonical_mutation_repository_execution_result->is_blocked()
				: true,
			'canonical_mutation_repository_execution_ready' => null !== $this->canonical_mutation_repository_execution_result
				? $this->canonical_mutation_repository_execution_result->is_ready()
				: false,
			'canonical_mutation_repository_execution_block_reasons' => null !== $this->canonical_mutation_repository_execution_result
				? $this->canonical_mutation_repository_execution_result->block_reasons()
				: array(),
			'batch_resolution'                        => $this->resolution_plan->audit_payload(),
			'persistence'                             => $this->persistence_result->audit_payload(),
			'canonical_mutation_planning'             => null !== $this->canonical_mutation_plan
				? $this->canonical_mutation_plan->audit_payload()
				: array(),
			'canonical_mutation_sql_planning'         => null !== $this->canonical_mutation_query_build_plan
				? $this->canonical_mutation_query_build_plan->audit_payload()
				: array(),
			'canonical_mutation_repository'           => null !== $this->canonical_mutation_repository_result
				? $this->canonical_mutation_repository_result->audit_payload()
				: array(),
			'canonical_mutation_repository_execution' => null !== $this->canonical_mutation_repository_execution_result
				? $this->canonical_mutation_repository_execution_result->audit_payload()
				: array(),
			'permission'                              => $this->permission_audit,
			'default_route_execution_deferred'        => true,
			'route_registration_deferred'             => true,
			'canonical_mutations_deferred'            => true,
			'queue_replay_deferred'                   => true,
		);
	}

	/**
	 * @return array<string, array<string, mixed>>
	 */
	private function operation_replay_rows_by_id(): array {
		$rows = array();

		foreach ( $this->operation_replay_rows as $row ) {
			if ( ! is_array( $row ) ) {
				continue;
			}

			$operation_id = trim( (string) ( $row['client_operation_id'] ?? '' ) );

			if ( '' !== $operation_id ) {
				$rows[ $operation_id ] = $row;
			}
		}

		return $rows;
	}

	/**
	 * @return list<string>
	 */
	private function operation_replay_response_hydrated_ids(): array {
		$rows = $this->operation_replay_rows_by_id();
		$ids  = array();

		foreach ( $this->persistence_result->operation_replay_ids() as $operation_id ) {
			if ( isset( $rows[ $operation_id ] ) ) {
				$ids[] = $operation_id;
			}
		}

		return array_values( array_unique( $ids ) );
	}

	/**
	 * @return list<string>
	 */
	private function canonical_mutation_sql_operation_ids(): array {
		if ( null === $this->canonical_mutation_query_build_plan ) {
			return array();
		}

		$ids = array();

		foreach ( $this->canonical_mutation_query_build_plan->mutation_queries() as $query ) {
			$operation_id = trim( (string) ( $query['client_operation_id'] ?? '' ) );

			if ( '' !== $operation_id ) {
				$ids[] = $operation_id;
			}
		}

		return array_values( array_unique( $ids ) );
	}

	/**
	 * @param array<string, mixed> $result Freshly resolved response result.
	 * @param array<string, mixed> $replay_row Existing queue row.
	 * @return array<string, mixed>
	 */
	private function replay_response_result( array $result, array $replay_row ): array {
		return array_merge(
			$result,
			array(
				'status'          => $this->string_or_fallback( $replay_row, 'status', $result['status'] ?? '' ),
				'code'            => $this->string_or_fallback( $replay_row, 'result_code', $result['code'] ?? '' ),
				'details'         => $this->array_or_fallback( $replay_row, 'result_details', $result['details'] ?? array() ),
				'server_time_utc' => $this->string_or_fallback( $replay_row, 'resolved_at', $result['server_time_utc'] ?? $this->resolution_plan->server_time_utc() ),
			)
		);
	}

	/**
	 * @param array<string, mixed> $row Source row.
	 */
	private function string_or_fallback( array $row, string $field, mixed $fallback ): string {
		$value = trim( (string) ( $row[ $field ] ?? '' ) );

		return '' !== $value ? $value : trim( (string) $fallback );
	}

	/**
	 * @param array<string, mixed> $row Source row.
	 * @return array<string, mixed>
	 */
	private function array_or_fallback( array $row, string $field, mixed $fallback ): array {
		if ( isset( $row[ $field ] ) && is_array( $row[ $field ] ) ) {
			return $row[ $field ];
		}

		return is_array( $fallback ) ? $fallback : array();
	}
}
