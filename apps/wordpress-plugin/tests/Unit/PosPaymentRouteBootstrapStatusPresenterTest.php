<?php
/**
 * POS/payment route bootstrap status presenter tests.
 *
 * @package TCGStorePlatform
 */

namespace TCGStorePlatform\Tests\Unit;

use TCGStorePlatform\Api\V1\PosPaymentRouteBootstrapStatusPresenter;
use TCGStorePlatform\Tests\TestCase;

final class PosPaymentRouteBootstrapStatusPresenterTest extends TestCase {
	public function test_health_payload_reports_blocked_default_bootstrap_status(): void {
		$payload = ( new PosPaymentRouteBootstrapStatusPresenter() )->health_payload( false );

		$this->assert_same( 'blocked', $payload['status'] );
		$this->assert_false( $payload['feature_enabled'] );
		$this->assert_same( 8, $payload['planned_route_count'] );
		$this->assert_same( 0, $payload['registerable_route_count'] );
		$this->assert_false( $payload['should_register_routes'] );
		$this->assert_true( $payload['registration_deferred'] );
		$this->assert_same(
			array( 'pos_payments_feature_disabled', 'no_registerable_pos_payment_routes' ),
			$payload['bootstrap_block_reasons']
		);
		$this->assert_true( isset( $payload['route_registration_summary']['POST /pos/events'] ) );
	}

	public function test_health_payload_reports_gated_status_when_feature_enabled_but_routes_are_not_ready(): void {
		$payload = ( new PosPaymentRouteBootstrapStatusPresenter() )->health_payload( true );

		$this->assert_same( 'gated', $payload['status'] );
		$this->assert_true( $payload['feature_enabled'] );
		$this->assert_same( array( 'no_registerable_pos_payment_routes' ), $payload['bootstrap_block_reasons'] );
		$this->assert_false( $payload['should_register_routes'] );
		$this->assert_true( $payload['registration_deferred'] );
	}

	public function test_future_registerable_payload_reports_ready_status(): void {
		$payload = ( new PosPaymentRouteBootstrapStatusPresenter() )->health_payload_from_registration_args(
			true,
			array(
				'GET /payments/fee-snapshots' => $this->registerable_route_plan(),
			)
		);

		$this->assert_same( 'ready', $payload['status'] );
		$this->assert_true( $payload['should_register_routes'] );
		$this->assert_false( $payload['registration_deferred'] );
		$this->assert_same( 1, $payload['registerable_route_count'] );
		$this->assert_same( array( 'GET /payments/fee-snapshots' ), $payload['registerable_route_keys'] );
		$this->assert_same( array(), $payload['bootstrap_block_reasons'] );
	}

	public function test_admin_summary_uses_counts_and_block_reasons(): void {
		$summary = ( new PosPaymentRouteBootstrapStatusPresenter() )->admin_summary( false );

		$this->assert_same( 'blocked', $summary['status'] );
		$this->assert_contains( '0 / 8 registerable', $summary['value'] );
		$this->assert_contains( 'pos_payments_feature_disabled', $summary['value'] );
		$this->assert_contains( 'no_registerable_pos_payment_routes', $summary['value'] );
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
