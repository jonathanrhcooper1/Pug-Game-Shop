<?php
/**
 * Offline push batch resolver.
 *
 * @package TCGStorePlatform
 */

namespace TCGStorePlatform\Offline;

use InvalidArgumentException;

final class OfflinePushBatchResolver {
	private const STATUSES = array( 'accepted', 'conflict', 'rejected' );

	private OfflinePushOperationResolver $operation_resolver;

	public function __construct( ?OfflinePushOperationResolver $operation_resolver = null ) {
		$this->operation_resolver = $operation_resolver ?? new OfflinePushOperationResolver();
	}

	/**
	 * @param array<string|int, mixed> $server_snapshots Server snapshots keyed by operation ID, entity key, or index.
	 * @param array<string|int, mixed> $options_by_operation Runtime options keyed by operation ID, entity key, or index.
	 */
	public function resolve(
		OfflinePushPayload $payload,
		array $server_snapshots,
		string $server_time_utc,
		array $options_by_operation = array()
	): OfflinePushBatchResolutionPlan {
		$server_time_utc = trim( $server_time_utc );

		if ( ! $this->is_utc_timestamp( $server_time_utc ) ) {
			throw new InvalidArgumentException( 'server_time_utc must be an ISO-8601 UTC timestamp.' );
		}

		$operation_plans       = array();
		$operation_result_rows = array();
		$conflict_rows         = array();
		$response_results      = array();
		$counts                = array_fill_keys( self::STATUSES, 0 );

		foreach ( $payload->operations() as $index => $operation ) {
			$plan = $this->operation_resolver->resolve(
				$operation,
				$this->server_snapshot( $operation, $server_snapshots, $index ),
				$server_time_utc,
				$this->operation_options( $operation, $options_by_operation, $index )
			);

			$operation_plans[]       = $plan;
			$operation_result_rows[] = $this->operation_result_row( $payload, $plan );
			$response_results[]      = $plan->response_payload();
			$counts[ $plan->status() ]++;

			if ( null !== $plan->conflict_row() ) {
				$conflict_rows[] = $this->conflict_row( $payload, $operation, $plan->conflict_row() );
			}
		}

		$response_payload = array(
			'batch_id'        => $payload->batch_id(),
			'device_id'       => $payload->device_id(),
			'server_time_utc' => $server_time_utc,
			'operation_count' => count( $operation_plans ),
			'counts'          => $counts,
			'results'         => $response_results,
		);

		$audit_payload = array(
			'action'           => 'offline_push_batch_resolved',
			'batch_id'         => $payload->batch_id(),
			'device_id'        => $payload->device_id(),
			'server_time_utc'  => $server_time_utc,
			'operation_count'  => count( $operation_plans ),
			'accepted_count'   => $counts['accepted'],
			'conflict_count'   => $counts['conflict'],
			'rejected_count'   => $counts['rejected'],
			'operation_ids'    => $this->operation_ids( $payload ),
		);

		return new OfflinePushBatchResolutionPlan(
			$payload->batch_id(),
			$payload->device_id(),
			$server_time_utc,
			$operation_plans,
			$operation_result_rows,
			$conflict_rows,
			$response_payload,
			$audit_payload
		);
	}

	/**
	 * @param array<string|int, mixed> $server_snapshots Server snapshots.
	 * @return array<string, mixed>
	 */
	private function server_snapshot(
		OfflineOperationEnvelope $operation,
		array $server_snapshots,
		int $index
	): array {
		$snapshot = $this->lookup_operation_data( $operation, $server_snapshots, $index );

		if ( ! is_array( $snapshot ) ) {
			throw new InvalidArgumentException(
				"Server snapshot is required for offline operation {$operation->client_operation_id()}."
			);
		}

		return $snapshot;
	}

	/**
	 * @param array<string|int, mixed> $options_by_operation Runtime options.
	 * @return array<string, mixed>
	 */
	private function operation_options(
		OfflineOperationEnvelope $operation,
		array $options_by_operation,
		int $index
	): array {
		$options = $this->lookup_operation_data( $operation, $options_by_operation, $index, array() );

		if ( ! is_array( $options ) ) {
			throw new InvalidArgumentException(
				"Operation options must be an object for offline operation {$operation->client_operation_id()}."
			);
		}

		return $options;
	}

	/**
	 * @param array<string|int, mixed> $payload Lookup payload.
	 */
	private function lookup_operation_data(
		OfflineOperationEnvelope $operation,
		array $payload,
		int $index,
		mixed $fallback = null
	): mixed {
		$entity_key = $this->entity_key( $operation );

		if ( array_key_exists( $operation->client_operation_id(), $payload ) ) {
			return $payload[ $operation->client_operation_id() ];
		}

		if ( array_key_exists( $entity_key, $payload ) ) {
			return $payload[ $entity_key ];
		}

		if ( array_key_exists( $index, $payload ) ) {
			return $payload[ $index ];
		}

		return $fallback;
	}

	/**
	 * @return array<string, mixed>
	 */
	private function operation_result_row(
		OfflinePushPayload $payload,
		OfflinePushOperationResolutionPlan $plan
	): array {
		return array_merge(
			array(
				'batch_id' => $payload->batch_id(),
			),
			$plan->operation_result_row()
		);
	}

	/**
	 * @param array<string, mixed> $conflict_row Conflict row.
	 * @return array<string, mixed>
	 */
	private function conflict_row(
		OfflinePushPayload $payload,
		OfflineOperationEnvelope $operation,
		array $conflict_row
	): array {
		return array_merge(
			array(
				'batch_id'            => $payload->batch_id(),
				'device_id'           => $payload->device_id(),
				'client_operation_id' => $operation->client_operation_id(),
			),
			$conflict_row
		);
	}

	/**
	 * @return list<string>
	 */
	private function operation_ids( OfflinePushPayload $payload ): array {
		return array_map(
			static fn ( OfflineOperationEnvelope $operation ): string => $operation->client_operation_id(),
			$payload->operations()
		);
	}

	private function entity_key( OfflineOperationEnvelope $operation ): string {
		return $operation->entity_type() . ':' . $operation->entity_id();
	}

	private function is_utc_timestamp( string $value ): bool {
		return 1 === preg_match( '/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d+)?Z$/', $value );
	}
}
