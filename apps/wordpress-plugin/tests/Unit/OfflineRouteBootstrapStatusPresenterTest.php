<?php
/**
 * Offline route bootstrap status presenter tests.
 *
 * @package TCGStorePlatform
 */

namespace TCGStorePlatform\Tests\Unit;

use TCGStorePlatform\Api\V1\OfflineRouteBootstrapStatusPresenter;
use TCGStorePlatform\Tests\TestCase;

final class OfflineRouteBootstrapStatusPresenterTest extends TestCase {
	public function test_health_payload_reports_blocked_default_bootstrap_status(): void {
		$payload = ( new OfflineRouteBootstrapStatusPresenter() )->health_payload( false );

		$this->assert_same( 'blocked', $payload['status'] );
		$this->assert_false( $payload['feature_enabled'] );
		$this->assert_same( 5, $payload['planned_route_count'] );
		$this->assert_same( 0, $payload['registerable_route_count'] );
		$this->assert_false( $payload['should_register_routes'] );
		$this->assert_true( $payload['registration_deferred'] );
		$this->assert_same(
			array( 'offline_sync_feature_disabled', 'no_registerable_offline_routes' ),
			$payload['bootstrap_block_reasons']
		);
		$this->assert_true( isset( $payload['route_registration_summary']['POST /offline/pull'] ) );
	}

	public function test_health_payload_reports_gated_status_when_feature_enabled_but_routes_are_not_ready(): void {
		$payload = ( new OfflineRouteBootstrapStatusPresenter() )->health_payload( true );

		$this->assert_same( 'gated', $payload['status'] );
		$this->assert_true( $payload['feature_enabled'] );
		$this->assert_same( array( 'no_registerable_offline_routes' ), $payload['bootstrap_block_reasons'] );
		$this->assert_false( $payload['should_register_routes'] );
		$this->assert_true( $payload['registration_deferred'] );
	}

	public function test_future_registerable_payload_reports_ready_status(): void {
		$payload = ( new OfflineRouteBootstrapStatusPresenter() )->health_payload_from_registration_args(
			true,
			array(
				'POST /offline/pull' => $this->registerable_route_plan(),
			)
		);

		$this->assert_same( 'ready', $payload['status'] );
		$this->assert_true( $payload['should_register_routes'] );
		$this->assert_false( $payload['registration_deferred'] );
		$this->assert_same( 1, $payload['registerable_route_count'] );
		$this->assert_same( array( 'POST /offline/pull' ), $payload['registerable_route_keys'] );
		$this->assert_same( array(), $payload['bootstrap_block_reasons'] );
	}

	public function test_admin_summary_uses_counts_and_block_reasons(): void {
		$summary = ( new OfflineRouteBootstrapStatusPresenter() )->admin_summary( false );

		$this->assert_same( 'blocked', $summary['status'] );
		$this->assert_contains( '0 / 5 registerable', $summary['value'] );
		$this->assert_contains( 'offline_sync_feature_disabled', $summary['value'] );
		$this->assert_contains( 'no_registerable_offline_routes', $summary['value'] );
	}

	/**
	 * @return array<string, mixed>
	 */
	private function registerable_route_plan(): array {
		return array(
			'namespace'                  => 'tcg-store/v1',
			'path'                       => '/offline/pull',
			'methods'                    => 'POST',
			'callback'                   => 'pull_offline_changes',
			'permission'                 => 'registered offline device with offline_pull scope',
			'required_scope'             => 'offline_pull',
			'permission_strategy'        => 'registered_device_permission_callback',
			'permission_callback_ready'  => true,
			'controller_callback_ready'  => true,
			'live_enabled_by_default'    => true,
			'should_register'            => true,
			'registration_block_reasons' => array(),
		);
	}
}
