<?php
/**
 * Customer credit REST route contract tests.
 *
 * @package TCGStorePlatform
 */

namespace TCGStorePlatform\Tests\Unit;

use TCGStorePlatform\Api\V1\CustomerCreditRouteContracts;
use TCGStorePlatform\Tests\TestCase;

final class CustomerCreditRouteContractTest extends TestCase {
	public function test_customer_credit_routes_are_planned_but_not_live_by_default(): void {
		$routes = CustomerCreditRouteContracts::route_contracts();

		$this->assert_same( 4, count( $routes ) );

		foreach ( $routes as $route ) {
			$this->assert_same( 'tcg-store/v1', $route['namespace'] );
			$this->assert_false( $route['live_enabled_by_default'] );
		}
	}

	public function test_customer_credit_route_contracts_match_documented_permissions(): void {
		$this->assert_same(
			array(
				'GET /customers/(?P<customer_id>\d+)/credit'        => 'view_credit',
				'GET /customers/(?P<customer_id>\d+)/ledger'        => 'view_credit',
				'POST /customers/(?P<customer_id>\d+)/credit/adjust' => 'adjust_credit',
				'POST /customers/(?P<customer_id>\d+)/credit/redeem' => 'redeem_credit',
			),
			$this->permission_map()
		);
	}

	/**
	 * @return array<string, string>
	 */
	private function permission_map(): array {
		$map = array();

		foreach ( CustomerCreditRouteContracts::route_contracts() as $route ) {
			$map[ $route['method'] . ' ' . $route['path'] ] = $route['permission'];
		}

		return $map;
	}
}
