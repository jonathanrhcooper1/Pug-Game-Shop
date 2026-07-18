<?php
/**
 * Buylist REST route contract tests.
 *
 * @package TCGStorePlatform
 */

namespace TCGStorePlatform\Tests\Unit;

use TCGStorePlatform\Api\V1\BuylistRouteContracts;
use TCGStorePlatform\Tests\TestCase;

final class BuylistRouteContractTest extends TestCase {
	public function test_buylist_routes_are_planned_but_not_live_by_default(): void {
		$routes = BuylistRouteContracts::route_contracts();

		$this->assert_same( 7, count( $routes ) );

		foreach ( $routes as $route ) {
			$this->assert_same( 'tcg-store/v1', $route['namespace'] );
			$this->assert_false( $route['live_enabled_by_default'] );
		}
	}

	public function test_buylist_route_contracts_match_documented_permissions(): void {
		$this->assert_same(
			array(
				'POST /buylist/submissions'                                              => 'public_or_staff_intake',
				'GET /buylist/submissions'                                               => 'approve_buylist',
				'GET /buylist/submissions/(?P<submission_id>\d+)'                        => 'owner_token_or_staff',
				'POST /buylist/submissions/(?P<submission_id>\d+)/review'                => 'approve_buylist',
				'POST /buylist/submissions/(?P<submission_id>\d+)/offer'                 => 'approve_buylist',
				'POST /buylist/submissions/(?P<submission_id>\d+)/accept'                => 'owner_token_or_staff',
				'POST /buylist/items/(?P<buylist_item_id>\d+)/convert-to-inventory'      => 'create_inventory',
			),
			$this->permission_map()
		);
	}

	/**
	 * @return array<string, string>
	 */
	private function permission_map(): array {
		$map = array();

		foreach ( BuylistRouteContracts::route_contracts() as $route ) {
			$map[ $route['method'] . ' ' . $route['path'] ] = $route['permission'];
		}

		return $map;
	}
}
