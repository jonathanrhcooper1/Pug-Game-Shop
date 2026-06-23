<?php
/**
 * ScryDex webhook-triggered targeted refresh runner.
 *
 * @package TCGStorePlatform
 */

namespace TCGStorePlatform\ScryDex;

use TCGStorePlatform\FeatureFlags\FeatureFlags;
use TCGStorePlatform\Logging\Logger;
use TCGStorePlatform\Settings\ScryDexScheduleSettings;
use TCGStorePlatform\Settings\Settings;

final class ScryDexWebhookRefreshRunner {
	public function __construct( private Logger $logger ) {
	}

	public function register(): void {
		add_action( ScryDexWebhookSyncDispatcher::ACTION, array( $this, 'run' ), 10, 1 );
	}

	/**
	 * @param array<string, mixed> $payload Scheduled webhook payload.
	 * @return array<string, mixed>
	 */
	public function run( array $payload ): array {
		$settings        = Settings::all();
		$schedule_status = ScryDexScheduleSettings::public_status( $settings );
		$expansion_ids   = $this->string_list( $payload['expansion_ids'] ?? array() );
		$block_reasons   = $this->block_reasons( $payload, $schedule_status, $expansion_ids );

		if ( array() !== $block_reasons ) {
			$result = array(
				'status'                     => 'blocked',
				'action'                     => 'scrydex_webhook_targeted_refresh_run',
				'event_id'                   => (string) ( $payload['event_id'] ?? '' ),
				'event_name'                 => (string) ( $payload['event_name'] ?? '' ),
				'game'                       => (string) ( $payload['game'] ?? '' ),
				'expansion_ids'              => $expansion_ids,
				'credential_values_redacted' => true,
				'block_reasons'              => $block_reasons,
				'runs'                       => array(),
			);

			$this->logger->warning( 'scrydex.webhook_refresh_blocked', $result );

			return $result;
		}

		$worker         = $this->worker( $settings );
		$gate_overrides = array(
			'network_requests_enabled'    => true === ( $schedule_status['network_requests_enabled'] ?? false ),
			'database_writes_enabled'     => true === ( $schedule_status['database_writes_enabled'] ?? false ),
			'scheduled_worker_configured' => true === ( $schedule_status['enabled'] ?? false ),
		);
		$runs           = array();

		foreach ( $expansion_ids as $expansion_id ) {
			$runs[] = $worker->run_cards_pages(
				array(
					'game'                    => (string) $payload['game'],
					'expansion_id'            => $expansion_id,
					'page_size'               => (int) ( $schedule_status['cards_page_size'] ?? 100 ),
					'max_pages'               => 0,
					'execute_database_writes' => true === ( $schedule_status['execute_database_writes'] ?? false ),
				),
				array(),
				$gate_overrides
			);
		}

		$result = array(
			'status'                         => $this->status( $runs ),
			'action'                         => 'scrydex_webhook_targeted_refresh_run',
			'event_id'                       => (string) ( $payload['event_id'] ?? '' ),
			'event_name'                     => (string) ( $payload['event_name'] ?? '' ),
			'game'                           => (string) ( $payload['game'] ?? '' ),
			'update_type'                    => (string) ( $payload['update_type'] ?? '' ),
			'expansion_ids'                  => $expansion_ids,
			'targeted_expansion_sync'        => true,
			'full_catalog_polling_requested' => false,
			'credential_values_redacted'     => true,
			'runs'                           => $runs,
		);

		$this->logger->info( 'scrydex.webhook_refresh_completed', $this->summary( $result ) );

		return $result;
	}

	/**
	 * @param list<array<string, mixed>> $runs Worker run results.
	 */
	private function status( array $runs ): string {
		if ( array() === $runs ) {
			return 'blocked';
		}

		foreach ( $runs as $run ) {
			if ( ! in_array( (string) ( $run['status'] ?? '' ), array( 'completed', 'page_limit_reached' ), true ) ) {
				return 'attention_required';
			}
		}

		return 'completed';
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

	/**
	 * @param array<string, mixed> $payload Scheduled webhook payload.
	 * @param array<string, mixed> $schedule_status ScryDex schedule status.
	 * @param list<string>         $expansion_ids Expansion IDs.
	 * @return list<string>
	 */
	private function block_reasons( array $payload, array $schedule_status, array $expansion_ids ): array {
		$reasons = array();

		if ( ! FeatureFlags::is_enabled( 'scrydex_sync' ) ) {
			$reasons[] = 'scrydex_sync_feature_disabled';
		}

		if ( '' === trim( (string) ( $payload['game'] ?? '' ) ) ) {
			$reasons[] = 'scrydex_webhook_game_missing';
		}

		if ( array() === $expansion_ids ) {
			$reasons[] = 'scrydex_webhook_expansion_ids_missing';
		}

		if ( true !== ( $schedule_status['configured'] ?? false ) ) {
			$issues = $schedule_status['configuration_issues'] ?? array();
			if ( is_array( $issues ) ) {
				$reasons = array_merge( $reasons, $this->string_list( $issues ) );
			}
		}

		if ( '' === $this->database_prefix() ) {
			$reasons[] = 'scrydex_webhook_database_prefix_invalid';
		}

		return array_values( array_unique( $reasons ) );
	}

	/**
	 * @param mixed $values Raw list.
	 * @return list<string>
	 */
	private function string_list( mixed $values ): array {
		if ( ! is_array( $values ) ) {
			return array();
		}

		return array_values(
			array_filter(
				array_map(
					static fn ( mixed $value ): string => is_scalar( $value ) ? trim( (string) $value ) : '',
					$values
				),
				static fn ( string $value ): bool => '' !== $value
			)
		);
	}

	/**
	 * @param array<string, mixed> $result Run result.
	 * @return array<string, mixed>
	 */
	private function summary( array $result ): array {
		$runs              = is_array( $result['runs'] ?? null ) ? $result['runs'] : array();
		$provider_requests = 0;

		foreach ( $runs as $run ) {
			if ( is_array( $run ) ) {
				$provider_requests += (int) ( $run['provider_request_count'] ?? 0 );
			}
		}

		return array(
			'status'                         => (string) ( $result['status'] ?? 'unknown' ),
			'event_id'                       => (string) ( $result['event_id'] ?? '' ),
			'event_name'                     => (string) ( $result['event_name'] ?? '' ),
			'game'                           => (string) ( $result['game'] ?? '' ),
			'expansion_count'                => count( $this->string_list( $result['expansion_ids'] ?? array() ) ),
			'provider_request_count'         => $provider_requests,
			'targeted_expansion_sync'        => true,
			'full_catalog_polling_requested' => false,
			'credential_values_redacted'     => true,
		);
	}
}
