<?php
/**
 * External inventory mapping migration tests.
 *
 * @package TCGStorePlatform
 */

namespace TCGStorePlatform\Tests\Unit;

use TCGStorePlatform\Migrations\Version0013ExternalInventoryMappings;
use TCGStorePlatform\Tests\TestCase;

final class ExternalInventoryMappingsMigrationTest extends TestCase {
	public function test_migration_metadata_is_versioned_and_reversible(): void {
		$migration = new Version0013ExternalInventoryMappings();

		$this->assert_same( 13, $migration->version() );
		$this->assert_same( 'external_inventory_mappings', $migration->name() );
		$this->assert_same( 64, strlen( $migration->checksum() ) );
	}
}
