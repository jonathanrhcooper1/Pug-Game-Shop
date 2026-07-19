<?php
/**
 * Authenticated ScryDex webhook relay inbox for the LAN source of truth.
 *
 * @package TCGStorePlatform
 */

namespace TCGStorePlatform\Api\V1;

use TCGStorePlatform\ScryDex\ScryDexWebhookEventRepository;

final class ScryDexWebhookRelayController {
	private const NAMESPACE = 'tcg-store/v1';

	public function __construct( private ?ScryDexWebhookEventRepository $repository = null ) {
	}

	public function register(): void {
		add_action( 'rest_api_init', array( $this, 'register_routes' ), 25 );
	}

	public function register_routes(): void {
		register_rest_route(
			self::NAMESPACE,
			'/scrydex/webhook-events',
			array(
				'methods'             => \WP_REST_Server::READABLE,
				'callback'            => array( $this, 'list_due' ),
				'permission_callback' => array( $this, 'can_relay' ),
			)
		);

		register_rest_route(
			self::NAMESPACE,
			'/scrydex/webhook-events/(?P<event_id>[A-Za-z0-9_:-]+)',
			array(
				'methods'             => \WP_REST_Server::EDITABLE,
				'callback'            => array( $this, 'transition' ),
				'permission_callback' => array( $this, 'can_relay' ),
			)
		);
	}

	public function can_relay(): bool {
		return function_exists( 'current_user_can' )
			&& ( current_user_can( 'manage_settings' ) || current_user_can( 'view_reports' ) );
	}

	public function list_due( \WP_REST_Request $request ): \WP_REST_Response {
		$requested_limit = (int) $request->get_param( 'limit' );
		$limit           = max( 1, min( 100, $requested_limit > 0 ? $requested_limit : 25 ) );
		$events          = $this->repository()->due_for_lan( $limit );

		return new \WP_REST_Response(
			array(
				'data' => array(
					'status'                       => 'ok',
					'events'                       => $events,
					'count'                        => count( $events ),
					'source_of_truth'              => 'local_sync_server',
					'credential_values_redacted'   => true,
					'credentials_synced_to_client' => false,
				),
			),
			200
		);
	}

	public function transition( \WP_REST_Request $request ): \WP_REST_Response {
		$payload = $request->get_json_params();
		$payload = is_array( $payload ) ? $payload : array();
		$result  = $this->repository()->transition_for_lan(
			(string) $request->get_param( 'event_id' ),
			(string) ( $payload['status'] ?? '' ),
			(string) ( $payload['result_reference'] ?? '' ),
			(string) ( $payload['error_code'] ?? '' ),
			(string) ( $payload['error_message'] ?? '' )
		);

		$status = 'ok' === ( $result['status'] ?? '' ) ? 200 : ( 'not_found' === ( $result['status'] ?? '' ) ? 404 : 409 );

		return new \WP_REST_Response(
			array(
				'data' => $result,
			),
			$status
		);
	}

	private function repository(): ScryDexWebhookEventRepository {
		if ( null === $this->repository ) {
			global $wpdb;

			$this->repository = new ScryDexWebhookEventRepository(
				is_object( $wpdb ) && class_exists( '\wpdb' ) && $wpdb instanceof \wpdb ? $wpdb : null
			);
		}

		return $this->repository;
	}
}
