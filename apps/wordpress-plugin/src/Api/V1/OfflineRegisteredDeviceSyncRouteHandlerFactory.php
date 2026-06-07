<?php
/**
 * Staged registered-device sync route handler factory.
 *
 * @package TCGStorePlatform
 */

namespace TCGStorePlatform\Api\V1;

use TCGStorePlatform\Offline\OfflinePullChangeQueryBuilder;
use TCGStorePlatform\Offline\OfflinePullChangeQueryPlanner;
use TCGStorePlatform\Offline\OfflinePullChangeRepository;
use TCGStorePlatform\Offline\OfflinePullChangeSetProvider;
use TCGStorePlatform\Offline\OfflinePullCursorAdvancePlanner;
use TCGStorePlatform\Offline\OfflinePullCursorAdvanceQueryBuilder;
use TCGStorePlatform\Offline\OfflinePullCursorAdvanceRepository;
use TCGStorePlatform\Offline\OfflinePullDeviceContextPlanner;
use TCGStorePlatform\Offline\OfflinePushExistingOperationRowsQueryBuilder;
use TCGStorePlatform\Offline\OfflinePushExistingOperationRowsQueryPlanner;
use TCGStorePlatform\Offline\OfflinePushPersistencePlanner;
use TCGStorePlatform\Offline\OfflinePushPersistenceQueryBuilder;
use TCGStorePlatform\Offline\OfflinePushPersistenceRepository;
use TCGStorePlatform\Offline\OfflinePushServerSnapshotQueryBuilder;
use TCGStorePlatform\Offline\OfflinePushServerSnapshotQueryPlanner;
use TCGStorePlatform\Offline\OfflinePushServerSnapshotRepository;

final class OfflineRegisteredDeviceSyncRouteHandlerFactory {
	private const HANDLER_CALLBACKS = array(
		'pull_offline_changes',
		'push_offline_operations',
	);

	public function __construct(
		private ?OfflineRouteValidationHandlerFactory $validation_handler_factory = null,
		private ?OfflineRestRequestAdapter $request_adapter = null,
		private ?OfflinePullRouteHandler $pull_handler = null,
		private ?OfflinePullRouteHandlerFactory $pull_handler_factory = null,
		private ?OfflinePushRouteHandler $push_handler = null,
		private ?OfflinePushRouteHandlerFactory $push_handler_factory = null
	) {
	}

	public function is_configured(): bool {
		return count( self::HANDLER_CALLBACKS ) === count( $this->handlers() );
	}

	public function controller(): OfflineController {
		return new OfflineController(
			$this->request_adapter,
			$this->handlers()
		);
	}

	/**
	 * @return array<string, callable(OfflineRestRequestData): array<string, mixed>>
	 */
	public function handlers(): array {
		$handlers                            = ( $this->validation_handler_factory ?? new OfflineRouteValidationHandlerFactory() )->handlers();
		$handlers['pull_offline_changes']    = array( $this->pull_handler(), 'handle' );
		$handlers['push_offline_operations'] = array( $this->push_handler(), 'handle' );

		return array_intersect_key( $handlers, array_flip( self::HANDLER_CALLBACKS ) );
	}

