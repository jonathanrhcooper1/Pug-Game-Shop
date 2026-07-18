<?php
/**
 * Signed ScryDex webhook receiver.
 *
 * @package TCGStorePlatform
 */

namespace TCGStorePlatform\Api\V1;

use TCGStorePlatform\Logging\Logger;
use TCGStorePlatform\Settings\ScryDexProviderSettings;
use TCGStorePlatform\Settings\Settings;
use TCGStorePlatform\ScryDex\ScryDexWebhookEventRepository;
use TCGStorePlatform\ScryDex\ScryDexWebhookPayloadParser;
use TCGStorePlatform\ScryDex\ScryDexWebhookSignatureVerifier;
use TCGStorePlatform\ScryDex\ScryDexWebhookSyncDispatcher;

final class ScryDexWebhookController {
	private const NAMESPACE        = 'tcg-store/v1';
	private const SIGNATURE_HEADER = 'X-Scrydex-Signature';

	public function __construct(
		private ?Logger $logger = null,
		private ?ScryDexWebhookSignatureVerifier $signature_verifier = null,
		private ?ScryDexWebhookPayloadParser $payload_parser = null,
		private ?ScryDexWebhookSyncDispatcher $sync_dispatcher = null,
		private ?ScryDexWebhookEventRepository $event_repository = null
	) {
		$this->logger             = $this->logger ?? new Logger();
		$this->signature_verifier = $this->signature_verifier ?? new ScryDexWebhookSignatureVerifier();
		$this->payload_parser     = $this->payload_parser ?? new ScryDexWebhookPayloadParser();
		$this->sync_dispatcher    = $this->sync_dispatcher ?? new ScryDexWebhookSyncDispatcher();
	}

	public function register(): void {
		add_action( 'rest_api_init', array( $this, 'register_routes' ), 25 );
	}

	public function register_routes(): void {
		register_rest_route(
			self::NAMESPACE,
			'/scrydex/webhooks',
			array(
				'methods'             => \WP_REST_Server::CREATABLE,
				'callback'            => array( $this, 'receive' ),
				'permission_callback' => '__return_true',
			)
		);
	}

	public function receive( \WP_REST_Request $request ): \WP_REST_Response {
		$settings = ScryDexProviderSettings::webhook_context( Settings::all() );
		$raw_body = (string) $request->get_body();

		if ( true !== ( $settings['configured'] ?? false ) ) {
			$result = array(
				'status'                     => 'blocked',
				'code'                       => 'scrydex_webhook_receiver_not_configured',
				'credential_values_redacted' => true,
				'configuration_issues'       => $settings['configuration_issues'] ?? array(),
			);
			$this->logger->warning( 'scrydex.webhook_not_configured', $result );

			return $this->response( $result, 403 );
		}

		$signature = $this->signature_header( $request );
		$verified  = $this->signature_verifier->verify(
			$raw_body,
			$signature,
			(string) ( $settings['webhook_secret'] ?? '' )
		);

		if ( 'verified' !== $verified['status'] ) {
			$this->logger->warning(
				'scrydex.webhook_signature_rejected',
				array(
					'status'                     => 'rejected',
					'payload_hash'               => $verified['payload_hash'] ?? hash( 'sha256', $raw_body ),
					'errors'                     => $verified['errors'] ?? array(),
					'credential_values_redacted' => true,
				)
			);

			return $this->response(
				array(
					'status'                     => 'rejected',
					'code'                       => 'scrydex_webhook_signature_invalid',
					'payload_hash'               => $verified['payload_hash'] ?? hash( 'sha256', $raw_body ),
					'credential_values_redacted' => true,
					'errors'                     => $verified['errors'] ?? array(),
				),
				401
			);
		}

		$event = $this->payload_parser->parse( $raw_body );
		if ( 'valid' !== $event['status'] ) {
			$this->logger->warning(
				'scrydex.webhook_payload_rejected',
				array(
					'status'                     => 'rejected',
					'payload_hash'               => $verified['payload_hash'],
					'event_name'                 => $event['event_name'] ?? '',
					'errors'                     => $event['errors'] ?? array(),
					'credential_values_redacted' => true,
				)
			);

			return $this->response(
				array(
					'status'                     => 'rejected',
					'code'                       => 'scrydex_webhook_payload_invalid',
					'payload_hash'               => $verified['payload_hash'],
					'errors'                     => $event['errors'] ?? array(),
					'credential_values_redacted' => true,
				),
				400
			);
		}

		$log_result      = $this->event_repository()->record( $event, (string) $verified['payload_hash'], 'verified', 'queued' );
		$dispatch_result = $this->sync_dispatcher->dispatch( $event );
		if ( ! in_array( (string) $dispatch_result['status'], array( 'scheduled', 'scheduled_existing' ), true ) ) {
			$this->logger->warning(
				'scrydex.webhook_dispatch_failed',
				array(
					'event_id'                   => $event['event_id'],
					'event_name'                 => $event['event_name'],
					'payload_hash'               => $verified['payload_hash'],
					'dispatch'                   => $dispatch_result,
					'credential_values_redacted' => true,
				)
			);

			return $this->response(
				array(
					'status'                     => 'accepted_but_not_scheduled',
					'code'                       => 'scrydex_webhook_dispatch_failed',
					'event_id'                   => $event['event_id'],
					'event_name'                 => $event['event_name'],
					'payload_hash'               => $verified['payload_hash'],
					'event_log'                  => $log_result,
					'dispatch'                   => $dispatch_result,
					'credential_values_redacted' => true,
				),
				503
			);
		}

		$result = array(
			'status'                         => 'accepted',
			'code'                           => 'scrydex_webhook_accepted',
			'event_id'                       => $event['event_id'],
			'event_name'                     => $event['event_name'],
			'game'                           => $event['game'],
			'update_type'                    => $event['update_type'],
			'expansion_count'                => $event['expansion_count'],
			'payload_hash'                   => $verified['payload_hash'],
			'event_log'                      => $log_result,
			'dispatch'                       => $dispatch_result,
			'targeted_expansion_sync'        => true,
			'full_catalog_polling_requested' => false,
			'credential_values_redacted'     => true,
		);

		$this->logger->info( 'scrydex.webhook_accepted', $result );

		return $this->response( $result, 202 );
	}

	private function event_repository(): ScryDexWebhookEventRepository {
		if ( null === $this->event_repository ) {
			$this->event_repository = new ScryDexWebhookEventRepository( $this->database() );
		}

		return $this->event_repository;
	}

	private function database(): ?\wpdb {
		global $wpdb;

		return is_object( $wpdb ) && class_exists( '\wpdb' ) && $wpdb instanceof \wpdb ? $wpdb : null;
	}

	private function signature_header( \WP_REST_Request $request ): string {
		$signature = (string) $request->get_header( 'x_scrydex_signature' );
		if ( '' !== trim( $signature ) ) {
			return trim( $signature );
		}

		return trim( (string) $request->get_header( self::SIGNATURE_HEADER ) );
	}

	/**
	 * @param array<string, mixed> $data Response data.
	 */
	private function response( array $data, int $status ): \WP_REST_Response {
		return new \WP_REST_Response(
			array(
				'data' => $data,
			),
			$status
		);
	}
}
