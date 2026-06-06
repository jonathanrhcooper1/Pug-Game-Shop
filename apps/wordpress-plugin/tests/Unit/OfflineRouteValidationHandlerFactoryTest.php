<?php
/**
 * Offline route validation handler tests.
 *
 * @package TCGStorePlatform
 */

namespace TCGStorePlatform\Tests\Unit;

use TCGStorePlatform\Api\V1\OfflineController;
use TCGStorePlatform\Api\V1\OfflineRouteValidationHandlerFactory;
use TCGStorePlatform\Tests\TestCase;

final class OfflineRouteValidationHandlerFactoryTest extends TestCase {
	public function test_pairing_handler_validates_request_without_writes(): void {
		$response = $this->controller()->register_offline_device(
			array(
				'body' => $this->pairing_payload(),
			)
		);

		$this->assert_same( 'validated', $response['status'] );
		$this->assert_same( 202, $response['status_code'] );
		$this->assert_same( 'offline_request_validated', $response['code'] );
		$this->assert_same( 'register_offline_device', $response['callback'] );
		$this->assert_same( 'kiosk', $response['data']['device_mode'] );
		$this->assert_same( array( 'offline_pull', 'kiosk' ), $response['data']['requested_scopes'] );
		$this->assert_true( $response['data']['write_deferred'] );
		$this->assert_true( $response['data']['route_still_gated'] );
	}

	public function test_push_handler_uses_idempotency_header_without_persistence(): void {
		$response = $this->controller()->push_offline_operations(
			array(
				'body'    => $this->push_payload(),
				'headers' => array(
					'Idempotency-Key' => 'batch-header-69',
				),
			)
		);

		$this->assert_same( 'validated', $response['status'] );
		$this->assert_same( 202, $response['status_code'] );
		$this->assert_same( 'batch-header-69', $response['data']['batch_id'] );
		$this->assert_same( 'device-main-01', $response['data']['device_id'] );
		$this->assert_same( 1, $response['data']['operation_count'] );
		$this->assert_true( $response['data']['write_deferred'] );
	}

	public function test_conflict_list_handler_reads_query_filters(): void {
		$response = $this->controller()->list_offline_conflicts(
			array(
				'query' => array(
					'device_id'        => 'device-main-01',
					'statuses'         => 'open,resolving',
					'entity_types'     => array( 'inventory', 'event' ),
					'cursor'           => 'conflict-cursor-69',
					'page_size'        => '75',
					'include_resolved' => 'true',
					'schema_version'   => 1,
				),
			)
		);

		$this->assert_same( 'validated', $response['status'] );
		$this->assert_same( 200, $response['status_code'] );
		$this->assert_same( array( 'open', 'resolving' ), $response['data']['statuses'] );
		$this->assert_same( array( 'inventory', 'event' ), $response['data']['entity_types'] );
		$this->assert_true( $response['data']['has_cursor'] );
		$this->assert_true( $response['data']['include_resolved'] );
	}

	public function test_conflict_resolution_handler_reads_route_and_idempotency_header(): void {
		$response = $this->controller()->resolve_offline_conflict(
			array(
				'route'   => array(
					'conflict_id' => 'conflict-main-69',
				),
				'body'    => array(
					'device_id'                 => 'device-main-01',
					'manager_id'                => '15',
					'resolution_action'         => 'accept_device',
					'resolution_note'           => 'Staff verified scan.',
					'expected_conflict_version' => '12',
					'resolved_at_utc'           => '2026-06-06T17:00:00Z',
					'resolution_payload'        => array(
						'accepted_inventory_status' => 'sold',
					),
					'schema_version'            => 1,
				),
				'headers' => array(
					'X-Idempotency-Key' => 'resolution-main-69',
				),
			)
		);

		$this->assert_same( 'validated', $response['status'] );
		$this->assert_same( 202, $response['status_code'] );
		$this->assert_same( 'conflict-main-69', $response['data']['conflict_id'] );
		$this->assert_same( 'resolution-main-69', $response['data']['resolution_id'] );
		$this->assert_same( 'accept_device', $response['data']['resolution_action'] );
		$this->assert_true( $response['data']['has_resolution_payload'] );
		$this->assert_true( $response['data']['write_deferred'] );
	}

	public function test_invalid_push_request_returns_stable_validation_errors(): void {
		$response = $this->controller()->push_offline_operations(
			array(
				'body' => array(),
			)
		);

		$this->assert_same( 'invalid', $response['status'] );
		$this->assert_same( 400, $response['status_code'] );
		$this->assert_same( 'offline_request_invalid', $response['code'] );
		$this->assert_same( 'push_offline_operations', $response['callback'] );
		$this->assert_true( in_array( 'batch_id_required', $response['errors'], true ) );
		$this->assert_true( in_array( 'device_id_required', $response['errors'], true ) );
		$this->assert_true( in_array( 'operations_required', $response['errors'], true ) );
	}

	private function controller(): OfflineController {
		return new OfflineController(
			null,
			( new OfflineRouteValidationHandlerFactory() )->handlers()
		);
	}

	/**
	 * @return array<string, mixed>
	 */
	private function pairing_payload(): array {
		return array(
			'pairing_code'     => 'PAIR-6969',
			'installation_id'  => 'install-main-69',
			'device_label'     => 'Front Counter Kiosk',
			'device_mode'      => 'KIOSK',
			'location_id'      => '2',
			'manager_id'       => 15,
			'app_version'      => '0.71.0',
			'platform'         => 'Windows',
			'capabilities'     => array(
				'barcode_scanner' => true,
				'label_printer'   => false,
				'touchscreen'     => true,
			),
			'requested_scopes' => array( 'offline_pull', 'KIOSK', 'offline_pull' ),
			'schema_version'   => 1,
		);
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
					'client_operation_id'  => 'op-00069',
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
