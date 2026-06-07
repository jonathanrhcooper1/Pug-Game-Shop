<?php
/**
 * Route-aware offline pull change-set provider.
 *
 * @package TCGStorePlatform
 */

namespace TCGStorePlatform\Api\V1;

use RuntimeException;
use TCGStorePlatform\Offline\OfflinePullChangeQueryPlanner;
use TCGStorePlatform\Offline\OfflinePullChangeRepository;
use TCGStorePlatform\Offline\OfflinePullChangeSetProvider;
use TCGStorePlatform\Offline\OfflinePullDeviceContextPlanner;
use TCGStorePlatform\Offline\OfflinePullRequest;
use TCGStorePlatform\Offline\OfflineRegisteredDevicePermissionResolver;

final class OfflinePullRouteChangeSetProvider {
	private OfflineRegisteredDevicePermissionResolver $permission_resolver;
	private OfflinePullChangeRepository $change_repository;
	private OfflinePullDeviceContextPlanner $context_planner;
	private OfflinePullChangeQueryPlanner $query_planner;
	private string $table_prefix;

	/**
	 * @var callable|null
	 */
	private $server_time_provider;

	public function __construct(
		OfflineRegisteredDevicePermissionResolver $permission_resolver,
		OfflinePullChangeRepository $change_repository,
		string $table_prefix,
		?OfflinePullDeviceContextPlanner $context_planner = null,
		?OfflinePullChangeQueryPlanner $query_planner = null,
		?callable $server_time_provider = null
	) {
		$this->permission_resolver  = $permission_resolver;
		$this->change_repository    = $change_repository;
		$this->table_prefix         = trim( $table_prefix );
		$this->context_planner      = $context_planner ?? new OfflinePullDeviceContextPlanner();
		$this->query_planner        = $query_planner ?? new OfflinePullChangeQueryPlanner();
		$this->server_time_provider = $server_time_provider;
	}

	/**
	 * @return array<string, array<string, mixed>>
	 */
	public function __invoke( OfflinePullRequest $request, OfflineRestRequestData $data ): array {
		$resolution = $this->permission_resolver->resolve(
			$data->headers(),
			'offline_pull',
			$this->server_time_utc()
		);
		$context    = $this->context_planner->plan(
			$request,
			$resolution,
			$this->table_prefix
		);

		if ( ! $context->is_valid() ) {
			throw new RuntimeException( 'offline_pull_device_context_rejected' );
		}

		$provider = new OfflinePullChangeSetProvider(
			$this->change_repository,
			$context->offline_device_id(),
			$context->table_prefix(),
			$this->query_planner
		);

		return $provider( $request );
	}

	/**
	 * @return array<string, mixed>
	 */
	public function readiness_summary(): array {
		return array(
			'action'                          => 'offline_pull_route_change_set_provider_ready',
			'provider_ready'                  => $this->provider_ready(),
			'permission_resolver_ready'       => method_exists( $this->permission_resolver, 'resolve' ),
			'context_planner_ready'           => method_exists( $this->context_planner, 'plan' ),
			'change_repository_ready'         => method_exists( $this->change_repository, 'fetch' ),
			'query_planner_ready'             => method_exists( $this->query_planner, 'plan' ),
			'table_prefix_ready'              => $this->table_prefix_ready(),
			'route_connected_reads_ready'     => $this->provider_ready(),
			'route_registration_deferred'     => true,
			'cursor_advance_deferred'         => true,
			'tombstone_read_deferred'         => true,
			'route_connected_writes_deferred' => true,
		);
	}

	private function provider_ready(): bool {
		return method_exists( $this->permission_resolver, 'resolve' )
			&& method_exists( $this->context_planner, 'plan' )
			&& method_exists( $this->change_repository, 'fetch' )
			&& method_exists( $this->query_planner, 'plan' )
			&& $this->table_prefix_ready();
	}

	private function table_prefix_ready(): bool {
		return '' !== $this->table_prefix
			&& 1 === preg_match( '/^[A-Za-z0-9_]+$/', $this->table_prefix );
	}

	private function server_time_utc(): string {
		if ( is_callable( $this->server_time_provider ) ) {
			return trim( (string) ( $this->server_time_provider )() );
		}

		return gmdate( 'Y-m-d\TH:i:s\Z' );
	}
}
