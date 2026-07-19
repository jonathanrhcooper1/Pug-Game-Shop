<?php
/**
 * LAN inventory projection endpoint contract tests.
 *
 * @package TCGStorePlatform
 */

namespace TCGStorePlatform\Tests\Unit;

use TCGStorePlatform\Tests\TestCase;

final class InventoryProjectionControllerContractTest extends TestCase {
	public function test_projection_route_is_authenticated_and_uses_absolute_quantity(): void {
		$controller = file_get_contents( dirname( __DIR__, 2 ) . '/src/Api/V1/InventoryProjectionController.php' );
		$repository = file_get_contents( dirname( __DIR__, 2 ) . '/src/Inventory/InventoryProjectionRepository.php' );

		$this->assert_true( false !== $controller );
		$this->assert_true( false !== $repository );
		$this->assert_contains( '/inventory-projections/', (string) $controller );
		$this->assert_contains( "current_user_can( 'edit_inventory' )", (string) $controller );
		$this->assert_contains( 'quantity_on_hand', (string) $repository );
		$this->assert_contains( 'sale_price_below_minimum', (string) $repository );
		$this->assert_contains( 'row_version` = `row_version` + 1', (string) $repository );
		$this->assert_contains( 'START TRANSACTION', (string) $repository );
		$this->assert_not_contains( 'authorization', strtolower( (string) $controller ) );
	}
}
