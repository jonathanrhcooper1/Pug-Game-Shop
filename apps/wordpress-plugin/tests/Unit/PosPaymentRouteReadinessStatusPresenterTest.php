<?php
/**
 * POS/payment route readiness status presenter tests.
 *
 * @package TCGStorePlatform
 */

namespace TCGStorePlatform\Tests\Unit;

use TCGStorePlatform\Api\V1\PosPaymentRouteReadinessStatusPresenter;
use TCGStorePlatform\Tests\TestCase;

final class PosPaymentRouteReadinessStatusPresenterTest extends TestCase {
	public function test_health_payload_exposes_default_blocked_pos_payment_readiness(): void {
		$payload = ( new PosPaymentRouteReadinessStatusPresenter() )->health_payload( false );

		$this->assert_same( 'blocked', $payload['status'] );
		$this->assert_false( $payload['feature_enabled'] );
		$this->assert_same( 8, $payload['planned_route_count'] );
		$this->assert_same( 0, $payload['registerable_route_count'] );
		$this->assert_true( $payload['registration_deferred'] );
		$this->assert_false( $payload['route_handlers_configured'] );
		$this->assert_false( $payload['permission_callbacks_configured'] );
		$this->assert_false( $payload['route_transaction_executor_configured'] );
		$this->assert_true( $payload['provider_capture_deferred'] );
	}

	public function test_admin_summary_reports_deferred_route_dependencies(): void {
		$summary = ( new PosPaymentRouteReadinessStatusPresenter() )->admin_summary( false );

		$this->assert_same( 'blocked', $summary['status'] );
		$this->assert_contains( '0 / 8 registerable', $summary['value'] );
		$this->assert_contains( 'pos_payments_feature_disabled', $summary['value'] );
		$this->assert_contains( 'handlers not ready', $summary['value'] );
		$this->assert_contains( 'permissions not ready', $summary['value'] );
		$this->assert_contains( 'transactions deferred', $summary['value'] );
		$this->assert_contains( 'capture deferred', $summary['value'] );
		$this->assert_contains( 'Square payments Delegated to WooCommerce Square', $summary['value'] );
	}
}
