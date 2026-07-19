<?php
/**
 * Explicit offline pull change-set provider.
 *
 * @package TCGStorePlatform
 */

namespace TCGStorePlatform\Offline;

use RuntimeException;

final class OfflinePullChangeSetProvider {
	private OfflinePullChangeRepository $repository;
	private OfflinePullChangeQueryPlanner $planner;
	private int $offline_device_id;
	private string $table_prefix;

	public function __construct(
		OfflinePullChangeRepository $repository,
		int $offline_device_id,
		string $table_prefix,
		?OfflinePullChangeQueryPlanner $planner = null
	) {
		$this->repository        = $repository;
		$this->offline_device_id = $offline_device_id;
		$this->table_prefix      = trim( $table_prefix );
		$this->planner           = $planner ?? new OfflinePullChangeQueryPlanner();
	}

	public function fetch( OfflinePullRequest $request ): OfflinePullChangeRepositoryResult {
		return $this->repository->fetch(
			$this->planner->plan(
				$request,
				$this->offline_device_id,
				$this->table_prefix
			)
		);
	}

	/**
	 * @return array<string, array<string, mixed>>
	 */
	public function __invoke( OfflinePullRequest $request ): array {
		$result = $this->fetch( $request );

		if ( ! $result->is_fetched() ) {
			throw new RuntimeException( 'offline_pull_change_set_provider_rejected' );
		}

		return $result->change_sets();
	}

	/**
	 * @return array<string, mixed>
	 */
	public function readiness_summary(): array {
		return array(
			'action'                          => 'offline_pull_change_set_provider_ready',
			'provider_ready'                  => $this->context_ready(),
			'offline_device_context_ready'    => 0 < $this->offline_device_id,
			'table_prefix_ready'              => $this->table_prefix_ready(),
			'query_planner_ready'             => method_exists( $this->planner, 'plan' ),
			'repository_ready'                => method_exists( $this->repository, 'fetch' ),
			'route_connection_deferred'       => true,
			'cursor_advance_deferred'         => true,
			'tombstone_read_deferred'         => true,
			'route_connected_writes_deferred' => true,
		);
	}

	private function context_ready(): bool {
		return 0 < $this->offline_device_id
			&& $this->table_prefix_ready()
			&& method_exists( $this->planner, 'plan' )
			&& method_exists( $this->repository, 'fetch' );
	}

	private function table_prefix_ready(): bool {
		return '' !== $this->table_prefix
			&& 1 === preg_match( '/^[A-Za-z0-9_]+$/', $this->table_prefix );
	}
}
