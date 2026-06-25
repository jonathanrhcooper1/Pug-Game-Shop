<?php
/**
 * Manager reports REST endpoints.
 *
 * @package TCGStorePlatform
 */

namespace TCGStorePlatform\Api\V1;

use TCGStorePlatform\Reports\StoreReportsPlanner;

final class ReportsController {
	public function register(): void {
		if ( function_exists( 'add_action' ) ) {
			add_action( 'rest_api_init', array( $this, 'register_routes' ), 25 );
		}
	}

	public function register_routes(): void {
		if ( ! function_exists( 'register_rest_route' ) ) {
			return;
		}

		register_rest_route(
			'tcg-store/v1',
			'/reports/(?P<report>[a-z0-9_-]+)',
			array(
				'methods'             => 'GET',
				'callback'            => array( $this, 'get_report' ),
				'permission_callback' => array( $this, 'can_view_reports' ),
			)
		);
	}

	public function can_view_reports(): bool {
		return function_exists( 'current_user_can' ) && current_user_can( 'view_reports' );
	}

	public function get_report( \WP_REST_Request $request ): \WP_REST_Response {
		$report  = (string) $request->get_param( 'report' );
		$filters = array();

		foreach ( array( 'date_from', 'date_to', 'customer_id', 'staff_user_id', 'channel', 'game', 'product_type', 'condition', 'grade', 'grading_company', 'order_status', 'source', 'page', 'page_size' ) as $key ) {
			$filters[ $key ] = $request->get_param( $key );
		}

		$planner = new StoreReportsPlanner();
		$plan    = $planner->plan( $report, $filters );

		return new \WP_REST_Response(
			array(
				'status' => 'planned',
				'data'   => $plan,
				'meta'   => array(
					'csv_header'     => $planner->csv_header( $plan ),
					'dashboard_plan' => $planner->dashboard_plan( $filters ),
				),
			),
			200
		);
	}
}
