<?php
/**
 * TCG Store Platform uninstall handler.
 *
 * @package TCGStorePlatform
 */

defined( 'WP_UNINSTALL_PLUGIN' ) || exit;

if ( PHP_VERSION_ID < 80100 ) {
	return;
}

require_once __DIR__ . '/src/Autoloader.php';

\TCGStorePlatform\Autoloader::register( __DIR__ . '/src' );

$uninstall_site = static function (): void {
	$settings = get_option( \TCGStorePlatform\Settings\Settings::OPTION_NAME, array() );

	\TCGStorePlatform\Auth\RoleManager::uninstall();

	if ( empty( $settings['delete_data_on_uninstall'] ) ) {
		return;
	}

	$runner = new \TCGStorePlatform\Migrations\MigrationRunner();
	$runner->rollback_to( 0 );

	delete_option( \TCGStorePlatform\Settings\Settings::OPTION_NAME );
	delete_option( \TCGStorePlatform\FeatureFlags\FeatureFlags::OPTION_NAME );
	delete_option( \TCGStorePlatform\Migrations\MigrationRunner::VERSION_OPTION );
	delete_option( \TCGStorePlatform\Scheduler\DailyScheduler::SCHEDULE_NEEDED_OPTION );
	delete_option( \TCGStorePlatform\Auth\RoleManager::VERSION_OPTION );
};

if ( is_multisite() ) {
	$site_ids = get_sites( array( 'fields' => 'ids' ) );

	foreach ( $site_ids as $site_id ) {
		switch_to_blog( (int) $site_id );
		$uninstall_site();
		restore_current_blog();
	}
} else {
	$uninstall_site();
}
