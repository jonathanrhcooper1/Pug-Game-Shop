<?php
/**
 * Offline device pairing route readiness planner tests.
 *
 * @package TCGStorePlatform
 */

namespace TCGStorePlatform\Tests\Unit;

use TCGStorePlatform\Api\V1\OfflineDevicePairingRouteReadinessPlanner;
use TCGStorePlatform\Api\V1\OfflineDeviceRegistrationRouteHandler;
use TCGStorePlatform\Offline\OfflineDevicePairingAuthorizerFactory;
use TCGStorePlatform\Offline\OfflineDevicePairingPermissionCallbackAdapter;
use TCGStorePlatform\Offline\OfflineDeviceRegistrationService;
use TCGStorePlatform\Tests\TestCase;

final class OfflineDevicePairingRouteReadinessPlannerTest extends TestCase {
	private const PAIRING_CODE = 'PAIR-2026-READINESS';

	public function test_readiness_reports_missing_handler_and_permission_dependencies(): void {
		$plan = ( new OfflineDevicePairingRouteReadinessPlanner() )->plan( false );

		$this->assert_same( 'POST /offline/devices/register', $plan['route_key'] );
		$this->assert_same( 'blocked', $plan['status'] );
		$this->assert_true( $plan['registration_deferred'] );
		$this->assert_false( $plan['handler_injected'] );
		$this->assert_false( $plan['handler_summary']['configured'] );
		$this->assert_true(
			in_array( 'handler_provider_not_configured', $plan['handler_summary']['configuration_issues'], true )
		);
		$this->assert_false( $plan['authorizer_configured'] );
		$this->assert_false( $plan['policy_configured'] );
		$this->assert_true( in_array( 'policy_provider_not_configured', $plan['policy_summary']['policy_configuration_issues'], true ) );
		$this->assert_false( $plan['permission_callback_ready'] );
		$this->assert_false( $plan['controller_callback_ready'] );
		$this->assert_same( 'offline_device_pairing_request', $plan['app_pairing_contract']['action'] );
		$this->assert_same( '/wp-json/tcg-store/v1/offline/devices/register', $plan['app_pairing_contract']['rest_path'] );
		$this->assert_same( array( 'offline_pull', 'offline_push', 'conflicts' ), $plan['app_pairing_contract']['requested_scopes'] );
		$this->assert_same( 'desktop_secure_store', $plan['app_pairing_contract']['device_token_storage'] );
		$this->assert_true( $plan['app_pairing_contract']['pairing_code_values_redacted'] );
		$this->assert_false( $plan['app_pairing_contract']['raw_pairing_codes_stored'] );
		$this->assert_true( $plan['app_pairing_contract']['network_request_deferred'] );
		$this->assert_true( $plan['app_pairing_contract']['production_token_issuance_deferred'] );
		$this->assert_false( $plan['app_pairing_contract']['credential_values_synced_to_app'] );
		$this->assert_same( 0, $plan['registerable_route_count'] );
		$this->assert_true( in_array( 'permission_callback_not_ready', $plan['registration_block_reasons'], true ) );
		$this->assert_true( in_array( 'controller_callback_not_ready', $plan['registration_block_reasons'], true ) );
		$this->assert_true( in_array( 'offline_sync_feature_disabled', $plan['bootstrap_block_reasons'], true ) );
	}

	public function test_readiness_reports_staged_pairing_route_ready_but_still_disabled(): void {
		$plan = ( new OfflineDevicePairingRouteReadinessPlanner(
			new OfflineDeviceRegistrationRouteHandler( new OfflineDeviceRegistrationService() ),
			new OfflineDevicePairingPermissionCallbackAdapter( null, static fn (): bool => true )
		) )->plan( true );

		$this->assert_same( 'gated', $plan['status'] );
		$this->assert_true( $plan['feature_enabled'] );
		$this->assert_true( $plan['registration_deferred'] );
		$this->assert_true( $plan['handler_injected'] );
		$this->assert_true( $plan['authorizer_configured'] );
		$this->assert_true( $plan['policy_configured'] );
		$this->assert_true( $plan['permission_callback_ready'] );
		$this->assert_true( $plan['controller_callback_ready'] );
		$this->assert_false( $plan['live_enabled_by_default'] );
		$this->assert_false( $plan['should_register'] );
		$this->assert_same( 'not_required_for_pairing', $plan['registered_device_dependency'] );
		$this->assert_true( in_array( 'route_disabled_by_default', $plan['registration_block_reasons'], true ) );
		$this->assert_same( array( 'no_registerable_offline_routes' ), $plan['bootstrap_block_reasons'] );
	}

