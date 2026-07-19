<?php
/**
 * Planned offline push batch resolution output.
 *
 * @package TCGStorePlatform
 */

namespace TCGStorePlatform\Offline;

final class OfflinePushBatchResolutionPlan {
	/**
	 * @param list<OfflinePushOperationResolutionPlan> $operation_plans Per-operation resolution plans.
	 * @param list<array<string, mixed>>               $operation_result_rows Future operation result rows.
	 * @param list<array<string, mixed>>               $conflict_rows Future conflict rows.
	 * @param array<string, mixed>                     $response_payload API response payload.
	 * @param array<string, mixed>                     $audit_payload Audit payload without full operation payloads.
	 */
	public function __construct(
		private string $batch_id,
		private string $device_id,
		private string $server_time_utc,
		private array $operation_plans,
		private array $operation_result_rows,
		private array $conflict_rows,
		private array $response_payload,
		private array $audit_payload
	) {
		$this->batch_id        = trim( $batch_id );
		$this->device_id       = trim( $device_id );
		$this->server_time_utc = trim( $server_time_utc );
	}

	public function batch_id(): string {
		return $this->batch_id;
	}

	public function device_id(): string {
		return $this->device_id;
	}

	public function server_time_utc(): string {
		return $this->server_time_utc;
	}

	/**
	 * @return list<OfflinePushOperationResolutionPlan>
	 */
	public function operation_plans(): array {
		return $this->operation_plans;
	}

	/**
	 * @return list<array<string, mixed>>
	 */
	public function operation_result_rows(): array {
		return $this->operation_result_rows;
	}

	/**
	 * @return list<array<string, mixed>>
	 */
	public function conflict_rows(): array {
		return $this->conflict_rows;
	}

	/**
	 * @return array<string, mixed>
	 */
	public function response_payload(): array {
		return $this->response_payload;
	}

	/**
	 * @return array<string, mixed>
	 */
	public function audit_payload(): array {
		return $this->audit_payload;
	}
}
