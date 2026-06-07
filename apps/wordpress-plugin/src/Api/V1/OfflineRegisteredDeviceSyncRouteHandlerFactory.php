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
use TCGStorePlatform\Offline\OfflinePullDeviceContextPlanner;

final class OfflineRegisteredDeviceSyncRouteHandlerFactory {
	private const HANDLER_CALLBACKS = array(
		'pull_offline_changes',
		'push_offline_operations',
	);

	public function __construct(
		private ?OfflineRouteValidationHandlerFactory $validation_handler_factory = null,
		private ?OfflineRestRequestAdapter $request_adapter = null,
		private ?OfflinePullRouteHandler $pull_handler = null
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
		$handlers                         = ( $this->validation_handler_factory ?? new OfflineRouteValidationHandlerFactory() )->handlers();
		$handlers['pull_offline_changes'] = array( $this->pull_handler(), 'handle' );

		return array_intersect_key( $handlers, array_flip( self::HANDLER_CALLBACKS ) );
	}

	/**
	 * @return array<string, mixed>
	 */
	public function readiness_summary(): array {
		$handlers                  = $this->handlers();
		$issues                    = array();
		$pull_query_domains        = OfflinePullChangeQueryPlanner::supported_domains();
		$pull_sql_ready            = array() !== $pull_query_domains
			&& method_exists( OfflinePullChangeQueryBuilder::class, 'build' );
		$pull_repository_ready     = $pull_sql_ready
			&& method_exists( OfflinePullChangeRepository::class, 'fetch' );
		$pull_provider_ready       = $pull_repository_ready
			&& method_exists( OfflinePullChangeSetProvider::class, 'fetch' );
		$pull_context_ready        = method_exists( OfflinePullDeviceContextPlanner::class, 'plan' );
		$pull_route_provider_ready = $pull_provider_ready
			&& $pull_context_ready
			&& method_exists( OfflinePullRouteChangeSetProvider::class, '__invoke' );
		$pull_cursor_planner_ready = method_exists( OfflinePullCursorAdvancePlanner::class, 'plan' );
		$pull_cursor_sql_ready     = $pull_cursor_planner_ready
			&& method_exists( OfflinePullCursorAdvanceQueryBuilder::class, 'build' );

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
			'pull_change_query_tombstone_reads_deferred' => true,
			'pull_change_repository_route_deferred'      => true,
			'pull_change_set_provider_route_deferred'    => true,
			'write_deferred'                             => true,
			'route_registration_deferred'                => true,
			'route_connected_writes_ready'               => false,
			'configuration_issues'                       => array_values( array_unique( $issues ) ),
		);
	}

	private function pull_handler(): OfflinePullRouteHandler {
		return $this->pull_handler ?? new OfflinePullRouteHandler();
	}
}
