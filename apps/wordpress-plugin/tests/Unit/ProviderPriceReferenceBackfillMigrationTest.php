<?php
/**
 * Provider price reference backfill migration tests.
 *
 * @package TCGStorePlatform
 */

namespace TCGStorePlatform\Tests\Unit;

use TCGStorePlatform\Migrations\Version0015ProviderPriceReferenceBackfill;
use TCGStorePlatform\Tests\TestCase;

final class ProviderPriceReferenceBackfillMigrationTest extends TestCase {
	public function test_migration_metadata_is_versioned_and_non_destructive(): void {
		$migration = new Version0015ProviderPriceReferenceBackfill();

		$this->assert_same( 15, $migration->version() );
		$this->assert_same( 'provider_price_reference_backfill', $migration->name() );
		$this->assert_same( 64, strlen( $migration->checksum() ) );
	}
}
