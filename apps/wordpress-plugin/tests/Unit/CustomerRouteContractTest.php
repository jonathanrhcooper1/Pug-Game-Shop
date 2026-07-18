<?php
/**
 * Customer REST route contract tests.
 *
 * @package TCGStorePlatform
 */

namespace TCGStorePlatform\Tests\Unit;

use TCGStorePlatform\Api\V1\CustomerController;
use TCGStorePlatform\Tests\TestCase;

final class CustomerRouteContractTest extends TestCase {
	public function test_customer_upsert_route_is_staff_write_only(): void {
		$contracts = CustomerController::route_contracts();

		$this->assert_same( 1, count( $contracts ) );
		$this->assert_same( 'tcg-store/v1', $contracts[0]['namespace'] );
		$this->assert_same( '/customers', $contracts[0]['path'] );
		$this->assert_same( 'POST', $contracts[0]['method'] );
		$this->assert_same( 'upsert_customer', $contracts[0]['callback'] );
		$this->assert_same( 'manage_customers', $contracts[0]['permission'] );
	}

	public function test_customer_controller_exposes_only_upsert_write_surface(): void {
		$controller = new CustomerController();

		$this->assert_true( method_exists( $controller, 'upsert_customer' ) );
		$this->assert_true( method_exists( $controller, 'can_manage_customers' ) );
		$this->assert_false( method_exists( $controller, 'delete_customer' ) );
		$this->assert_false( method_exists( $controller, 'merge_customers' ) );
	}
}
