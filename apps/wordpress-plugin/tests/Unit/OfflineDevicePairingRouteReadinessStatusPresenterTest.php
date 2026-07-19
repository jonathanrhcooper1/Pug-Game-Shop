<?php
/**
 * Offline device pairing route readiness status presenter tests.
 *
 * @package TCGStorePlatform
 */

namespace TCGStorePlatform\Tests\Unit;

use TCGStorePlatform\Api\V1\OfflineDevicePairingRouteReadinessPlanner;
use TCGStorePlatform\Api\V1\OfflineDevicePairingRouteReadinessStatusPresenter;
use TCGStorePlatform\Api\V1\OfflineDeviceRegistrationRouteHandler;
use TCGStorePlatform\Offline\OfflineDevicePairingPermissionCallbackAdapter;
use TCGStorePlatform\Offline\OfflineDeviceRegistrationService;
use TCGStorePlatform\Tests\TestCase;

final class OfflineDevicePairingRouteReadinessStatusPresenterTest extends TestCase {
	public function test_health_payload_exposes_default_blocked_pairing_readiness(): void {
		$payload = ( new OfflineDevicePairingRouteReadinessStatusPresenter() )->health_payload( false );

		$this->assert_same( 'POST /offline/devices/register', $payload['route_key'] );
		$this->assert_same( 'blocked', $payload['status'] );
		$this->assert_true( $payload['registration_deferred'] );
		$this->assert_false( $payload['handler_injected'] );
		$this->assert_false( $payload['authorizer_configured'] );
		$this->assert_false( $payload['policy_configured'] );
		$this->assert_false( $payload['permission_callback_ready'] );
		$this->assert_false( $payload['controller_callback_ready'] );
		$this->assert_false( $payload['should_register'] );
	}

	public function test_admin_summary_reports_staged_pairing_dependencies_as_gated(): void {
		$summary = ( new OfflineDevicePairingRouteReadinessStatusPresenter(
			new OfflineDevicePairingRouteReadinessPlanner(
				new OfflineDeviceRegistrationRouteHandler( new OfflineDeviceRegistrationService() ),
				new OfflineDevicePairingPermissionCallbackAdapter( null, static fn (): bool => true )
			)
		) )->admin_summary( true );

		$this->assert_same( 'gated', $summary['status'] );
		$this->assert_contains( 'handler ready', $summary['value'] );
		$this->assert_contains( 'permission ready', $summary['value'] );
		$this->assert_contains( 'policy ready', $summary['value'] );
		$this->assert_contains( 'app token desktop_secure_store', $summary['value'] );
		$this->assert_contains( 'route_disabled_by_default', $summary['value'] );
	}
}
