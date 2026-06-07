<?php
/**
 * Staged registered-device sync route handler factory.
 *
 * @package TCGStorePlatform
 */

namespace TCGStorePlatform\Api\V1;

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
		$handlers = $this->handlers();
		$issues   = array();

		foreach ( self::HANDLER_CALLBACKS as $callback ) {
			if ( ! is_callable( $handlers[ $callback ] ?? null ) ) {
				$issues[] = $callback . '_handler_not_configured';
			}
		}

		return array(
			'configured'                   => array() === $issues,
			'handler_count'                => count( $handlers ),
			'controller_callbacks'         => array_values( array_keys( $handlers ) ),
			'pull_handler_configured'      => is_callable( $handlers['pull_offline_changes'] ?? null ),
			'push_handler_configured'      => is_callable( $handlers['push_offline_operations'] ?? null ),
			'pull_response_ready'          => is_callable( $handlers['pull_offline_changes'] ?? null ),
			'write_deferred'               => true,
			'route_registration_deferred'  => true,
			'route_connected_writes_ready' => false,
			'configuration_issues'         => array_values( array_unique( $issues ) ),
		);
	}

	private function pull_handler(): OfflinePullRouteHandler {
		return $this->pull_handler ?? new OfflinePullRouteHandler();
	}
}
