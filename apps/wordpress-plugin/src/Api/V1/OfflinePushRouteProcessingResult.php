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
		return $this->resolution_plan->response_payload();
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
