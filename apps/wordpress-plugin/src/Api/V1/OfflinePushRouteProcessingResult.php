<?php
/**
 * Staged offline push route processing result.
 *
 * @package TCGStorePlatform
 */

namespace TCGStorePlatform\Api\V1;

use TCGStorePlatform\Offline\OfflinePushBatchResolutionPlan;
use TCGStorePlatform\Offline\OfflinePushPersistenceRepositoryResult;

final class OfflinePushRouteProcessingResult {
	/**
	 * @param array<string, mixed> $permission_audit Secret-free permission audit payload.
	 */
	public function __construct(
		private OfflinePushBatchResolutionPlan $resolution_plan,
		private OfflinePushPersistenceRepositoryResult $persistence_result,
		private array $permission_audit = array()
	) {
	}

	public function resolution_plan(): OfflinePushBatchResolutionPlan {
		return $this->resolution_plan;
	}

	public function persistence_result(): OfflinePushPersistenceRepositoryResult {
		return $this->persistence_result;
	}

	/**
	 * @return array<string, mixed>
	 */
	public function response_payload(): array {
		$payload = $this->resolution_plan->response_payload();

		if ( ! isset( $payload['results'] ) || ! is_array( $payload['results'] ) ) {
			return $payload;
		}

		$replay_ids         = array_fill_keys( $this->persistence_result->operation_replay_ids(), true );
		$annotated_results  = array();
		$operation_statuses = array();

		foreach ( $payload['results'] as $result ) {
			if ( ! is_array( $result ) ) {
				$annotated_results[] = $result;
				continue;
			}

			$operation_id = trim( (string) ( $result['client_operation_id'] ?? '' ) );
			$is_replayed  = '' !== $operation_id && isset( $replay_ids[ $operation_id ] );
			$status       = $is_replayed ? 'replayed' : 'inserted';

			$result['persistence'] = array(
				'status'   => $status,
				'replayed' => $is_replayed,
			);

			if ( '' !== $operation_id ) {
				$operation_statuses[ $operation_id ] = $status;
			}

			$annotated_results[] = $result;
		}

		$payload['results']                       = $annotated_results;
		$payload['operation_persistence_statuses'] = $operation_statuses;

		return $payload;
	}

	/**
	 * @return array<string, mixed>
	 */
	public function audit_payload(): array {
		return array(
			'action'                           => 'offline_push_route_processing',
			'batch_id'                         => $this->resolution_plan->batch_id(),
			'device_id'                        => $this->resolution_plan->device_id(),
			'server_time_utc'                  => $this->resolution_plan->server_time_utc(),
			'operation_count'                  => count( $this->resolution_plan->operation_plans() ),
			'persistence_status'               => $this->persistence_result->status(),
			'persistence_rows_affected'        => $this->persistence_result->rows_affected(),
			'operation_rows_affected'          => $this->persistence_result->operation_rows_affected(),
			'conflict_rows_affected'           => $this->persistence_result->conflict_rows_affected(),
			'operation_replay_count'           => $this->persistence_result->operation_replay_count(),
			'operation_replay_ids'             => $this->persistence_result->operation_replay_ids(),
			'batch_resolution'                 => $this->resolution_plan->audit_payload(),
			'persistence'                      => $this->persistence_result->audit_payload(),
			'permission'                       => $this->permission_audit,
			'default_route_execution_deferred' => true,
			'route_registration_deferred'      => true,
			'canonical_mutations_deferred'     => true,
			'queue_replay_deferred'            => true,
		);
	}
}
