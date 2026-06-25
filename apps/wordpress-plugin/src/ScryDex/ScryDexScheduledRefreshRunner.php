<?php
/**
 * ScryDex scheduled cards refresh runner.
 *
 * @package TCGStorePlatform
 */

namespace TCGStorePlatform\ScryDex;

use TCGStorePlatform\FeatureFlags\FeatureFlags;
use TCGStorePlatform\Logging\Logger;
use TCGStorePlatform\Settings\Settings;

final class ScryDexScheduledRefreshRunner {
	private ScryDexScheduledRefreshPlanner $planner;

	public function __construct( private Logger $logger, ?ScryDexScheduledRefreshPlanner $planner = null ) {
		$this->planner = $planner ?? new ScryDexScheduledRefreshPlanner();
	}

	public function register(): void {
		add_action( 'tcg_store_platform_daily_dispatch', array( $this, 'run' ), 20 );
	}

	/**
	 * @return array<string, mixed>
	 */
	public function run(): array {
		$settings = Settings::all();
		$plan     = $this->planner->plan(
			$settings,
			FeatureFlags::is_enabled( 'scrydex_sync' ),
			$this->environment_type(),
			$this->database_prefix()
		);

		if ( 'ready' !== $plan['status'] ) {
			$this->logger->warning( 'scrydex.daily_refresh_blocked', $plan );

			return array(
				'status' => 'blocked',
				'action' => 'scrydex_scheduled_cards_refresh_run',
				'plan'   => $plan,
				'runs'   => array(),
			);
		}

		$worker  = $this->worker( $settings );
		$request = $plan['request'];
		$runs    = array();

		foreach ( $request['game_keys'] as $game_key ) {
			$runs[] = $worker->run_cards_pages(
				array(
					'game'                    => $game_key,
					'page_size'               => (int) $request['page_size'],
					'max_pages'               => (int) $request['max_pages_per_game_run'],
					'execute_database_writes' => true === $request['execute_database_writes'],
				),
				array(),
				$plan['gate_overrides']
			);
		}

		$result = array(
			'status' => $this->status( $runs ),
			'action' => 'scrydex_scheduled_cards_refresh_run',
			'plan'   => $plan,
			'runs'   => $runs,
		);

		if ( 'completed' === $result['status'] ) {
			$this->logger->info( 'scrydex.daily_refresh_completed', $this->summary( $result ) );
		} else {
			$this->logger->warning( 'scrydex.daily_refresh_attention_required', $this->summary( $result ) );
		}

		return $result;
	}

	/**
	 * @param list<array<string, mixed>> $runs Worker run results.
	 */
	private function status( array $runs ): string {
		if ( array() === $runs ) {
			return 'blocked';
		}

		$has_page_limit = false;
		foreach ( $runs as $run ) {
			$status = (string) ( $run['status'] ?? 'blocked' );

			if ( 'completed' === $status ) {
				continue;
			}

			if ( 'page_limit_reached' === $status ) {
				$has_page_limit = true;
				continue;
			}

			return 'attention_required';
		}

		return $has_page_limit ? 'continuation_available' : 'completed';
	}

	/**
	 * @param array<string, mixed> $settings Full platform settings.
	 */
	private function worker( array $settings ): ScryDexCardsSyncWorker {
		$table_prefix = $this->database_prefix();
		$database     = $this->database();
		$factory      = new ScryDexProviderFactory( $settings );
		$gate         = new ScryDexSyncExecutionGate(
			new ScryDexSyncDryRunPlanner( $factory ),
			new ScryDexUsageBudgetPlanner( $settings ),
			new ScryDexSyncCheckpointRepositoryPlanner( $table_prefix ),
			new ScryDexPersistenceRepositoryReadinessPlanner( $table_prefix )
		);
		$planner      = new ScryDexCardsSyncWorkerPlanner(
			$table_prefix,
			$gate,
			null,
			null,
			null,
			new ScryDexPersistenceRepository( $database )
		);

		return new ScryDexCardsSyncWorker( $table_prefix, $factory, $gate, $planner );
	}

	private function database(): ?\wpdb {
		global $wpdb;

		return is_object( $wpdb ) && class_exists( '\wpdb' ) && $wpdb instanceof \wpdb ? $wpdb : null;
	}

	private function database_prefix(): string {
		$database = $this->database();

		return null === $database ? '' : (string) $database->prefix;
	}

	private function environment_type(): string {
		if ( function_exists( 'wp_get_environment_type' ) ) {
			return (string) wp_get_environment_type();
		}

		$environment_type = getenv( 'WP_ENVIRONMENT_TYPE' );

		return is_string( $environment_type ) && '' !== trim( $environment_type )
			? $environment_type
			: 'production';
	}

	/**
	 * @param array<string, mixed> $result Run result.
	 * @return array<string, mixed>
	 */
	private function summary( array $result ): array {
		$runs                 = is_array( $result['runs'] ?? null ) ? $result['runs'] : array();
		$provider_requests    = 0;
		$page_count           = 0;
		$continuation_pending = false;

		foreach ( $runs as $run ) {
			if ( ! is_array( $run ) ) {
				continue;
			}

			$provider_requests    += (int) ( $run['provider_request_count'] ?? 0 );
			$page_count           += (int) ( $run['page_count'] ?? 0 );
			$continuation_pending = $continuation_pending || true === ( $run['continuation_available'] ?? false );
		}

		return array(
			'status'                       => (string) ( $result['status'] ?? 'unknown' ),
			'game_count'                   => count( $runs ),
			'page_count'                   => $page_count,
			'provider_request_count'       => $provider_requests,
			'continuation_available'       => $continuation_pending,
			'credential_values_redacted'   => true,
			'provider_bodies_not_logged'   => true,
		);
	}
}
