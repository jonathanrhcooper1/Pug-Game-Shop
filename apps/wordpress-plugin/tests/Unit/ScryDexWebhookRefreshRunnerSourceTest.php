<?php
/**
 * ScryDex webhook refresh runner source contract tests.
 *
 * @package TCGStorePlatform
 */

namespace TCGStorePlatform\Tests\Unit;

use TCGStorePlatform\Tests\TestCase;

final class ScryDexWebhookRefreshRunnerSourceTest extends TestCase {
	public function test_webhook_refresh_runs_notified_expansion_until_provider_pagination_ends(): void {
		$source = file_get_contents(
			dirname( __DIR__, 2 ) . '/src/ScryDex/ScryDexWebhookRefreshRunner.php'
		);

		$this->assert_true( false !== $source );
		$this->assert_contains( "'expansion_id'            => \$expansion_id", (string) $source );
		$this->assert_contains( "'max_pages'               => 0", (string) $source );
		$this->assert_not_contains( "'max_pages'               => (int) ( \$schedule_status['max_pages_per_game_run'] ?? 1 )", (string) $source );
	}
}
