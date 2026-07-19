<?php
/**
 * Offline push server snapshot repository result.
 *
 * @package TCGStorePlatform
 */

namespace TCGStorePlatform\Offline;

final class OfflinePushServerSnapshotRepositoryResult {
	public const STATUS_FETCHED  = 'fetched';
	public const STATUS_REJECTED = 'rejected';

	/**
	 * @param array<string, array<string, mixed>> $server_snapshots Server snapshots keyed for the push resolver.
	 * @param array<string, array<string, mixed>> $operation_snapshots Server snapshots keyed by operation ID.
	 * @param list<array<string, mixed>>          $fetch_results Per-operation fetch audits.
	 * @param list<string>                       $errors Repository errors.
	 * @param array<string, mixed>               $query_audit Snapshot query audit.
	 */
	private function __construct(
		private string $status,
		private array $server_snapshots,
		private array $operation_snapshots,
		private array $fetch_results,
		private array $errors,
		private array $query_audit
	) {
	}

	/**
	 * @param array<string, array<string, mixed>> $server_snapshots Server snapshots keyed for the push resolver.
	 * @param array<string, array<string, mixed>> $operation_snapshots Server snapshots keyed by operation ID.
	 * @param list<array<string, mixed>>          $fetch_results Per-operation fetch audits.
	 */
	public static function fetched(
		OfflinePushServerSnapshotQueryBuildPlan $query_plan,
		array $server_snapshots,
		array $operation_snapshots,
		array $fetch_results
	): self {
		return new self(
			self::STATUS_FETCHED,
			$server_snapshots,
			$operation_snapshots,
			array_values( $fetch_results ),
			array(),
			$query_plan->audit_payload()
		);
	}

	/**
	 * @param list<string>                       $errors Repository errors.
	 * @param array<string, array<string, mixed>> $server_snapshots Server snapshots keyed for the push resolver.
	 * @param array<string, array<string, mixed>> $operation_snapshots Server snapshots keyed by operation ID.
	 * @param list<array<string, mixed>>          $fetch_results Per-operation fetch audits.
	 */
	public static function rejected(
		OfflinePushServerSnapshotQueryBuildPlan $query_plan,
		array $errors,
		array $server_snapshots = array(),
		array $operation_snapshots = array(),
		array $fetch_results = array()
	): self {
		return new self(
			self::STATUS_REJECTED,
			$server_snapshots,
			$operation_snapshots,
			array_values( $fetch_results ),
			array_values( array_unique( $errors ) ),
			$query_plan->audit_payload()
		);
	}

	public function status(): string {
		return $this->status;
	}

	public function is_fetched(): bool {
		return self::STATUS_FETCHED === $this->status;
	}

	public function is_rejected(): bool {
		return self::STATUS_REJECTED === $this->status;
	}

	/**
	 * @return array<string, array<string, mixed>>
	 */
	public function server_snapshots(): array {
		return $this->server_snapshots;
	}

	/**
	 * @return array<string, array<string, mixed>>
	 */
	public function operation_snapshots(): array {
		return $this->operation_snapshots;
	}

	/**
	 * @return array<string, mixed>|null
	 */
	public function operation_snapshot( string $client_operation_id ): ?array {
		$client_operation_id = trim( $client_operation_id );

		return $this->operation_snapshots[ $client_operation_id ] ?? null;
	}

	/**
	 * @return list<array<string, mixed>>
	 */
	public function fetch_results(): array {
		return $this->fetch_results;
	}

	/**
	 * @return list<string>
	 */
	public function errors(): array {
		return $this->errors;
	}

	/**
	 * @return array<string, mixed>
	 */
	public function audit_payload(): array {
		return array(
			'action'                           => 'offline_push_server_snapshot_repository',
			'status'                           => $this->status,
			'is_fetched'                       => $this->is_fetched(),
			'is_rejected'                      => $this->is_rejected(),
			'operation_snapshot_count'         => count( $this->operation_snapshots ),
			'server_snapshot_key_count'        => count( $this->server_snapshots ),
			'fetch_result_count'               => count( $this->fetch_results ),
			'query'                            => $this->query_audit,
			'fetch_results'                    => $this->fetch_results,
			'explicit_execution_required'      => true,
			'default_route_execution_deferred' => true,
			'route_connected_reads_deferred'   => true,
			'canonical_mutations_deferred'     => true,
			'errors'                           => $this->errors,
		);
	}
}
