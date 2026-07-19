<?php
/**
 * Reference card image migration tests.
 *
 * @package TCGStorePlatform
 */

namespace TCGStorePlatform\Tests\Unit;

use TCGStorePlatform\Migrations\Version0011ReferenceCardImages;
use TCGStorePlatform\Tests\TestCase;

final class ReferenceCardImagesMigrationTest extends TestCase {
	public function test_migration_metadata_is_versioned_and_reversible(): void {
		$migration = new Version0011ReferenceCardImages();

		$this->assert_same( 11, $migration->version() );
		$this->assert_same( 'reference_card_images', $migration->name() );
		$this->assert_same( 64, strlen( $migration->checksum() ) );
	}
}