	public function test_readiness_can_build_pairing_permission_from_configured_settings_policy(): void {
		$settings = array(
			'offline_pairing_authorization' => $this->policy(),
		);
		$plan     = ( new OfflineDevicePairingRouteReadinessPlanner(
			new OfflineDeviceRegistrationRouteHandler( new OfflineDeviceRegistrationService() ),
			null,
			new OfflineDevicePairingAuthorizerFactory(
				static fn (): array => $settings,
				static fn (): string => '2026-06-06T18:30:00Z'
			)
		) )->plan( true );

		$this->assert_true( $plan['handler_injected'] );
		$this->assert_true( $plan['authorizer_configured'] );
		$this->assert_true( $plan['policy_configured'] );
		$this->assert_true( $plan['permission_callback_ready'] );
		$this->assert_true( $plan['controller_callback_ready'] );
		$this->assert_same( 1, $plan['policy_summary']['pairing_code_hash_count'] );
		$this->assert_same( 1, $plan['policy_summary']['configured_mode_count'] );
		$this->assert_same( array(), $plan['policy_summary']['policy_configuration_issues'] );
		$this->assert_false( $plan['should_register'] );
		$this->assert_true( in_array( 'route_disabled_by_default', $plan['registration_block_reasons'], true ) );
	}

	public function test_readiness_keeps_incomplete_settings_policy_permission_locked(): void {
		$plan = ( new OfflineDevicePairingRouteReadinessPlanner(
			new OfflineDeviceRegistrationRouteHandler( new OfflineDeviceRegistrationService() ),
			null,
			new OfflineDevicePairingAuthorizerFactory(
				static fn (): array => array(),
				static fn (): string => '2026-06-06T18:30:00Z'
			)
		) )->plan( true );

		$this->assert_true( $plan['handler_injected'] );
		$this->assert_false( $plan['authorizer_configured'] );
		$this->assert_false( $plan['policy_configured'] );
		$this->assert_false( $plan['permission_callback_ready'] );
		$this->assert_true( in_array( 'pairing_code_hashes_not_configured', $plan['policy_summary']['policy_configuration_issues'], true ) );
		$this->assert_true( in_array( 'permission_callback_not_ready', $plan['registration_block_reasons'], true ) );
	}

	public function test_readiness_keeps_unconfigured_pairing_authorizer_not_ready(): void {
		$plan = ( new OfflineDevicePairingRouteReadinessPlanner(
			new OfflineDeviceRegistrationRouteHandler( new OfflineDeviceRegistrationService() ),
			new OfflineDevicePairingPermissionCallbackAdapter()
		) )->plan( true );

		$this->assert_true( $plan['handler_injected'] );
		$this->assert_false( $plan['authorizer_configured'] );
		$this->assert_false( $plan['permission_callback_ready'] );
		$this->assert_true( $plan['controller_callback_ready'] );
		$this->assert_true( in_array( 'permission_callback_not_ready', $plan['registration_block_reasons'], true ) );
	}

	/**
	 * @return array<string, mixed>
	 */
	private function policy(): array {
		return array(
			'pairing_code_hashes'    => array( hash( 'sha256', self::PAIRING_CODE ) ),
			'manager_ids'            => array( 42 ),
			'location_ids'           => array( 2 ),
			'allowed_scopes_by_mode' => array(
				'kiosk' => array( 'offline_pull', 'offline_push', 'kiosk' ),
			),
			'expires_at_utc'         => '2026-06-06T19:00:00Z',
		);
	}
}
