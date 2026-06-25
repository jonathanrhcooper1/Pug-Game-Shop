<?php
/**
 * Offline pull device context planner tests.
 *
 * @package TCGStorePlatform
 */

namespace TCGStorePlatform\Tests\Unit;

use TCGStorePlatform\Offline\OfflineDeviceAccessDecision;
use TCGStorePlatform\Offline\OfflineDeviceSessionPlan;
use TCGStorePlatform\Offline\OfflineDeviceTokenLookupPlan;
use TCGStorePlatform\Offline\OfflinePullChangeRepository;
use TCGStorePlatform\Offline\OfflinePullChangeSetProvider;
use TCGStorePlatform\Offline\OfflinePullDeviceContextPlanner;
use TCGStorePlatform\Offline\OfflinePullRequest;
use TCGStorePlatform\Offline\OfflineRegisteredDeviceLookupQueryPlan;
use TCGStorePlatform\Offline\OfflineRegisteredDevicePermissionPlan;
use TCGStorePlatform\Offline\OfflineRegisteredDevicePermissionResolution;
use TCGStorePlatform\Offline\OfflineRegisteredDeviceRepositoryResult;
use TCGStorePlatform\Tests\TestCase;

final class OfflinePullDeviceContextPlannerTest extends TestCase {
	public function test_planner_accepts_authorized_pull_resolution_context(): void {
		$plan  = ( new OfflinePullDeviceContextPlanner() )->plan(
			$this->pull_request(),
			$this->authorized_resolution(),
			'wp_'
		);
		$audit = $plan->audit_payload();

		$this->assert_true( $plan->is_valid() );
		$this->assert_same( 'device-main-01', $plan->device_id() );
		$this->assert_same( 42, $plan->offline_device_id() );
		$this->assert_same( 'wp_', $plan->table_prefix() );
		$this->assert_same( 'offline_pull', $plan->session_context()['required_scope'] );
		$this->assert_same( 'offline_pull_device_context_planned', $audit['action'] );
		$this->assert_true( $audit['provider_context_ready'] );
		$this->assert_true( $audit['route_connection_deferred'] );
		$this->assert_false( str_contains( (string) json_encode( $audit ), 'token' ) );
	}

	public function test_planner_rejects_denied_resolution_before_provider_context(): void {
		$plan = ( new OfflinePullDeviceContextPlanner() )->plan(
			$this->pull_request(),
			OfflineRegisteredDevicePermissionResolution::permission_only(
				OfflineRegisteredDevicePermissionPlan::denied(
					OfflineDeviceTokenLookupPlan::rejected( array( 'device_token_invalid' ) ),
					array( 'device_token_invalid' ),
					array(
						'stage' => 'token_lookup_rejected',
					)
				)
			),
			'wp_'
		);

		$this->assert_false( $plan->is_valid() );
		$this->assert_true( in_array( 'registered_device_not_authorized', $plan->errors(), true ) );
		$this->assert_true( in_array( 'registered_device_session_missing', $plan->errors(), true ) );
		$this->assert_true( in_array( 'offline_device_id_invalid', $plan->errors(), true ) );
		$this->assert_true( in_array( 'device_id_invalid', $plan->errors(), true ) );
		$this->assert_false( $plan->audit_payload()['provider_context_ready'] );
	}

	public function test_planner_rejects_device_mismatch_scope_and_bad_prefix(): void {
		$plan = ( new OfflinePullDeviceContextPlanner() )->plan(
			new OfflinePullRequest(
				'device-other-01',
				array( 'inventory' ),
				array(),
				25,
				true,
				1
			),
			$this->authorized_resolution(
				array(
					'required_scope' => 'offline_push',
				)
			),
			'wp;bad_'
		);

		$this->assert_false( $plan->is_valid() );
		$this->assert_true( in_array( 'device_id_mismatch', $plan->errors(), true ) );
		$this->assert_true( in_array( 'required_scope_not_offline_pull', $plan->errors(), true ) );
		$this->assert_true( in_array( 'table_prefix_invalid', $plan->errors(), true ) );
	}

