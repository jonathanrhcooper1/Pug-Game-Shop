<?php
/**
 * POS/payment REST route contract tests.
 *
 * @package TCGStorePlatform
 */

namespace TCGStorePlatform\Tests\Unit;

use TCGStorePlatform\Api\V1\PosPaymentRouteContracts;
use TCGStorePlatform\Tests\TestCase;

final class PosPaymentRouteContractTest extends TestCase {
	public function test_pos_payment_routes_are_planned_but_not_live_by_default(): void {
		$routes = PosPaymentRouteContracts::route_contracts();

		$this->assert_same( 8, count( $routes ) );

		foreach ( $routes as $route ) {
			$this->assert_same( 'tcg-store/v1', $route['namespace'] );
			$this->assert_false( $route['live_enabled_by_default'] );
			$this->assert_true( $route['route_registration_deferred'] );
			$this->assert_true( $route['route_connected_writes_deferred'] );
			$this->assert_true( $route['provider_capture_deferred'] );
			$this->assert_true( $route['provider_inventory_write_deferred'] );
			$this->assert_true( $route['webhook_registration_deferred'] );
			$this->assert_true( $route['woocommerce_gateway_capture_deferred'] );
		}
	}

	public function test_pos_payment_route_contracts_match_documented_permissions(): void {
		$this->assert_same(
			array(
				'POST /pos/events'                                             => 'manage_pos',
				'GET /pos/events/(?P<provider_event_id>[a-zA-Z0-9:_-]+)'       => 'manage_pos',
				'POST /pos/reconciliation/run'                                 => 'manage_pos',
				'GET /pos/reconciliation/conflicts'                            => 'resolve_conflicts',
				'POST /pos/reconciliation/conflicts/(?P<conflict_id>\d+)/resolve' => 'resolve_conflicts',
				'POST /payments/webhooks/(?P<provider>[a-zA-Z0-9_-]+)'         => 'signed_provider_webhook',
				'GET /payments/fee-snapshots'                                  => 'manage_settings',
				'POST /payments/fee-snapshots'                                 => 'manage_settings',
			),
			$this->permission_map()
		);
	}

	public function test_pos_payment_routes_have_unique_workflow_labels(): void {
		$seen = array();

		foreach ( PosPaymentRouteContracts::route_contracts() as $route ) {
			$workflow = (string) $route['workflow'];
			$this->assert_false( isset( $seen[ $workflow ] ), "Duplicate workflow: {$workflow}" );
			$seen[ $workflow ] = true;
		}

		$this->assert_same( 8, count( $seen ) );
	}

	/**
	 * @return array<string, string>
	 */
	private function permission_map(): array {
		$map = array();

		foreach ( PosPaymentRouteContracts::route_contracts() as $route ) {
			$map[ $route['method'] . ' ' . $route['path'] ] = $route['permission'];
		}

		return $map;
	}
}
