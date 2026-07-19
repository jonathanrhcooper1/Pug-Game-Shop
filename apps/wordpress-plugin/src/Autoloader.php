<?php
/**
 * Lightweight PSR-4 autoloader used when Composer is not bundled.
 *
 * @package TCGStorePlatform
 */

namespace TCGStorePlatform;

final class Autoloader {
	private const PREFIX = 'TCGStorePlatform\\';

	/**
	 * Register the plugin namespace.
	 *
	 * @param string $source_directory Absolute source directory.
	 */
	public static function register( string $source_directory ): void {
		$source_directory = rtrim( $source_directory, '/\\' );

		spl_autoload_register(
			static function ( string $class_name ) use ( $source_directory ): void {
				if ( 0 !== strpos( $class_name, self::PREFIX ) ) {
					return;
				}

				$relative_class = substr( $class_name, strlen( self::PREFIX ) );
				$file           = $source_directory . DIRECTORY_SEPARATOR
					. str_replace( '\\', DIRECTORY_SEPARATOR, $relative_class )
					. '.php';

				if ( is_readable( $file ) ) {
					require_once $file;
				}
			}
		);
	}
}
