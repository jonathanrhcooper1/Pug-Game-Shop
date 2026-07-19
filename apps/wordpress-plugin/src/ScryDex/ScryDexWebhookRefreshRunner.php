<?php
/**
 * Queue verified ScryDex webhooks for the LAN source of truth.
 *
 * @package TCGStorePlatform
 */

namespace TCGStorePlatform\ScryDex;

use TCGStorePlatform\Logging\Logger;

final class ScryDexWebhookRefreshRunner {
	public function __construct(
		private Logger $logger,
		private ?ScryDexWebhookEventRepository $event_repository = null
	) {
	}

	public function register(): void {
		add_action( ScryDexWebhookSyncDispatcher::ACTION, array( $this, 'run' ), 10, 1 );
	}

	/**
	 * WordPress is the signed public inbox. It never becomes the catalog or
	 * pricing authority; the private LAN server polls and acknowledges this row.
	 *
	 * @param array<string, mixed> $payload Scheduled webhook payload.
	 * @return array<string, mixed>
	 */
	public function run( array $payload ): array {
		$event_id      = trim( (string) ( $payload['event_id'] ?? '' ) );
		$expansion_ids = $this->string_list( $payload['expansion_ids'] ?? array() );

		if ( '' === $event_id || array() === $expansion_ids ) {
			$result = array(
				'status'                     => 'blocked',
				'action'                     => 'scrydex_webhook_lan_relay_queue',
				'event_id'                   => $event_id,
				'event_name'                 => (string) ( $payload['event_name'] ?? '' ),
				'expansion_ids'              => $expansion_ids,
				'source_of_truth'            => 'local_sync_server',
				'credential_values_redacted' => true,
				'block_reasons'              => array( '' === $event_id ? 'scrydex_webhook_event_id_missing' : 'scrydex_webhook_expansion_ids_missing' ),
			);
			$this->logger->warning( 'scrydex.webhook_lan_relay_blocked', $result );

			return $result;
		}

		$relay  = $this->event_repository()->mark_ready_for_lan( $event_id );
		$result = array(
			'status'                         => 'ready' === ( $relay['status'] ?? '' ) ? 'queued_for_lan' : 'attention_required',
			'action'                         => 'scrydex_webhook_lan_relay_queue',
			'event_id'                       => $event_id,
			'event_name'                     => (string) ( $payload['event_name'] ?? '' ),
			'game'                           => (string) ( $payload['game'] ?? '' ),
			'update_type'                    => (string) ( $payload['update_type'] ?? '' ),
			'expansion_ids'                  => $expansion_ids,
			'targeted_expansion_sync'        => true,
			'full_catalog_polling_requested' => false,
			'source_of_truth'                => 'local_sync_server',
			'wordpress_provider_calls'       => 0,
			'relay'                          => $relay,
			'credential_values_redacted'     => true,
		);

		$this->logger->info( 'scrydex.webhook_ready_for_lan', $result );

		return $result;
	}

	private function event_repository(): ScryDexWebhookEventRepository {
		if ( null === $this->event_repository ) {
			global $wpdb;

			$this->event_repository = new ScryDexWebhookEventRepository(
				is_object( $wpdb ) && class_exists( '\wpdb' ) && $wpdb instanceof \wpdb ? $wpdb : null
			);
		}

		return $this->event_repository;
	}

	/**
	 * @return list<string>
	 */
	private function string_list( mixed $values ): array {
		if ( ! is_array( $values ) ) {
			return array();
		}

		return array_values(
			array_unique(
				array_filter(
					array_map(
						static fn ( mixed $value ): string => is_scalar( $value ) ? trim( (string) $value ) : '',
						$values
					),
					static fn ( string $value ): bool => '' !== $value
				)
			)
		);
	}
}
