<?php
/**
 * Offline route bootstrap planner tests.
 *
 * @package TCGStorePlatform
 */

namespace TCGStorePlatform\Tests\Unit;

use TCGStorePlatform\Api\V1\OfflineRouteBootstrapPlanner;
use TCGStorePlatform\Tests\TestCase;

final class OfflineRouteBootstrapPlannerTest extends TestCase {
	public function test_bootstrap_stays_blocked_when_feature_flag_is_disabled(): void {
		$plan    = ( new OfflineRouteBootstrapPlanner() )->plan( false );
		$summary = $plan['route_registration_summary']['POST /offline/pull'];

		$this->assert_false( $plan['feature_enabled'] );
		$this->assert_same( 5, $plan['planned_route_count'] );
		$this->assert_same( 0, $plan['registerable_route_count'] );
		$this->assert_false( $plan['should_register_routes'] );
		$this->assert_same(
			array( 'offline_sync_feature_disabled', 'no_registerable_offline_routes' ),
			$plan['bootstrap_block_reasons']
		);
		$this->assert_same( array(), $plan['registerable_route_keys'] );
		$this->assert_same( '/offline/pull', $summary['path'] );
		$this->assert_false( $summary['should_register'] );
		$this->assert_true( in_array( 'route_disabled_by_default', $summary['registration_block_reasons'], true ) );
	}

	public function test_bootstrap_reports_no_registerable_routes_when_feature_enabled_but_routes_stay_gated(): void {
		$plan = ( new OfflineRouteBootstrapPlanner() )->plan( true );

		$this->assert_true( $plan['feature_enabled'] );
		$this->assert_same( 5, $plan['planned_route_count'] );
		$this->assert_same( 0, $plan['registerable_route_count'] );
		$this->assert_false( $plan['should_register_routes'] );
		$this->assert_same( array( 'no_registerable_offline_routes' ), $plan['bootstrap_block_reasons'] );
		$this->assert_same( array(), $plan['registerable_route_keys'] );
	}

	public function test_bootstrap_can_surface_future_registerable_routes_while_feature_flag_blocks_registration(): void {
		$plan = ( new OfflineRouteBootstrapPlanner() )->plan_from_registration_args(
			false,
			array(
				'POST /offline/pull' => $this->registerable_route_plan(),
			)
		);

		$this->assert_false( $plan['should_register_routes'] );
		$this->assert_same( 1, $plan['planned_route_count'] );
		$this->assert_same( 1, $plan['registerable_route_count'] );
		$this->assert_same( array( 'offline_sync_feature_disabled' ), $plan['bootstrap_block_reasons'] );
		$this->assert_same( array( 'POST /offline/pull' ), $plan['registerable_route_keys'] );
		$this->assert_true( $plan['route_registration_summary']['POST /offline/pull']['should_register'] );
	}

	public function test_bootstrap_allows_registration_when_feature_flag_and_route_plan_are_ready(): void {
		$plan = ( new OfflineRouteBootstrapPlanner() )->plan_from_registration_args(
			true,
			array(
				'POST /offline/pull' => $this->registerable_route_plan(),
			)
		);

		$this->assert_true( $plan['should_register_routes'] );
		$this->assert_same( 1, $plan['registerable_route_count'] );
		$this->assert_same( array(), $plan['bootstrap_block_reasons'] );
		$this->assert_same( array( 'POST /offline/pull' ), $plan['registerable_route_keys'] );
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
