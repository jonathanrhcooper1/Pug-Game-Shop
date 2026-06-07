<?php
/**
 * Public event REST endpoints.
 *
 * @package TCGStorePlatform
 */

namespace TCGStorePlatform\Api\V1;

use DateTimeImmutable;
use TCGStorePlatform\Events\EventFilters;
use TCGStorePlatform\Events\EventPresenter;
use TCGStorePlatform\Events\EventRegistrationInput;
use TCGStorePlatform\Events\EventRegistrationRepository;
use TCGStorePlatform\Events\EventRegistrationService;
use TCGStorePlatform\Events\EventRepository;

final class EventsController {
	private const NAMESPACE = 'tcg-store/v1';

	public function register(): void {
		add_action( 'rest_api_init', array( $this, 'register_routes' ) );
	}

	public function register_routes(): void {
		foreach ( self::route_contracts() as $route ) {
			register_rest_route(
				$route['namespace'],
				$route['path'],
				array(
					'methods'             => self::rest_method( $route['method'] ),
					'callback'            => array( $this, $route['callback'] ),
					'permission_callback' => '__return_true',
				)
			);
		}
	}

	/**
	 * @return list<array{namespace:string,path:string,method:string,callback:string,permission:string}>
	 */
	public static function route_contracts(): array {
		return array(
			array(
				'namespace'  => self::NAMESPACE,
				'path'       => '/events',
				'method'     => 'GET',
				'callback'   => 'list_events',
				'permission' => 'public',
			),
			array(
				'namespace'  => self::NAMESPACE,
				'path'       => '/events/(?P<slug>[a-zA-Z0-9_-]+)',
				'method'     => 'GET',
				'callback'   => 'get_event',
				'permission' => 'public',
			),
			array(
				'namespace'  => self::NAMESPACE,
				'path'       => '/events/(?P<slug>[a-zA-Z0-9_-]+)/register',
				'method'     => 'POST',
				'callback'   => 'register_event',
				'permission' => 'public',
			),
		);
	}

	public function list_events( \WP_REST_Request $request ): \WP_REST_Response {
		$filters = EventFilters::from_array( $request->get_query_params() );
		$limit   = (int) $request->get_param( 'per_page' );
		$limit   = max( 1, min( 100, 0 === $limit ? 20 : $limit ) );
		$offset  = max( 0, ( (int) $request->get_param( 'page' ) - 1 ) * $limit );
		$rows    = $this->repository()->list_public( $filters, $limit, $offset );
		$now     = new DateTimeImmutable( 'now' );
		$events  = array_map(
			static fn ( array $row ): array => EventPresenter::present( $row, $now ),
			$rows
		);

		return new \WP_REST_Response(
			array(
				'events'  => $events,
				'filters' => $filters->to_array(),
			),
			200
		);
	}

	public function get_event( \WP_REST_Request $request ): \WP_REST_Response {
		$row = $this->repository()->get_public_by_slug( (string) $request->get_param( 'slug' ) );

		if ( null === $row ) {
			return new \WP_REST_Response(
				array(
					'code'    => 'tcg_event_not_found',
					'message' => __( 'Event not found.', 'tcg-store-platform' ),
				),
				404
			);
		}

		return new \WP_REST_Response(
			array(
				'event' => EventPresenter::present( $row ),
			),
			200
		);
	}

	public function register_event( \WP_REST_Request $request ): \WP_REST_Response {
		$body = $request->get_json_params();

		if ( ! is_array( $body ) ) {
			$body = $request->get_body_params();
		}

		$input  = EventRegistrationInput::from_array(
			$body,
			(string) $request->get_header( 'idempotency-key' )
		);
		$result = $this->registration_service()->register_by_slug(
			(string) $request->get_param( 'slug' ),
			$input
		);

		return new \WP_REST_Response( $result->to_response(), $result->status_code() );
	}

	private function repository(): EventRepository {
		global $wpdb;

		return new EventRepository( $wpdb );
	}

	private function registration_service(): EventRegistrationService {
		global $wpdb;

		return new EventRegistrationService( new EventRegistrationRepository( $wpdb ) );
	}

	private static function rest_method( string $method ): string {
		return match ( $method ) {
			'GET'   => \WP_REST_Server::READABLE,
			'POST'  => \WP_REST_Server::CREATABLE,
			default => $method,
		};
	}
}
