<?php
/**
 * Settings page source contract tests.
 *
 * @package TCGStorePlatform
 */

namespace TCGStorePlatform\Tests\Unit;

use TCGStorePlatform\Tests\TestCase;

final class SettingsPageSourceTest extends TestCase {
	public function test_scrydex_settings_support_website_managed_production_credentials(): void {
		$source = $this->settings_page_source();

		foreach (
			array(
				'Configure server-side ScryDex reference-card sync',
				'never sent to local apps',
				'Enable ScryDex catalog sync',
				"'disabled', 'sandbox', 'staging', 'production'",
				'primary_api_key',
				'secondary_api_key',
				'team_id',
				'clear_primary_api_key',
				'clear_secondary_api_key',
				'clear_team_id',
			) as $marker
		) {
			$this->assert_contains( $marker, $source );
		}
	}

	public function test_store_operations_settings_are_exposed_to_managers(): void {
		$source = $this->settings_page_source();

		foreach (
			array(
				'Store operations',
				'Grading companies',
				'Customer credit policy',
				'Fulfillment notifications',
				'Keep customer credit local-store only.',
				'Enable staff audio notification for new pickup orders.',
				'Notification sound file',
				'Upload/select MP3 or MP4',
				'wp_enqueue_media',
				'Test sound',
			) as $marker
		) {
			$this->assert_contains( $marker, $source );
		}
	}

	private function settings_page_source(): string {
		$path = dirname( __DIR__, 2 ) . '/src/Settings/SettingsPage.php';

		$this->assert_true( is_readable( $path ), 'SettingsPage.php must be readable.' );

		return (string) file_get_contents( $path );
	}
}
