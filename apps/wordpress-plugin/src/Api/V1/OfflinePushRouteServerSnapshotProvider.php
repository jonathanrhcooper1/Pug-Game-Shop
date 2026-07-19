<?php
/**
 * Route-aware offline push server snapshot provider.
 *
 * @package TCGStorePlatform
 */

namespace TCGStorePlatform\Api\V1;

use InvalidArgumentException;
use TCGStorePlatform\Offline\OfflinePushPayload;
use TCGStorePlatform\Offline\OfflinePushServerSnapshotQueryPlanner;
use TCGStorePlatform\Offline\OfflinePushServerSnapshotRepository;

final class OfflinePushRouteServerSnapshotProvider {
	private \wpdb $database;
	private OfflinePushServerSnapshotQueryPlanner $query_planner;
	private OfflinePushServerSnapshotRepository $repository;

	public function __construct(
		\wpdb $database,
		?OfflinePushServerSnapshotQueryPlanner $query_planner = null,
		?OfflinePushServerSnapshotRepository $repository = null
	) {
		$this->database      = $database;
		$this->query_planner = $query_planner ?? new OfflinePushServerSnapshotQueryPlanner();
		$this->repository    = $repository ?? new OfflinePushServerSnapshotRepository( $database );
	}

	/**
	 * @param array<string, mixed> $context Route processing context.
	 * @return array<string, array<string, mixed>>
	 */
	public function __invoke(
		OfflinePushPayload $payload,
		OfflineRestRequestData $data,
		array $context = array()
	): array {
		unset( $data );

		$device_row        = $context['device_row'] ?? null;
		$offline_device_id = is_array( $device_row )
			? $this->positive_int( $device_row['offline_device_id'] ?? null )
			: null;

		if ( null === $offline_device_id ) {
			throw new InvalidArgumentException( 'offline_push_snapshot_device_context_invalid' );
		}

		$result = $this->repository->fetch(
			$this->query_planner->plan(
				$payload,
				$offline_device_id,
				(string) $this->database->prefix
			)
		);

		if ( $result->is_rejected() ) {
			throw new InvalidArgumentException(
				'offline_push_snapshot_repository_rejected: ' . implode( ', ', $result->errors() )
			);
		}

		return $result->server_snapshots();
	}

	/**
	 * @return array<string, mixed>
	 */
	public function readiness_summary(): array {
		$table_prefix_ready = $this->table_prefix_ready( (string) $this->database->prefix );

		return array(
			'action'                              => 'offline_push_route_server_snapshot_provider_ready',
			'provider_ready'                      => $table_prefix_ready
				&& method_exists( $this->query_planner, 'plan' )
				&& method_exists( $this->repository, 'fetch' ),
			'table_prefix_ready'                  => $table_prefix_ready,
			'query_planner_ready'                 => method_exists( $this->query_planner, 'plan' ),
			'repository_ready'                    => method_exists( $this->repository, 'fetch' ),
			'route_connected_reads_ready'         => $table_prefix_ready,
			'explicit_execution_required'         => true,
			'default_route_execution_deferred'    => true,
			'default_route_registration_deferred' => true,
			'canonical_mutations_deferred'        => true,
		);
	}

	private function positive_int( mixed $value ): ?int {
		if ( is_int( $value ) && 0 < $value ) {
			return $value;
		}

		if ( is_string( $value ) && 1 === preg_match( '/^[1-9]\d*$/', $value ) ) {
			return (int) $value;
		}

		return null;
	}

	private function table_prefix_ready( string $table_prefix ): bool {
		return '' !== $table_prefix
			&& 1 === preg_match( '/^[A-Za-z0-9_]+$/', $table_prefix );
	}
}
