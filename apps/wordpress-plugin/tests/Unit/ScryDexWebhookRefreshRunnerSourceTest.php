<?php
/**
 * ScryDex webhook refresh runner source contract tests.
 *
 * @package TCGStorePlatform
 */

namespace TCGStorePlatform\Tests\Unit;

use TCGStorePlatform\Tests\TestCase;

final class ScryDexWebhookRefreshRunnerSourceTest extends TestCase {
	public function test_webhook_refresh_queues_for_lan_without_calling_the_provider_from_wordpress(): void {
		$source = file_get_contents(
			dirname( __DIR__, 2 ) . '/src/ScryDex/ScryDexWebhookRefreshRunner.php'
		);

		$this->assert_true( false !== $source );
		$this->assert_contains( 'mark_ready_for_lan', (string) $source );
		$this->assert_contains( "'source_of_truth'                => 'local_sync_server'", (string) $source );
		$this->assert_contains( "'wordpress_provider_calls'       => 0", (string) $source );
		$this->assert_not_contains( 'run_cards_pages', (string) $source );
		$this->assert_not_contains( 'ScryDexProviderFactory', (string) $source );
	}
}
