<?php
/**
 * Offline registered-device sync route handler factory tests.
 *
 * @package TCGStorePlatform
 */

namespace TCGStorePlatform\Tests\Unit;

use TCGStorePlatform\Api\V1\OfflineRegisteredDeviceSyncRouteHandlerFactory;
use TCGStorePlatform\Api\V1\OfflineRegisteredDeviceSyncRouteReadinessStatusPresenter;
use TCGStorePlatform\Tests\TestCase;

final class OfflineRegisteredDeviceSyncRouteHandlerFactoryTest extends TestCase {
	public function test_factory_builds_only_registered_device_sync_handlers(): void {
		$factory  = new OfflineRegisteredDeviceSyncRouteHandlerFactory();
		$handlers = $factory->handlers();
		$summary  = $factory->readiness_summary();

		$this->assert_true( $factory->is_configured() );
		$this->assert_same( array( 'pull_offline_changes', 'push_offline_operations' ), array_keys( $handlers ) );
		$this->assert_true( is_callable( $handlers['pull_offline_changes'] ) );
		$this->assert_true( is_callable( $handlers['push_offline_operations'] ) );
		$this->assert_true( $summary['configured'] );
		$this->assert_same( 2, $summary['handler_count'] );
		$this->assert_true( $summary['pull_device_context_planner_ready'] );
		$this->assert_true( $summary['pull_change_query_ready'] );
		$this->assert_true( $summary['pull_change_query_sql_ready'] );
		$this->assert_true( $summary['pull_change_query_sql_template_ready'] );
		$this->assert_true( $summary['pull_change_repository_ready'] );
		$this->assert_true( $summary['pull_change_set_provider_ready'] );
		$this->assert_true( $summary['pull_route_change_set_provider_ready'] );
		$this->assert_same( 5, $summary['pull_change_query_domain_count'] );
		$this->assert_same(
			array( 'branding', 'inventory', 'customer_credit', 'events', 'conflicts' ),
			$summary['pull_change_query_domains']
		);
		$this->assert_true( $summary['pull_change_query_context_deferred'] );
		$this->assert_true( $summary['pull_device_context_route_deferred'] );
		$this->assert_true( $summary['pull_route_connected_reads_deferred'] );
		$this->assert_true( $summary['pull_change_query_cursor_filter_deferred'] );
		$this->assert_true( $summary['pull_change_query_execution_deferred'] );
		$this->assert_true( $summary['pull_change_repository_route_deferred'] );
		$this->assert_true( $summary['pull_change_set_provider_route_deferred'] );
		$this->assert_true( $summary['write_deferred'] );
		$this->assert_true( $summary['route_registration_deferred'] );
		$this->assert_false( $summary['route_connected_writes_ready'] );
		$this->assert_same( array(), $summary['configuration_issues'] );
	}

	public function test_controller_marks_only_pull_and_push_handlers_ready(): void {
		$controller = ( new OfflineRegisteredDeviceSyncRouteHandlerFactory() )->controller();

		$this->assert_true( $controller->has_handler( 'pull_offline_changes' ) );
		$this->assert_true( $controller->has_handler( 'push_offline_operations' ) );
		$this->assert_false( $controller->has_handler( 'register_offline_device' ) );
		$this->assert_false( $controller->has_handler( 'list_offline_conflicts' ) );
		$this->assert_false( $controller->has_handler( 'resolve_offline_conflict' ) );
	}

	public function test_pull_handler_validates_request_without_route_connected_writes(): void {
		$response = ( new OfflineRegisteredDeviceSyncRouteHandlerFactory() )->controller()->pull_offline_changes(
			array(
				'body' => array(
					'device_id'          => 'device-main-01',
					'domains'            => array( 'inventory', 'events' ),
					'cursors'            => array(
						'inventory' => 'cursor-inventory-01',
					),
					'page_size'          => 50,
					'include_tombstones' => true,
					'schema_version'     => 1,
				),
			)
		);

		$this->assert_same( 'ready', $response['status'] );
		$this->assert_same( 200, $response['status_code'] );
		$this->assert_same( 'offline_pull_response_ready', $response['code'] );
		$this->assert_same( 'pull_offline_changes', $response['callback'] );
		$this->assert_same( 'device-main-01', $response['data']['device_id'] );
		$this->assert_true( isset( $response['data']['domains']['inventory'] ) );
		$this->assert_same( 'cursor-inventory-01', $response['data']['domains']['inventory']['cursor'] );
		$this->assert_same( array(), $response['data']['domains']['inventory']['data'] );
		$this->assert_true( $response['meta']['query_deferred'] );
		$this->assert_true( $response['meta']['cursor_advance_deferred'] );
		$this->assert_true( $response['meta']['write_deferred'] );
		$this->assert_true( $response['meta']['route_still_gated'] );
	}

