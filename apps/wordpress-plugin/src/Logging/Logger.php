<?php
/**
 * Structured application logger.
 *
 * @package TCGStorePlatform
 */

namespace TCGStorePlatform\Logging;

use TCGStorePlatform\Settings\Settings;
use TCGStorePlatform\Version;

final class Logger {
	private const LEVELS = array(
		'debug'   => 10,
		'info'    => 20,
		'warning' => 30,
		'error'   => 40,
	);

	public function debug( string $event, array $context = array() ): void {
		$this->log( 'debug', $event, $context );
	}

	public function info( string $event, array $context = array() ): void {
		$this->log( 'info', $event, $context );
	}

	public function warning( string $event, array $context = array() ): void {
		$this->log( 'warning', $event, $context );
	}

	public function error( string $event, array $context = array() ): void {
		$this->log( 'error', $event, $context );
	}

	public function log( string $level, string $event, array $context = array() ): void {
		if ( ! $this->should_log( $level ) ) {
			return;
		}

		$entry = array(
			'timestamp'      => gmdate( 'c' ),
			'level'          => $level,
			'event'          => $event,
			'plugin_version' => Version::PLUGIN,
			'request_id'     => $this->request_id(),
			'context'        => Redactor::redact( $context ),
		);

		$json = function_exists( 'wp_json_encode' )
			? wp_json_encode( $entry, JSON_UNESCAPED_SLASHES )
			: json_encode( $entry, JSON_UNESCAPED_SLASHES );

		if ( false === $json ) {
			return;
		}

		error_log( '[tcg-store-platform] ' . $json ); // phpcs:ignore WordPress.PHP.DevelopmentFunctions.error_log_error_log
		do_action( 'tcg_store_platform_log', $entry );
	}

	private function should_log( string $level ): bool {
		$configured = (string) Settings::get( 'logging_level', 'warning' );
		$threshold  = self::LEVELS[ $configured ] ?? self::LEVELS['warning'];
		$current    = self::LEVELS[ $level ] ?? self::LEVELS['warning'];

		return $current >= $threshold;
	}

	private function request_id(): string {
		static $request_id = null;

		if ( null === $request_id ) {
			$request_id = function_exists( 'wp_generate_uuid4' )
				? wp_generate_uuid4()
				: bin2hex( random_bytes( 16 ) );
		}

		return $request_id;
	}
}
