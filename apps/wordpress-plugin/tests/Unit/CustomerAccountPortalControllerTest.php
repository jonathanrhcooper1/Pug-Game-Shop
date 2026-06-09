<?php
/**
 * Customer account portal controller tests.
 *
 * @package TCGStorePlatform
 */

namespace TCGStorePlatform\Tests\Unit;

use TCGStorePlatform\Tests\TestCase;
use TCGStorePlatform\WooCommerce\CustomerAccountPortalController;

final class CustomerAccountPortalControllerTest extends TestCase {
	public function test_controller_contract_registers_single_my_account_endpoint(): void {
		$this->assert_same( 'pug-portal', CustomerAccountPortalController::ENDPOINT );

		$contracts = CustomerAccountPortalController::hook_contracts();
		$map       = array();

		foreach ( $contracts as $contract ) {
			$map[ $contract['type'] . ' ' . $contract['hook'] ] = $contract['callback'];
		}

		$this->assert_same( 'register_endpoint', $map['action init'] );
		$this->assert_same( 'register_query_var', $map['filter query_vars'] );
		$this->assert_same( 'add_menu_item', $map['filter woocommerce_account_menu_items'] );
		$this->assert_same( 'render_endpoint', $map['action woocommerce_account_pug-portal_endpoint'] );
	}

	public function test_query_var_is_idempotently_added(): void {
		$controller = new CustomerAccountPortalController();

		$this->assert_same(
			array( 'orders', 'pug-portal' ),
			$controller->register_query_var( array( 'orders' ) )
		);

		$this->assert_same(
			array( 'orders', 'pug-portal' ),
			$controller->register_query_var( array( 'orders', 'pug-portal' ) )
		);
	}

	public function test_menu_item_is_inserted_before_logout(): void {
		$controller = new CustomerAccountPortalController();

		$items = $controller->add_menu_item(
			array(
				'dashboard'       => 'Dashboard',
				'orders'          => 'Orders',
				'customer-logout' => 'Log out',
			)
		);

		$this->assert_same(
			array( 'dashboard', 'orders', 'pug-portal', 'customer-logout' ),
			array_keys( $items )
		);
		$this->assert_same( 'Pug Portal', $items['pug-portal'] );
	}
}
