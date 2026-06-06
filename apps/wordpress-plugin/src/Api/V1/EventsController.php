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
use TCGStorePlatform\Events\EventRepository;

final class EventsController {
	private const NAMESPACE = 'tcg-store/v1';

	public function register(): void {
		add_action( 'rest_api_init', array( $this, 'register_routes' ) );
	}

	public function register_routes(): void {
		register_rest_route(
			self::NAMESPACE,
			'/events',
			array(
				'methods'             => \WP_REST_Server::READABLE,
				'callback'            => array( $this, 'list_events' ),
				'permission_callback' => '__return_true',
			)
		);

		register_rest_route(
			self::NAMESPACE,
			'/events/(?P<slug>[a-zA-Z0-9_-]+)',
			array(
				'methods'             => \WP_REST_Server::READABLE,
				'callback'            => array( $this, 'get_event' ),
				'permission_callback' => '__return_true',
			)
		);
	}

	public function list_events( \WP_REST_Request $request ): \WP_REST_Response {
		$filters = EventFilters::from_array( $request->get_query_params() );
		$limit   = max( 1, min( 100, (int) $request->get_param( 'per_page' ) ?: 20 ) );
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

	private function repository(): EventRepository {
		global $wpdb;

		return new EventRepository( $wpdb );
	}
}