	/**
	 * @return array<string, mixed>
	 */
	public function readiness_summary(): array {
		$handlers                       = $this->handlers();
		$issues                         = array();
		$pull_query_domains             = OfflinePullChangeQueryPlanner::supported_domains();
		$pull_sql_ready                 = array() !== $pull_query_domains
			&& method_exists( OfflinePullChangeQueryBuilder::class, 'build' );
		$pull_repository_ready          = $pull_sql_ready
			&& method_exists( OfflinePullChangeRepository::class, 'fetch' );
		$pull_provider_ready            = $pull_repository_ready
			&& method_exists( OfflinePullChangeSetProvider::class, 'fetch' );
		$pull_context_ready             = method_exists( OfflinePullDeviceContextPlanner::class, 'plan' );
		$pull_route_provider_ready      = $pull_provider_ready
			&& $pull_context_ready
			&& method_exists( OfflinePullRouteChangeSetProvider::class, '__invoke' );
		$pull_cursor_planner_ready      = method_exists( OfflinePullCursorAdvancePlanner::class, 'plan' );
		$pull_cursor_sql_ready          = $pull_cursor_planner_ready
			&& method_exists( OfflinePullCursorAdvanceQueryBuilder::class, 'build' );
		$pull_cursor_repo_ready         = $pull_cursor_sql_ready
			&& method_exists( OfflinePullCursorAdvanceRepository::class, 'advance' );
		$pull_route_cursor_ready        = $pull_cursor_repo_ready
			&& $pull_context_ready
			&& method_exists( OfflinePullRouteCursorAdvanceProvider::class, 'advance' );
		$pull_handler_cursor_ready      = $pull_route_cursor_ready
			&& method_exists( OfflinePullRouteHandler::class, 'handle' );
		$push_snapshot_planner_ready    = method_exists( OfflinePushServerSnapshotQueryPlanner::class, 'plan' );
		$push_snapshot_sql_ready        = $push_snapshot_planner_ready
			&& method_exists( OfflinePushServerSnapshotQueryBuilder::class, 'build' );
		$push_snapshot_repository_ready        = $push_snapshot_sql_ready
			&& method_exists( OfflinePushServerSnapshotRepository::class, 'fetch' );
		$push_snapshot_route_provider_ready    = $push_snapshot_repository_ready
			&& method_exists( OfflinePushRouteServerSnapshotProvider::class, '__invoke' );
		$push_operation_options_route_provider_ready = method_exists(
			OfflinePushRouteOperationOptionsProvider::class,
			'__invoke'
		);
		$push_existing_operation_rows_query_ready = method_exists(
			OfflinePushExistingOperationRowsQueryPlanner::class,
			'plan'
		);
		$push_existing_operation_rows_sql_ready   = $push_existing_operation_rows_query_ready
			&& method_exists( OfflinePushExistingOperationRowsQueryBuilder::class, 'build' );
		$push_persistence_planner_ready = method_exists( OfflinePushPersistencePlanner::class, 'plan' );
		$push_persistence_sql_ready     = $push_persistence_planner_ready
			&& method_exists( OfflinePushPersistenceQueryBuilder::class, 'build' );
		$push_persistence_repo_ready    = $push_persistence_sql_ready
			&& method_exists( OfflinePushPersistenceRepository::class, 'persist' );
		$pull_handler_factory           = $this->pull_handler_factory ?? new OfflinePullRouteHandlerFactory();
		$pull_handler_dependencies      = $pull_handler_factory->readiness_summary();
		$push_handler_factory           = $this->push_handler_factory ?? new OfflinePushRouteHandlerFactory();
		$push_handler_dependencies      = $push_handler_factory->readiness_summary();

		foreach ( self::HANDLER_CALLBACKS as $callback ) {
			if ( ! is_callable( $handlers[ $callback ] ?? null ) ) {
				$issues[] = $callback . '_handler_not_configured';
			}
		}

		return array(
			'configured'                                 => array() === $issues,
			'handler_count'                              => count( $handlers ),
			'controller_callbacks'                       => array_values( array_keys( $handlers ) ),
			'pull_handler_configured'                    => is_callable( $handlers['pull_offline_changes'] ?? null ),
			'push_handler_configured'                    => is_callable( $handlers['push_offline_operations'] ?? null ),
			'pull_response_ready'                        => is_callable( $handlers['pull_offline_changes'] ?? null ),
			'pull_device_context_planner_ready'          => $pull_context_ready,
			'pull_change_query_ready'                    => array() !== $pull_query_domains,
			'pull_change_query_sql_ready'                => $pull_sql_ready,
			'pull_change_query_sql_template_ready'       => $pull_sql_ready,
			'pull_change_repository_ready'               => $pull_repository_ready,
			'pull_change_set_provider_ready'             => $pull_provider_ready,
			'pull_route_change_set_provider_ready'       => $pull_route_provider_ready,
			'pull_cursor_advance_planner_ready'          => $pull_cursor_planner_ready,
			'pull_cursor_advance_sql_ready'              => $pull_cursor_sql_ready,
			'pull_cursor_advance_repository_ready'       => $pull_cursor_repo_ready,
			'pull_route_cursor_advance_provider_ready'   => $pull_route_cursor_ready,
			'pull_handler_cursor_advance_ready'          => $pull_handler_cursor_ready,
			'pull_handler_dependency_factory_ready'      => true === ( $pull_handler_dependencies['handler_factory_ready'] ?? false ),
			'pull_handler_route_dependencies_ready'      => true === ( $pull_handler_dependencies['route_connected_handler_ready'] ?? false ),
			'pull_handler_route_dependencies_deferred'   => true === ( $pull_handler_dependencies['route_connected_handler_deferred'] ?? true ),
			'pull_handler_route_execution_enabled'       => true === ( $pull_handler_dependencies['route_connected_execution_enabled'] ?? false ),
			'pull_handler_route_database_configured'     => true === ( $pull_handler_dependencies['database_configured'] ?? false ),
			'pull_handler_route_cursor_writes_deferred'  => true === ( $pull_handler_dependencies['route_connected_cursor_writes_deferred'] ?? true ),
			'pull_handler_route_dependency_issues'       => $pull_handler_dependencies['configuration_issues'] ?? array(),
			'pull_change_query_domains'                  => $pull_query_domains,
			'pull_change_query_domain_count'             => count( $pull_query_domains ),
			'pull_change_query_context_deferred'         => true,
			'pull_device_context_route_deferred'         => true,
			'pull_route_connected_reads_deferred'        => true,
			'pull_change_query_cursor_filter_deferred'   => true,
			'pull_change_query_execution_deferred'       => true,
			'pull_change_query_cursor_advance_deferred'  => true,
			'pull_cursor_advance_write_deferred'         => true,
			'pull_cursor_advance_execution_deferred'     => true,
			'pull_cursor_advance_route_deferred'         => true,
			'pull_route_cursor_advance_route_deferred'   => true,
			'pull_handler_cursor_advance_deferred'       => true,
			'pull_change_query_tombstone_reads_deferred' => true,
			'pull_change_repository_route_deferred'      => true,
			'pull_change_set_provider_route_deferred'    => true,
			'push_persistence_planner_ready'             => $push_persistence_planner_ready,
			'push_persistence_sql_ready'                 => $push_persistence_sql_ready,
			'push_persistence_sql_template_ready'        => $push_persistence_sql_ready,
			'push_persistence_repository_ready'          => $push_persistence_repo_ready,
			'push_snapshot_query_planner_ready'          => $push_snapshot_planner_ready,
			'push_snapshot_query_sql_ready'              => $push_snapshot_sql_ready,
			'push_snapshot_query_sql_template_ready'     => $push_snapshot_sql_ready,
			'push_snapshot_repository_ready'             => $push_snapshot_repository_ready,
			'push_snapshot_route_provider_ready'         => $push_snapshot_route_provider_ready,
			'push_snapshot_route_provider_deferred'      => true,
			'push_operation_options_provider_ready'        => $push_operation_options_route_provider_ready,
			'push_operation_options_provider_deferred'     => true,
			'push_existing_operation_rows_query_ready'     => $push_existing_operation_rows_query_ready,
			'push_existing_operation_rows_query_sql_ready' => $push_existing_operation_rows_sql_ready,
			'push_existing_operation_rows_query_sql_template_ready' => $push_existing_operation_rows_sql_ready,
			'push_existing_operation_rows_query_execution_deferred' => true,
			'push_existing_operation_rows_repository_deferred'      => true,
			'push_existing_operation_rows_route_reads_deferred'     => true,
			'push_snapshot_repo_execution_deferred'      => true,
			'push_snapshot_query_execution_deferred'     => true,
			'push_snapshot_repository_deferred'          => true,
			'push_snapshot_route_reads_deferred'         => true,
			'push_route_handler_ready'                   => method_exists( OfflinePushRouteHandler::class, 'handle' ),
			'push_route_persistence_provider_ready'      => method_exists( OfflinePushRoutePersistenceProvider::class, '__invoke' ),
			'push_handler_dependency_factory_ready'      => true === ( $push_handler_dependencies['handler_factory_ready'] ?? false ),
			'push_handler_route_dependencies_ready'      => true === ( $push_handler_dependencies['route_connected_handler_ready'] ?? false ),
			'push_handler_route_dependencies_deferred'   => true === ( $push_handler_dependencies['route_connected_handler_deferred'] ?? true ),
			'push_handler_route_execution_enabled'       => true === ( $push_handler_dependencies['route_connected_execution_enabled'] ?? false ),
			'push_handler_route_database_configured'     => true === ( $push_handler_dependencies['database_configured'] ?? false ),
			'push_handler_snapshot_provider_ready'       => true === ( $push_handler_dependencies['server_snapshot_repository_provider_ready'] ?? false ),
			'push_handler_snapshot_reads_ready'          => true === ( $push_handler_dependencies['server_snapshot_route_reads_ready'] ?? false ),
			'push_handler_snapshot_reads_deferred'       => true === ( $push_handler_dependencies['route_connected_snapshot_reads_deferred'] ?? true ),
			'push_handler_operation_options_ready'       => true === ( $push_handler_dependencies['operation_options_route_provider_ready'] ?? false ),
			'push_handler_operation_options_deferred'    => true === ( $push_handler_dependencies['route_connected_operation_options_deferred'] ?? true ),
			'push_handler_route_queue_writes_deferred'   => true === ( $push_handler_dependencies['route_connected_queue_writes_deferred'] ?? true ),
			'push_handler_conflict_writes_deferred'      => true === ( $push_handler_dependencies['route_connected_conflict_writes_deferred'] ?? true ),
			'push_handler_route_dependency_issues'       => $push_handler_dependencies['configuration_issues'] ?? array(),
			'push_persistence_route_deferred'            => true === ( $push_handler_dependencies['route_connected_handler_deferred'] ?? true ),
			'push_queue_persistence_deferred'            => true === ( $push_handler_dependencies['route_connected_queue_writes_deferred'] ?? true ),
			'push_conflict_persistence_deferred'         => true === ( $push_handler_dependencies['route_connected_conflict_writes_deferred'] ?? true ),
			'push_queue_replay_deferred'                 => true,
			'push_canonical_mutations_deferred'          => true,
			'write_deferred'                             => true,
			'route_registration_deferred'                => true,
			'route_connected_writes_ready'               => true === ( $push_handler_dependencies['route_connected_writes_ready'] ?? false ),
			'configuration_issues'                       => array_values( array_unique( $issues ) ),
		);
	}

	private function pull_handler(): OfflinePullRouteHandler {
		if ( null !== $this->pull_handler ) {
			return $this->pull_handler;
		}

		return ( $this->pull_handler_factory ?? new OfflinePullRouteHandlerFactory() )->handler();
	}

	private function push_handler(): OfflinePushRouteHandler {
		if ( null !== $this->push_handler ) {
			return $this->push_handler;
		}

		return ( $this->push_handler_factory ?? new OfflinePushRouteHandlerFactory() )->handler();
	}
}
