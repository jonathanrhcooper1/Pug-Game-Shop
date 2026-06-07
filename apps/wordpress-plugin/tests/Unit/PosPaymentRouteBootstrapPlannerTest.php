<?php
/**
 * POS/payment route bootstrap planner tests.
 *
 * @package TCGStorePlatform
 */

namespace TCGStorePlatform\Tests\Unit;

use TCGStorePlatform\Api\V1\PosPaymentRouteBootstrapPlanner;
use TCGStorePlatform\Tests\TestCase;

final class PosPaymentRouteBootstrapPlannerTest extends TestCase {
	public function test_bootstrap_stays_blocked_when_feature_flag_is_disabled(): void {
		$plan    = ( new PosPaymentRouteBootstrapPlanner() )->plan( false );
		$summary = $plan['route_registration_summary']['POST /pos/events'];

		$this->assert_false( $plan['feature_enabled'] );
		$this->assert_same( 8, $plan['planned_route_count'] );
		$this->assert_same( 0, $plan['registerable_route_count'] );
		$this->assert_false( $plan['should_register_routes'] );
		$this->assert_same(
			array( 'pos_payments_feature_disabled', 'no_registerable_pos_payment_routes' ),
			$plan['bootstrap_block_reasons']
		);
		$this->assert_same( array(), $plan['registerable_route_keys'] );
		$this->assert_same( '/pos/events', $summary['path'] );
		$this->assert_false( $summary['should_register'] );
		$this->assert_true( $summary['route_registration_deferred'] );
		$this->assert_true( $summary['route_connected_reads_deferred'] );
		$this->assert_true( in_array( 'route_disabled_by_default', $summary['registration_block_reasons'], true ) );
	}

	public function test_bootstrap_reports_no_registerable_routes_when_feature_enabled_but_routes_stay_gated(): void {
		$plan = ( new PosPaymentRouteBootstrapPlanner() )->plan( true );

		$this->assert_true( $plan['feature_enabled'] );
		$this->assert_same( 8, $plan['planned_route_count'] );
		$this->assert_same( 0, $plan['registerable_route_count'] );
		$this->assert_false( $plan['should_register_routes'] );
		$this->assert_same( array( 'no_registerable_pos_payment_routes' ), $plan['bootstrap_block_reasons'] );
		$this->assert_same( array(), $plan['registerable_route_keys'] );
	}

	public function test_bootstrap_can_surface_future_registerable_routes_while_feature_flag_blocks_registration(): void {
		$plan = ( new PosPaymentRouteBootstrapPlanner() )->plan_from_registration_args(
			false,
			array(
				'GET /payments/fee-snapshots' => $this->registerable_route_plan(),
			)
		);

		$this->assert_false( $plan['should_register_routes'] );
		$this->assert_same( 1, $plan['planned_route_count'] );
		$this->assert_same( 1, $plan['registerable_route_count'] );
		$this->assert_same( array( 'pos_payments_feature_disabled' ), $plan['bootstrap_block_reasons'] );
		$this->assert_same( array( 'GET /payments/fee-snapshots' ), $plan['registerable_route_keys'] );
		$this->assert_true( $plan['route_registration_summary']['GET /payments/fee-snapshots']['should_register'] );
	}

	public function test_bootstrap_allows_registration_when_feature_flag_and_route_plan_are_ready(): void {
		$plan = ( new PosPaymentRouteBootstrapPlanner() )->plan_from_registration_args(
			true,
			array(
				'GET /payments/fee-snapshots' => $this->registerable_route_plan(),
			)
		);

		$this->assert_true( $plan['should_register_routes'] );
		$this->assert_same( 1, $plan['registerable_route_count'] );
		$this->assert_same( array(), $plan['bootstrap_block_reasons'] );
		$this->assert_same( array( 'GET /payments/fee-snapshots' ), $plan['registerable_route_keys'] );
	}

	/**
	 * @return array<string, mixed>
	 */
	private function registerable_route_plan(): array {
		return array(
			'namespace'                              => 'tcg-store/v1',
			'path'                                   => '/payments/fee-snapshots',
			'methods'                                => 'GET',
			'callback'                               => 'list_payment_fee_snapshots',
			'permission'                             => 'manage_settings',
			'workflow'                               => 'payment_fee_review',
			'permission_callback_ready'              => true,
			'controller_callback_ready'              => true,
			'live_enabled_by_default'                => true,
			'route_registration_deferred'            => false,
			'route_connected_reads_deferred'         => false,
			'route_connected_writes_deferred'        => true,
			'webhook_registration_deferred'          => true,
			'transaction_execution_deferred'         => true,
			'provider_capture_deferred'              => true,
			'provider_inventory_write_deferred'      => true,
			'woocommerce_gateway_capture_deferred'   => true,
			'should_register'                        => true,
			'registration_block_reasons'             => array(),
		);
	}
}
