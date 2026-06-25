<?php
/**
 * Plugin activation.
 *
 * @package TCGStorePlatform
 */

namespace TCGStorePlatform\Bootstrap;

use TCGStorePlatform\Auth\RoleManager;
use TCGStorePlatform\FeatureFlags\FeatureFlags;
use TCGStorePlatform\Migrations\MigrationRunner;
use TCGStorePlatform\Scheduler\DailyScheduler;
use TCGStorePlatform\Settings\Settings;

final class Activator {
	/**
	 * Activate one site or every site in a network activation.
	 *
	 * @param bool $network_wide Whether the plugin is network activated.
	 */
	public static function activate( bool $network_wide = false ): void {
		DependencyChecker::assert_activation_requirements();

		if ( is_multisite() && $network_wide ) {
			$site_ids = get_sites( array( 'fields' => 'ids' ) );

			foreach ( $site_ids as $site_id ) {
				switch_to_blog( (int) $site_id );
				self::activate_site();
				restore_current_blog();
			}

			return;
		}

		self::activate_site();
	}

	private static function activate_site(): void {
		$runner = new MigrationRunner();
		$runner->migrate();

		RoleManager::install();
		Settings::install_defaults();
		FeatureFlags::install_defaults();

		update_option( DailyScheduler::SCHEDULE_NEEDED_OPTION, 1, false );
	}
}
