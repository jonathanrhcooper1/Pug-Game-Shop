<?php
/**
 * Verify that the main plugin file can register itself in a minimal WP shell.
 *
 * @package TCGStorePlatform
 */

declare(strict_types=1);

define( 'ABSPATH', __DIR__ . DIRECTORY_SEPARATOR );

/**
 * @return string
 */
function plugin_basename( string $file ): string {
	return basename( $file );
}

/**
 * @param mixed $callback Callback.
 */
function add_action( string $hook, mixed $callback, int $priority = 10, int $accepted_args = 1 ): bool {
	unset( $hook, $callback, $priority, $accepted_args );

	return true;
}

/**
 * @param mixed $callback Callback.
 */
function register_activation_hook( string $file, mixed $callback ): void {
	unset( $file, $callback );
}

/**
 * @param mixed $callback Callback.
 */
function register_deactivation_hook( string $file, mixed $callback ): void {
	unset( $file, $callback );
}

require dirname( __DIR__ ) . '/tcg-store-platform.php';

if ( ! class_exists( \TCGStorePlatform\Bootstrap\Plugin::class ) ) {
	fwrite( STDERR, "Plugin bootstrap class was not loaded.\n" );
	exit( 1 );
}

echo "PASS plugin bootstrap smoke test\n";
