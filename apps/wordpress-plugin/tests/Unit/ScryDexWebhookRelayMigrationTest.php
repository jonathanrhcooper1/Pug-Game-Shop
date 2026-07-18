<?php
/**
 * ScryDex webhook LAN relay migration contract tests.
 *
 * @package TCGStorePlatform
 */

namespace TCGStorePlatform\Tests\Unit;

use TCGStorePlatform\Migrations\Version0016ScryDexWebhookRelay;
use TCGStorePlatform\Tests\TestCase;

final class ScryDexWebhookRelayMigrationTest extends TestCase {
	public function test_migration_is_versioned_and_reversible(): void {
		$migration = new Version0016ScryDexWebhookRelay();
		$source    = file_get_contents(
			dirname( __DIR__, 2 ) . '/src/Migrations/Version0016ScryDexWebhookRelay.php'
		);

		$this->assert_same( 16, $migration->version() );
		$this->assert_same( 'scrydex_webhook_lan_relay', $migration->name() );
		$this->assert_true( false !== $source );
		$this->assert_contains( 'ADD relay_attempt_count', (string) $source );
		$this->assert_contains( 'ADD KEY relay_ready', (string) $source );
		$this->assert_contains( 'DROP COLUMN relay_attempt_count', (string) $source );
	}
}
