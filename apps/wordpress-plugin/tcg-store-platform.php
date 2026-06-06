<?php
/**
 * Plugin Name:       TCG Store Platform
 * Description:       Serialized trading-card inventory and store operations for WooCommerce.
 * Version:           0.13.0
 * Requires at least: 6.5
 * Requires PHP:      8.1
 * WC requires at least: 8.2
 * Text Domain:       tcg-store-platform
 * Domain Path:       /languages
 *
 * @package TCGStorePlatform
 */

defined( 'ABSPATH' ) || exit;

define( 'TCG_STORE_PLATFORM_FILE', __FILE__ );
define( 'TCG_STORE_PLATFORM_DIR', __DIR__ );
define( 'TCG_STORE_PLATFORM_BASENAME', plugin_basename( __FILE__ ) );

if ( PHP_VERSION_ID < 80100 ) {
	add_action(
		'admin_notices',
		static function (): void {
			echo '<div class="notice notice-error"><p>';
			echo esc_html__( 'TCG Store Platform requires PHP 8.1 or newer.', 'tcg-store-platform' );
			echo '</p></div>';
		}
	);
	return;
}

require_once TCG_STORE_PLATFORM_DIR . '/src/Autoloader.php';

\TCGStorePlatform\Autoloader::register( TCG_STORE_PLATFORM_DIR . '/src' );

register_activation_hook( __FILE__, array( \TCGStorePlatform\Bootstrap\Activator::class, 'activate' ) );
register_deactivation_hook( __FILE__, array( \TCGStorePlatform\Bootstrap\Deactivator::class, 'deactivate' ) );

add_action(
	'before_woocommerce_init',
	static function (): void {
		\TCGStorePlatform\WooCommerce\Compatibility::declare( TCG_STORE_PLATFORM_FILE );
	}
);

\TCGStorePlatform\Bootstrap\Plugin::instance()->boot();
