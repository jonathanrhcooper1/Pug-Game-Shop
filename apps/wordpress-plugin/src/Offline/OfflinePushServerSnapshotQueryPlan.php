<?php
/**
 * Planned offline push server snapshot lookup contracts.
 *
 * @package TCGStorePlatform
 */

namespace TCGStorePlatform\Offline;

final class OfflinePushServerSnapshotQueryPlan {
	/**
	 * @param array<string, array<string, mixed>> $operation_queries Planned operation snapshot queries.
	 * @param list<string>                       $errors Planning errors.
	 */
	private function __construct(
		private bool $is_valid,
		private string $batch_id,
		private string $device_id,
		private int $offline_device_id,
		private string $table_prefix,
		private array $operation_queries,
		private array $errors
	) {
	}

	/**
	 * @param array<string, array<string, mixed>> $operation_queries Planned operation snapshot queries.
	 */
	public static function accepted(
		string $batch_id,
		string $device_id,
		int $offline_device_id,
		string $table_prefix,
		array $operation_queries
	): self {
		return new self(
			true,
			trim( $batch_id ),
			trim( $device_id ),
			$offline_device_id,
			trim( $table_prefix ),
			$operation_queries,
			array()
		);
	}

	/**
	 * @param list<string> $errors Planning errors.
	 */
	public static function rejected(
		string $batch_id,
		string $device_id,
		int $offline_device_id,
		array $errors
	): self {
		return new self(
			false,
			trim( $batch_id ),
			trim( $device_id ),
			$offline_device_id,
			'',
			array(),
			array_values( array_unique( $errors ) )
		);
	}

	public function is_valid(): bool {
		return $this->is_valid;
	}

	public function batch_id(): string {
		return $this->batch_id;
	}

	public function device_id(): string {
		return $this->device_id;
	}

	public function offline_device_id(): int {
		return $this->offline_device_id;
	}

	public function table_prefix(): string {
		return $this->table_prefix;
	}

	/**
	 * @return array<string, array<string, mixed>>
	 */
	public function operation_queries(): array {
		return $this->operation_queries;
	}

	/**
	 * @return array<string, mixed>|null
	 */
	public function operation_query( string $client_operation_id ): ?array {
		$client_operation_id = trim( $client_operation_id );

		return $this->operation_queries[ $client_operation_id ] ?? null;
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
		$domains = array();

		foreach ( $this->operation_queries as $query ) {
			$domain = is_string( $query['domain'] ?? null ) ? (string) $query['domain'] : '';

			if ( '' !== $domain ) {
				$domains[] = $domain;
			}
		}

		return array(
			'action'                         => 'offline_push_server_snapshot_queries_planned',
			'is_valid'                       => $this->is_valid,
			'batch_id'                       => $this->batch_id,
			'device_id'                      => $this->device_id,
			'offline_device_id'              => $this->offline_device_id,
			'operation_count'                => count( $this->operation_queries ),
			'domains'                        => array_values( array_unique( $domains ) ),
			'snapshot_query_ready'           => $this->is_valid,
			'execution_deferred'             => true,
			'snapshot_repository_deferred'   => true,
			'route_connected_reads_deferred' => true,
			'canonical_mutations_deferred'   => true,
			'errors'                         => $this->errors,
		);
	}
}
