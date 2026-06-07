<?php
/**
 * Offline device pairing route readiness planner tests.
 *
 * @package TCGStorePlatform
 */

namespace TCGStorePlatform\Tests\Unit;

use TCGStorePlatform\Api\V1\OfflineDevicePairingRouteReadinessPlanner;
use TCGStorePlatform\Api\V1\OfflineDeviceRegistrationRouteHandler;
use TCGStorePlatform\Offline\OfflineDevicePairingPermissionCallbackAdapter;
use TCGStorePlatform\Offline\OfflineDeviceRegistrationService;
use TCGStorePlatform\Tests\TestCase;

final class OfflineDevicePairingRouteReadinessPlannerTest extends TestCase {
	public function test_readiness_reports_missing_handler_and_permission_dependencies(): void {
		$plan = ( new OfflineDevicePairingRouteReadinessPlanner() )->plan( false );

		$this->assert_same( 'POST /offline/devices/register', $plan['route_key'] );
		$this->assert_same( 'blocked', $plan['status'] );
		$this->assert_true( $plan['registration_deferred'] );
		$this->assert_false( $plan['handler_injected'] );
		$this->assert_false( $plan['authorizer_configured'] );
		$this->assert_false( $plan['permission_callback_ready'] );
		$this->assert_false( $plan['controller_callback_ready'] );
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
		$this->assert_true( $plan['permission_callback_ready'] );
		$this->assert_true( $plan['controller_callback_ready'] );
		$this->assert_false( $plan['live_enabled_by_default'] );
		$this->assert_false( $plan['should_register'] );
		$this->assert_same( 'not_required_for_pairing', $plan['registered_device_dependency'] );
		$this->assert_true( in_array( 'route_disabled_by_default', $plan['registration_block_reasons'], true ) );
		$this->assert_same( array( 'no_registerable_offline_routes' ), $plan['bootstrap_block_reasons'] );
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
}
