<?php
/**
 * ScryDex daily cards refresh readiness planning.
 *
 * @package TCGStorePlatform
 */

namespace TCGStorePlatform\ScryDex;

use TCGStorePlatform\FeatureFlags\FeatureFlags;
use TCGStorePlatform\Settings\ScryDexScheduleSettings;

final class ScryDexScheduledRefreshPlanner {
	/**
	 * @param array<string, mixed> $settings Full platform settings.
	 * @return array<string, mixed>
	 */
	public function plan(
		array $settings,
		bool $scrydex_feature_enabled,
		string $environment_type,
		string $table_prefix
	): array {
		$environment       = $this->environment_type( $environment_type );
		$schedule_status   = ScryDexScheduleSettings::public_status( $settings );
		$feature_available = FeatureFlags::is_available( 'scrydex_sync', $environment );
		$block_reasons     = $this->block_reasons(
			$schedule_status,
			$scrydex_feature_enabled,
			$feature_available,
			$environment,
			$table_prefix
		);
		$ready             = array() === $block_reasons;

		return array(
			'status'                           => $ready ? 'ready' : 'blocked',
			'action'                           => 'scrydex_scheduled_cards_refresh_plan',
			'worker_resource'                  => 'cards',
			'environment_type'                 => $environment,
			'feature_enabled'                  => $scrydex_feature_enabled,
			'feature_available'                => $feature_available,
			'scheduled_refresh_configured'     => true === ( $schedule_status['configured'] ?? false ),
			'production_execution_blocked'     => 'production' === $environment,
			'network_requests_enabled'         => true === ( $schedule_status['network_requests_enabled'] ?? false ),
			'database_writes_enabled'          => true === ( $schedule_status['database_writes_enabled'] ?? false ),
			'execute_database_writes_requested' => true === ( $schedule_status['execute_database_writes'] ?? false ),
			'provider_result_bodies_not_logged' => true,
			'credential_values_redacted'       => true,
			'request'                          => array(
				'game_keys'               => $schedule_status['game_keys'] ?? array(),
				'page_size'               => (int) ( $schedule_status['cards_page_size'] ?? 100 ),
				'max_pages_per_game_run'  => (int) ( $schedule_status['max_pages_per_game_run'] ?? 1 ),
				'execute_database_writes' => true === ( $schedule_status['execute_database_writes'] ?? false ),
			),
			'gate_overrides'                   => array(
				'network_requests_enabled'    => true === ( $schedule_status['network_requests_enabled'] ?? false ),
				'database_writes_enabled'     => true === ( $schedule_status['database_writes_enabled'] ?? false ),
				'scheduled_worker_configured' => true === ( $schedule_status['enabled'] ?? false ),
			),
			'schedule_status'                  => $schedule_status,
			'configuration_issues'             => $block_reasons,
			'block_reasons'                    => $block_reasons,
		);
	}

	/**
	 * @param array<string, mixed> $settings Full platform settings.
	 * @return array{value:string,status:string}
	 */
	public function admin_summary(
		array $settings,
		bool $scrydex_feature_enabled,
		string $environment_type,
		string $table_prefix
	): array {
		$plan = $this->plan( $settings, $scrydex_feature_enabled, $environment_type, $table_prefix );

		return array(
			'value'  => sprintf(
				'%s; %d games; max %d pages/game',
				(string) $plan['environment_type'],
				count( $plan['request']['game_keys'] ?? array() ),
				(int) ( $plan['request']['max_pages_per_game_run'] ?? 1 )
			),
			'status' => 'ready' === $plan['status'] ? 'ready' : 'degraded',
		);
	}

	/**
	 * @param array<string, mixed> $schedule_status Schedule status.
	 * @return list<string>
	 */
	private function block_reasons(
		array $schedule_status,
		bool $feature_enabled,
		bool $feature_available,
		string $environment,
		string $table_prefix
	): array {
		$reasons = array();

		if ( ! $feature_available ) {
			$reasons[] = 'scrydex_sync_unavailable_environment';
		}

		if ( ! $feature_enabled ) {
			$reasons[] = 'scrydex_sync_feature_disabled';
		}

		if ( true !== ( $schedule_status['configured'] ?? false ) ) {
			$issues = $schedule_status['configuration_issues'] ?? array();

			if ( is_array( $issues ) ) {
				foreach ( $issues as $issue ) {
					if ( is_scalar( $issue ) && '' !== trim( (string) $issue ) ) {
						$reasons[] = trim( (string) $issue );
					}
				}
			}
		}

		if ( 'production' === $environment ) {
			$reasons[] = 'scrydex_scheduled_refresh_production_blocked';
		}

		if ( '' === trim( $table_prefix ) || 1 !== preg_match( '/^[A-Za-z0-9_]+$/', $table_prefix ) ) {
			$reasons[] = 'scrydex_scheduled_refresh_database_prefix_invalid';
		}

		return array_values( array_unique( $reasons ) );
	}

	private function environment_type( string $environment_type ): string {
		$environment_type = strtolower( trim( $environment_type ) );

		return in_array( $environment_type, array( 'local', 'development', 'staging', 'production' ), true )
			? $environment_type
			: 'production';
	}
}
