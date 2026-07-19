<?php
/**
 * Absolute inventory projection quantity migration tests.
 *
 * @package TCGStorePlatform
 */

namespace TCGStorePlatform\Tests\Unit;

use TCGStorePlatform\Migrations\Version0017InventoryProjectionQuantity;
use TCGStorePlatform\Tests\TestCase;

final class InventoryProjectionQuantityMigrationTest extends TestCase {
	public function test_quantity_migration_is_versioned_and_reversible(): void {
		$migration = new Version0017InventoryProjectionQuantity();
		$source    = file_get_contents( dirname( __DIR__, 2 ) . '/src/Migrations/Version0017InventoryProjectionQuantity.php' );

		$this->assert_same( 17, $migration->version() );
		$this->assert_same( 'inventory_projection_quantity', $migration->name() );
		$this->assert_true( false !== $source );
		$this->assert_contains( 'ADD quantity_on_hand', (string) $source );
		$this->assert_contains( 'ADD KEY projection_quantity', (string) $source );
		$this->assert_contains( 'DROP COLUMN quantity_on_hand', (string) $source );
	}
}
