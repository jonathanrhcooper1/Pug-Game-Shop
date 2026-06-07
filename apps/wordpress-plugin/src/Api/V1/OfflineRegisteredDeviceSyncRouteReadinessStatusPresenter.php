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
				'pull %s; push %s; query plan %s; SQL plan %s; %d callbacks; writes deferred; routes deferred',
				true === ( $payload['pull_handler_configured'] ?? false ) ? 'ready' : 'not ready',
				true === ( $payload['push_handler_configured'] ?? false ) ? 'ready' : 'not ready',
				true === ( $payload['pull_change_query_ready'] ?? false ) ? 'ready' : 'not ready',
				true === ( $payload['pull_change_query_sql_ready'] ?? false ) ? 'ready' : 'not ready',
				(int) ( $payload['handler_count'] ?? 0 )
			),
			'status' => (string) $payload['status'],
		);
	}
}
