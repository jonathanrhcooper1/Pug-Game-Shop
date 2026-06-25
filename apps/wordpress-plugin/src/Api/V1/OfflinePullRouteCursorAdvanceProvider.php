<?php
/**
 * Route-aware offline pull cursor advancement provider.
 *
 * @package TCGStorePlatform
 */

namespace TCGStorePlatform\Api\V1;

use TCGStorePlatform\Offline\OfflinePullCursorAdvancePlanner;
use TCGStorePlatform\Offline\OfflinePullCursorAdvanceRepository;
use TCGStorePlatform\Offline\OfflinePullCursorAdvanceRepositoryResult;
use TCGStorePlatform\Offline\OfflinePullDeviceContextPlanner;
use TCGStorePlatform\Offline\OfflinePullRequest;
use TCGStorePlatform\Offline\OfflineRegisteredDevicePermissionResolver;

final class OfflinePullRouteCursorAdvanceProvider {
	private OfflineRegisteredDevicePermissionResolver $permission_resolver;
	private OfflinePullCursorAdvanceRepository $cursor_repository;
	private OfflinePullDeviceContextPlanner $context_planner;
	private OfflinePullCursorAdvancePlanner $cursor_planner;
	private string $table_prefix;

	/**
	 * @var callable|null
	 */
	private $server_time_provider;

	public function __construct(
		OfflineRegisteredDevicePermissionResolver $permission_resolver,
		OfflinePullCursorAdvanceRepository $cursor_repository,
		string $table_prefix,
		?OfflinePullDeviceContextPlanner $context_planner = null,
		?OfflinePullCursorAdvancePlanner $cursor_planner = null,
		?callable $server_time_provider = null
	) {
		$this->permission_resolver  = $permission_resolver;
		$this->cursor_repository    = $cursor_repository;
		$this->table_prefix         = trim( $table_prefix );
		$this->context_planner      = $context_planner ?? new OfflinePullDeviceContextPlanner();
		$this->cursor_planner       = $cursor_planner ?? new OfflinePullCursorAdvancePlanner();
		$this->server_time_provider = $server_time_provider;
	}

	/**
	 * @param array<string, mixed> $change_sets Provider change sets keyed by domain.
	 */
	public function __invoke(
		OfflinePullRequest $request,
		OfflineRestRequestData $data,
		array $change_sets = array()
	): OfflinePullCursorAdvanceRepositoryResult {
		return $this->advance( $request, $data, $change_sets );
	}

	/**
	 * @param array<string, mixed> $change_sets Provider change sets keyed by domain.
	 */
	public function advance(
		OfflinePullRequest $request,
		OfflineRestRequestData $data,
		array $change_sets
	): OfflinePullCursorAdvanceRepositoryResult {
		$server_time_utc = $this->server_time_utc();
		$resolution      = $this->permission_resolver->resolve(
			$data->headers(),
			'offline_pull',
			$server_time_utc
		);
		$context         = $this->context_planner->plan(
			$request,
			$resolution,
			$this->table_prefix
		);
		$advance_plan    = $this->cursor_planner->plan(
			$request,
			$context,
			$change_sets,
			$server_time_utc
		);

		return $this->cursor_repository->advance( $advance_plan );
	}

	/**
	 * @return array<string, mixed>
	 */
	public function readiness_summary(): array {
		return array(
			'action'                           => 'offline_pull_route_cursor_advance_provider_ready',
			'provider_ready'                   => $this->provider_ready(),
			'permission_resolver_ready'        => method_exists( $this->permission_resolver, 'resolve' ),
			'context_planner_ready'            => method_exists( $this->context_planner, 'plan' ),
			'cursor_planner_ready'             => method_exists( $this->cursor_planner, 'plan' ),
			'cursor_repository_ready'          => method_exists( $this->cursor_repository, 'advance' ),
			'table_prefix_ready'               => $this->table_prefix_ready(),
			'route_registration_deferred'      => true,
			'default_route_execution_deferred' => true,
			'route_connected_writes_deferred'  => true,
		);
	}

	private function provider_ready(): bool {
		return method_exists( $this->permission_resolver, 'resolve' )
			&& method_exists( $this->context_planner, 'plan' )
			&& method_exists( $this->cursor_planner, 'plan' )
			&& method_exists( $this->cursor_repository, 'advance' )
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