	public function test_push_handler_validates_request_without_queue_persistence(): void {
		$response = ( new OfflineRegisteredDeviceSyncRouteHandlerFactory() )->controller()->push_offline_operations(
			array(
				'body'    => $this->push_payload(),
				'headers' => array(
					'Idempotency-Key' => 'batch-sync-handler-01',
				),
			)
		);

		$this->assert_same( 'validated', $response['status'] );
		$this->assert_same( 202, $response['status_code'] );
		$this->assert_same( 'push_offline_operations', $response['callback'] );
		$this->assert_same( 'batch-sync-handler-01', $response['data']['batch_id'] );
		$this->assert_same( 'device-main-01', $response['data']['device_id'] );
		$this->assert_same( 1, $response['data']['operation_count'] );
		$this->assert_true( $response['data']['write_deferred'] );
		$this->assert_true( $response['data']['route_still_gated'] );
	}

	public function test_readiness_presenter_reports_ready_deferred_handlers(): void {
		$presenter = new OfflineRegisteredDeviceSyncRouteReadinessStatusPresenter();
		$payload   = $presenter->health_payload();
		$summary   = $presenter->admin_summary();

		$this->assert_same( 'ready', $payload['status'] );
		$this->assert_true( $payload['pull_handler_configured'] );
		$this->assert_true( $payload['push_handler_configured'] );
		$this->assert_true( $payload['pull_response_ready'] );
		$this->assert_true( $payload['pull_device_context_planner_ready'] );
		$this->assert_true( $payload['pull_change_query_ready'] );
		$this->assert_true( $payload['pull_change_query_sql_ready'] );
		$this->assert_true( $payload['pull_change_query_sql_template_ready'] );
		$this->assert_true( $payload['pull_change_repository_ready'] );
		$this->assert_true( $payload['pull_change_set_provider_ready'] );
		$this->assert_true( $payload['pull_route_change_set_provider_ready'] );
		$this->assert_same( 5, $payload['pull_change_query_domain_count'] );
		$this->assert_true( $payload['pull_device_context_route_deferred'] );
		$this->assert_true( $payload['pull_route_connected_reads_deferred'] );
		$this->assert_true( $payload['pull_change_query_cursor_filter_deferred'] );
		$this->assert_true( $payload['pull_change_query_execution_deferred'] );
		$this->assert_true( $payload['pull_change_repository_route_deferred'] );
		$this->assert_true( $payload['pull_change_set_provider_route_deferred'] );
		$this->assert_same( 2, $payload['handler_count'] );
		$this->assert_true( $payload['write_deferred'] );
		$this->assert_true( $payload['route_registration_deferred'] );
		$this->assert_same( 'ready', $summary['status'] );
		$this->assert_contains( 'pull ready', $summary['value'] );
		$this->assert_contains( 'push ready', $summary['value'] );
		$this->assert_contains( 'context ready', $summary['value'] );
		$this->assert_contains( 'query plan ready', $summary['value'] );
		$this->assert_contains( 'SQL plan ready', $summary['value'] );
		$this->assert_contains( 'repository ready', $summary['value'] );
		$this->assert_contains( 'provider ready', $summary['value'] );
		$this->assert_contains( 'route provider ready', $summary['value'] );
	}

	/**
	 * @return array<string, mixed>
	 */
	private function push_payload(): array {
		return array(
			'batch_id'   => 'body-batch-ignored',
			'device_id'  => 'device-main-01',
			'operations' => array(
				array(
					'client_operation_id'  => 'op-sync-handler-01',
					'device_id'            => 'device-main-01',
					'location_id'          => '3',
					'actor_id'             => 22,
					'operation_type'       => 'inventory_reservation',
					'entity_type'          => 'inventory',
					'entity_id'            => '1001',
					'base_row_version'     => '4',
					'occurred_at_local'    => '2026-06-06T10:15:00-04:00',
					'queued_at_utc'        => '2026-06-06T14:15:05Z',
					'payload'              => array(
						'localStatus' => 'offline_pending_sync',
					),
					'authorization_context' => array(
						'manager_user_id' => 91,
					),
					'schema_version'       => 1,
				),
			),
		);
	}
}
