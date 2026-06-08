<?php
/**
 * Presentation helpers for inventory route dependency readiness.
 *
 * @package TCGStorePlatform
 */

namespace TCGStorePlatform\Api\V1;

final class InventoryRouteDependencyStatusPresenter {
	private InventoryRouteDependencyFactory $dependency_factory;

	public function __construct( ?InventoryRouteDependencyFactory $dependency_factory = null ) {
		$this->dependency_factory = $dependency_factory ?? new InventoryRouteDependencyFactory();
	}

	/**
	 * @return array<string, mixed>
	 */
	public function health_payload(): array {
		$summary = $this->dependency_factory->readiness_summary();

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
				'handlers %d / %d; permissions %d; public reads %s; limiter %s; search handler %s; intake handler %s; registrar %s; routes %s; reads %s; writes %s; projection planning %s; square sync request %s',
				(int) ( $payload['controller_handler_count'] ?? 0 ),
				(int) ( $payload['staged_handler_route_count'] ?? 0 ),
				(int) ( $payload['permission_callback_count'] ?? 0 ),
				true === ( $payload['public_read_routes_enabled'] ?? false ) ? 'enabled' : 'disabled',
				true === ( $payload['public_rate_limiter_configured'] ?? false ) ? 'ready' : 'not ready',
				true === ( $payload['inventory_search_route_handler_ready'] ?? false ) ? 'ready' : 'deferred',
				true === ( $payload['inventory_intake_route_handler_ready'] ?? false ) ? 'ready' : 'deferred',
				true === ( $payload['registrar_ready'] ?? false ) ? 'ready' : 'not ready',
				true === ( $payload['route_registration_deferred'] ?? true ) ? 'deferred' : 'ready',
				true === ( $payload['route_connected_reads_deferred'] ?? true ) ? 'deferred' : 'ready',
				true === ( $payload['route_connected_writes_deferred'] ?? true ) ? 'deferred' : 'ready',
				true === ( $payload['external_projection_planning_deferred'] ?? true ) ? 'deferred' : 'ready',
				true === ( $payload['square_inventory_sync_request_planner_ready'] ?? false ) ? 'ready' : 'not ready'
			),
			'status' => (string) $payload['status'],
		);
	}
}
