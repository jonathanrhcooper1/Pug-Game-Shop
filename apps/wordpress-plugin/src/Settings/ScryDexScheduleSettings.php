<?php
/**
 * ScryDex scheduled refresh settings.
 *
 * @package TCGStorePlatform
 */

namespace TCGStorePlatform\Settings;

final class ScryDexScheduleSettings {
	public const KEY = 'scrydex_schedule';

	/**
	 * @return array<string, mixed>
	 */
	public static function defaults(): array {
		return array(
			'enabled'                   => false,
			'game_keys'                 => array( 'pokemon' ),
			'cards_page_size'           => 100,
			'max_pages_per_game_run'    => 1,
			'network_requests_enabled'  => false,
			'database_writes_enabled'   => false,
			'execute_database_writes'   => false,
		);
	}

	/**
	 * @param array<string, mixed> $settings Full platform settings or schedule settings.
	 * @return array<string, mixed>
	 */
	public static function from_settings( array $settings ): array {
		return self::sanitize( $settings[ self::KEY ] ?? $settings );
	}

	/**
	 * @param mixed                $value Submitted schedule settings.
	 * @param array<string, mixed> $existing Existing stored schedule settings.
	 * @return array<string, mixed>
	 */
	public static function sanitize( mixed $value, array $existing = array() ): array {
		$value    = is_array( $value ) ? $value : array();
		$existing = array_merge( self::defaults(), $existing );

		return array(
			'enabled'                  => ! empty( $value['enabled'] ),
			'game_keys'                => self::game_keys( $value['game_keys'] ?? $existing['game_keys'] ),
			'cards_page_size'          => self::bounded_int(
				$value['cards_page_size'] ?? $existing['cards_page_size'],
				1,
				100
			),
			'max_pages_per_game_run'   => self::bounded_int(
				$value['max_pages_per_game_run'] ?? $existing['max_pages_per_game_run'],
				1,
				25
			),
			'network_requests_enabled' => ! empty( $value['network_requests_enabled'] ),
			'database_writes_enabled'  => ! empty( $value['database_writes_enabled'] ),
			'execute_database_writes'  => ! empty( $value['execute_database_writes'] ),
		);
	}

	/**
	 * @param array<string, mixed> $settings Full platform settings or schedule settings.
	 * @return array<string, mixed>
	 */
	public static function public_status( array $settings ): array {
		$settings   = self::from_settings( $settings );
		$issues     = array();
		$game_keys  = $settings['game_keys'];
		$configured = true === $settings['enabled']
			&& array() !== $game_keys
			&& true === $settings['network_requests_enabled']
			&& true === $settings['database_writes_enabled']
			&& true === $settings['execute_database_writes'];

		if ( true !== $settings['enabled'] ) {
			$issues[] = 'scrydex_scheduled_refresh_disabled';
		}

		if ( array() === $game_keys ) {
			$issues[] = 'scrydex_schedule_game_keys_missing';
		}

		if ( true !== $settings['network_requests_enabled'] ) {
			$issues[] = 'scrydex_scheduled_network_requests_disabled';
		}

		if ( true !== $settings['database_writes_enabled'] ) {
			$issues[] = 'scrydex_scheduled_database_writes_disabled';
		}

		if ( true !== $settings['execute_database_writes'] ) {
			$issues[] = 'scrydex_scheduled_execution_not_confirmed';
		}

		return array(
			'configured'                  => $configured,
			'status'                      => $configured ? 'ready' : 'blocked',
			'enabled'                     => true === $settings['enabled'],
			'game_keys'                   => $game_keys,
			'cards_page_size'             => (int) $settings['cards_page_size'],
			'max_pages_per_game_run'      => (int) $settings['max_pages_per_game_run'],
			'network_requests_enabled'    => true === $settings['network_requests_enabled'],
			'database_writes_enabled'     => true === $settings['database_writes_enabled'],
			'execute_database_writes'     => true === $settings['execute_database_writes'],
			'provider_result_bodies_not_logged' => true,
			'credential_values_redacted'  => true,
			'configuration_issues'        => array_values( array_unique( $issues ) ),
		);
	}

	/**
	 * @param array<string, mixed> $settings Full platform settings or schedule settings.
	 * @return array{value:string,status:string}
	 */
	public static function admin_summary( array $settings ): array {
		$status = self::public_status( $settings );

		return array(
			'value'  => sprintf(
				'%s; games %s; %d/page; max %d pages; %s',
				true === $status['enabled'] ? 'enabled' : 'disabled',
				implode( ', ', $status['game_keys'] ),
				(int) $status['cards_page_size'],
				(int) $status['max_pages_per_game_run'],
				true === $status['execute_database_writes'] ? 'writes confirmed' : 'writes deferred'
			),
			'status' => true === $status['configured'] ? 'ready' : 'degraded',
		);
	}

	/**
	 * @return list<string>
	 */
	private static function game_keys( mixed $value ): array {
		if ( is_string( $value ) ) {
			$value = preg_split( '/[\s,]+/', $value );
		}

		if ( ! is_array( $value ) ) {
			return array();
		}

		$keys = array();
		foreach ( $value as $key ) {
			if ( ! is_scalar( $key ) ) {
				continue;
			}

			$key = strtolower( trim( (string) $key ) );
			$key = preg_replace( '/[^a-z0-9_-]+/', '-', $key ) ?? '';
			$key = trim( $key, '-' );

			if ( '' !== $key ) {
				$keys[] = $key;
			}
		}

		return array_values( array_unique( $keys ) );
	}

	private static function bounded_int( mixed $value, int $min, int $max ): int {
		return max( $min, min( $max, (int) $value ) );
	}

	private function __construct() {
	}
}
