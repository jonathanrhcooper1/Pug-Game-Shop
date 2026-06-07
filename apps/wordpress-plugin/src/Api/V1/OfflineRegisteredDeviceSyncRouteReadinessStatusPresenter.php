<?php
/**
 * Presentation helpers for registered-device sync route handler readiness.
 *
 * @package TCGStorePlatform
 */

namespace TCGStorePlatform\Api\V1;

final class OfflineRegisteredDeviceSyncRouteReadinessStatusPresenter {
	private OfflineRegisteredDeviceSyncRouteHandlerFactory $handler_factory;

	public function __construct( ?OfflineRegisteredDeviceSyncRouteHandlerFactory $handler_factory = null ) {
		$this->handler_factory = $handler_factory ?? new OfflineRegisteredDeviceSyncRouteHandlerFactory();
	}

	/**
	 * @return array<string, mixed>
	 */
	public function health_payload(): array {
		$summary = $this->handler_factory->readiness_summary();

		return array_merge(
			array(
				'status' => true === $summary['configured'] ? 'ready' : 'blocked',
			),
			$summary
		);
	}

	/**
	 * @return array{value:string,status:string}
	 */
	public function admin_summary(): array {
		$payload = $this->health_payload();

		return array(
			'value'  => sprintf(
				'pull %s; push %s; context %s; query plan %s; SQL plan %s; repository %s; provider %s; route provider %s; cursor planner %s; cursor SQL %s; cursor repository %s; route cursor provider %s; handler cursor %s; handler factory %s; route dependencies %s; push snapshots %s; push snapshot SQL %s; push snapshot repository %s; push snapshot route provider %s; push operation options %s; push existing rows %s; push existing rows SQL %s; push existing rows repository %s; push existing rows route provider %s; push persistence %s; push SQL %s; push repository %s; push canonical planner %s; push canonical SQL %s; push canonical repository %s; push canonical gate %s; push route handler %s; push route provider %s; push handler factory %s; push route dependencies %s; %d callbacks; writes deferred; routes deferred',
				true === ( $payload['pull_handler_configured'] ?? false ) ? 'ready' : 'not ready',
				true === ( $payload['push_handler_configured'] ?? false ) ? 'ready' : 'not ready',
				true === ( $payload['pull_device_context_planner_ready'] ?? false ) ? 'ready' : 'not ready',
				true === ( $payload['pull_change_query_ready'] ?? false ) ? 'ready' : 'not ready',
				true === ( $payload['pull_change_query_sql_ready'] ?? false ) ? 'ready' : 'not ready',
				true === ( $payload['pull_change_repository_ready'] ?? false ) ? 'ready' : 'not ready',
				true === ( $payload['pull_change_set_provider_ready'] ?? false ) ? 'ready' : 'not ready',
				true === ( $payload['pull_route_change_set_provider_ready'] ?? false ) ? 'ready' : 'not ready',
				true === ( $payload['pull_cursor_advance_planner_ready'] ?? false ) ? 'ready' : 'not ready',
				true === ( $payload['pull_cursor_advance_sql_ready'] ?? false ) ? 'ready' : 'not ready',
				true === ( $payload['pull_cursor_advance_repository_ready'] ?? false ) ? 'ready' : 'not ready',
				true === ( $payload['pull_route_cursor_advance_provider_ready'] ?? false ) ? 'ready' : 'not ready',
				true === ( $payload['pull_handler_cursor_advance_ready'] ?? false ) ? 'ready' : 'not ready',
				true === ( $payload['pull_handler_dependency_factory_ready'] ?? false ) ? 'ready' : 'not ready',
				true === ( $payload['pull_handler_route_dependencies_ready'] ?? false ) ? 'ready' : 'deferred',
				true === ( $payload['push_snapshot_query_planner_ready'] ?? false ) ? 'ready' : 'not ready',
				true === ( $payload['push_snapshot_query_sql_ready'] ?? false ) ? 'ready' : 'not ready',
				true === ( $payload['push_snapshot_repository_ready'] ?? false ) ? 'ready' : 'not ready',
				true === ( $payload['push_snapshot_route_provider_ready'] ?? false ) ? 'ready' : 'not ready',
				true === ( $payload['push_operation_options_provider_ready'] ?? false ) ? 'ready' : 'not ready',
				true === ( $payload['push_existing_operation_rows_query_ready'] ?? false ) ? 'ready' : 'not ready',
				true === ( $payload['push_existing_operation_rows_query_sql_ready'] ?? false ) ? 'ready' : 'not ready',
				true === ( $payload['push_existing_operation_rows_repository_ready'] ?? false ) ? 'ready' : 'not ready',
				true === ( $payload['push_existing_operation_rows_route_provider_ready'] ?? false ) ? 'ready' : 'not ready',
				true === ( $payload['push_persistence_planner_ready'] ?? false ) ? 'ready' : 'not ready',
				true === ( $payload['push_persistence_sql_ready'] ?? false ) ? 'ready' : 'not ready',
				true === ( $payload['push_persistence_repository_ready'] ?? false ) ? 'ready' : 'not ready',
				true === ( $payload['push_canonical_mutation_planner_ready'] ?? false ) ? 'ready' : 'not ready',
				true === ( $payload['push_canonical_mutation_sql_ready'] ?? false ) ? 'ready' : 'not ready',
				true === ( $payload['push_canonical_mutation_repository_ready'] ?? false ) ? 'ready' : 'not ready',
				true === ( $payload['push_canonical_mutation_repository_execution_gate_ready'] ?? false ) ? 'ready' : 'not ready',
				true === ( $payload['push_route_handler_ready'] ?? false ) ? 'ready' : 'not ready',
				true === ( $payload['push_route_persistence_provider_ready'] ?? false ) ? 'ready' : 'not ready',
				true === ( $payload['push_handler_dependency_factory_ready'] ?? false ) ? 'ready' : 'not ready',
				true === ( $payload['push_handler_route_dependencies_ready'] ?? false ) ? 'ready' : 'deferred',
				(int) ( $payload['handler_count'] ?? 0 )
			),
			'status' => (string) $payload['status'],
		);
	}
}