	public function test_context_plan_can_create_pull_provider_for_repository_fetch(): void {
		$context  = ( new OfflinePullDeviceContextPlanner() )->plan(
			$this->pull_request(),
			$this->authorized_resolution(),
			'wp_'
		);
		$database = new \OfflinePullChangeSetProviderWpdb(
			array(
				array(
					$this->inventory_row(),
				),
			)
		);
		$result   = ( new OfflinePullChangeSetProvider(
			new OfflinePullChangeRepository( $database ),
			$context->offline_device_id(),
			$context->table_prefix()
		) )->fetch( $this->pull_request() );

		$this->assert_true( $context->is_valid() );
		$this->assert_true( $result->is_fetched() );
		$this->assert_same( array( 25 ), $database->prepare_args[0] );
		$this->assert_same( 'inv-context-01', $result->change_sets()['inventory']['data'][0]['entity_id'] );
	}

	/**
	 * @param array<string, mixed> $session_overrides Session context overrides.
	 */
	private function authorized_resolution( array $session_overrides = array() ): OfflineRegisteredDevicePermissionResolution {
		$lookup_plan  = OfflineDeviceTokenLookupPlan::accepted( str_repeat( 'a', 64 ) );
		$session_plan = new OfflineDeviceSessionPlan(
			array(
				'offline_device_id' => 42,
				'public_id'         => 'device-main-01',
				'row_version'       => 9,
			),
			array_merge(
				array(
					'offline_device_id'    => 42,
					'device_id'            => 'device-main-01',
					'device_mode'          => 'kiosk',
					'location_id'          => 2,
					'scopes'               => array( 'offline_pull', 'kiosk' ),
					'required_scope'       => 'offline_pull',
					'auth_type'            => 'device_bearer',
					'token_verified'       => true,
					'authenticated_at_utc' => '2026-06-06T22:00:00Z',
					'server_time_utc'      => '2026-06-06T22:00:00Z',
					'device_row_version'   => 9,
				),
				$session_overrides
			),
			array(
				'action'            => 'offline_device_session_planned',
				'offline_device_id' => 42,
				'device_id'         => 'device-main-01',
			)
		);
		$permission = OfflineRegisteredDevicePermissionPlan::authorized(
			$lookup_plan,
			OfflineDeviceAccessDecision::accepted( $session_plan->session_context() ),
			$session_plan,
			array(
				'stage'         => 'authorized',
				'is_authorized' => true,
			)
		);

		return OfflineRegisteredDevicePermissionResolution::resolved(
			OfflineRegisteredDevicePermissionPlan::denied(
				$lookup_plan,
				array(),
				array(
					'stage' => 'lookup_required',
				)
			),
			OfflineRegisteredDeviceRepositoryResult::found(
				array(
					'offline_device_id' => 42,
					'public_id'         => 'device-main-01',
				),
				$this->lookup_query_plan(),
				array(
					'action' => 'offline_registered_device_row_normalized',
				)
			),
			$permission
		);
	}

	private function lookup_query_plan(): OfflineRegisteredDeviceLookupQueryPlan {
		return OfflineRegisteredDeviceLookupQueryPlan::accepted(
			str_repeat( 'a', 12 ),
			'wp_tcg_offline_devices',
			array( 'offline_device_id', 'public_id' ),
			'SELECT * FROM `wp_tcg_offline_devices` WHERE token_hash = %s',
			array( str_repeat( 'a', 64 ) ),
			\TCGStorePlatform\Offline\OfflineRegisteredDeviceRowNormalizer::class
		);
	}

	private function pull_request(): OfflinePullRequest {
		return new OfflinePullRequest(
			'device-main-01',
			array( 'inventory' ),
			array(),
			25,
			true,
			1
		);
	}

	/**
	 * @return array<string, mixed>
	 */
	private function inventory_row(): array {
		return array(
			'inventory_id'      => '1001',
			'public_id'         => 'inv-context-01',
			'game'              => 'mtg',
			'card_name'         => 'Lightning Bolt',
			'set_name'          => 'Magic Core Set',
			'set_code'          => 'MCS',
			'card_number'       => '150',
			'barcode'           => '123456789012',
			'sku'               => 'MTG-MCS-150',
			'sale_price'        => '4.99',
			'sale_currency'     => 'USD',
			'location_id'       => '2',
			'status'            => 'available',
			'online_visibility' => 'visible',
			'kiosk_visibility'  => 'visible',
			'pos_visibility'    => 'visible',
			'updated_at'        => '2026-06-06 22:00:00',
			'row_version'       => '7',
		);
	}
}
