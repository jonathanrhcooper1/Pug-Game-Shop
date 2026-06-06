<?php
/**
 * Plugin deactivation.
 *
 * @package TCGStorePlatform
 */

namespace TCGStorePlatform\Bootstrap;

use TCGStorePlatform\Scheduler\DailyScheduler;

final class Deactivator {
	/**
	 * Remove temporary scheduled work while retaining business data.
	 *
	 * @param bool $network_wide Whether the plugin is network deactivated.
	 */
	public static function deactivate( bool $network_wide = false ): void {
		if ( is_multisite() && $network_wide ) {
			$site_ids = get_sites( array( 'fields' => 'ids' ) );

			foreach ( $site_ids as $site_id ) {
				switch_to_blog( (int) $site_id );
				DailyScheduler::unschedule();
				restore_current_blog();
			}

			return;
		}

		DailyScheduler::unschedule();
	}
}
