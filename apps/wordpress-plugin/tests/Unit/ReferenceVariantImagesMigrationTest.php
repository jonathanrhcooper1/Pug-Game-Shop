<?php
/**
 * Reference variant image migration tests.
 *
 * @package TCGStorePlatform
 */

namespace TCGStorePlatform\Tests\Unit;

use TCGStorePlatform\Migrations\Version0014ReferenceVariantImages;
use TCGStorePlatform\Tests\TestCase;

final class ReferenceVariantImagesMigrationTest extends TestCase {
	public function test_migration_metadata_is_versioned_and_reversible(): void {
		$migration = new Version0014ReferenceVariantImages();

		$this->assert_same( 14, $migration->version() );
		$this->assert_same( 'reference_variant_images', $migration->name() );
		$this->assert_same( 64, strlen( $migration->checksum() ) );
	}
}
