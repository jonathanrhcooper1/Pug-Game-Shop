<?php
/**
 * Store reports planner tests.
 *
 * @package TCGStorePlatform
 */

namespace TCGStorePlatform\Tests\Unit;

use TCGStorePlatform\Reports\StoreReportsPlanner;
use TCGStorePlatform\Api\V1\ReportsController;
use TCGStorePlatform\Tests\TestCase;

final class StoreReportsPlannerTest extends TestCase {
	public function test_inventory_report_is_private_paginated_and_filterable(): void {
		$plan = ( new StoreReportsPlanner() )->plan(
			'inventory',
			array(
				'date_from'       => '2026-06-01',
				'game'            => 'Pokemon!',
				'grading_company' => 'PSA',
				'page'            => 2,
				'page_size'       => 50000,
			)
		);

		$this->assert_same( 'inventory', $plan['report'] );
		$this->assert_false( $plan['public'] );
		$this->assert_same( 'view_reports', $plan['capability'] );
		$this->assert_same( 2, $plan['page'] );
		$this->assert_same( 250, $plan['page_size'] );
		$this->assert_same( 250, $plan['query_plan']['pagination']['limit'] );
		$this->assert_same( 250, $plan['query_plan']['pagination']['offset'] );
		$this->assert_same( 'pokemon', $plan['filters']['game'] );
		$this->assert_same( 'PSA', $plan['filters']['grading_company'] );
		$this->assert_true( in_array( 'tcg_inventory_items', $plan['query_plan']['tables'], true ) );
	}

	public function test_all_required_report_sections_have_columns(): void {
		$planner = new StoreReportsPlanner();

		foreach ( $planner->report_keys() as $report ) {
			$plan = $planner->plan( $report );

			$this->assert_same( $report, $plan['report'] );
			$this->assert_true( count( $plan['columns'] ) > 0 );
		}
	}

	public function test_dashboard_plan_contains_graph_filters_comparisons_and_retail_kpis(): void {
		$plan = ( new StoreReportsPlanner() )->dashboard_plan(
			array(
				'channel'       => 'square_pos',
				'staff_user_id' => 22,
				'game'          => 'pokemon',
			)
		);

		$this->assert_false( $plan['public'] );
		$this->assert_same( 'view_reports', $plan['capability'] );
		$this->assert_same( 'square_pos', $plan['filters']['channel'] );
		$this->assert_same( 22, $plan['filters']['staff_user_id'] );
		$this->assert_true( $plan['query_strategy']['graph_ready'] );
		$this->assert_true( $plan['query_strategy']['pagination_required'] );
		$this->assert_true( $plan['query_strategy']['avoid_full_catalog_loads'] );
		$this->assert_true( count( $plan['insight_tiles'] ) >= 6 );
		$this->assert_true( count( $plan['report_matrix'] ) >= 5 );
		$this->assert_same( 'manager_or_above', $plan['data_contracts']['dashboard']['auth'] );

		$comparison_keys = array_column( $plan['comparison_sets'], 'key' );
		$this->assert_true( in_array( 'employee_intake_vs_sales', $comparison_keys, true ) );
		$this->assert_true( in_array( 'online_vs_in_store_sales', $comparison_keys, true ) );
		$this->assert_true( in_array( 'trade_in_cash_vs_credit', $comparison_keys, true ) );

		$chart_keys = array_column( $plan['charts'], 'key' );
		$this->assert_true( in_array( 'sales_by_channel', $chart_keys, true ) );
		$this->assert_true( in_array( 'employee_performance', $chart_keys, true ) );
		$this->assert_true( in_array( 'inventory_health', $chart_keys, true ) );

		$retail_kpi_keys = array_column( $plan['retail_kpis'], 'key' );
		$this->assert_true( in_array( 'sell_through_rate', $retail_kpi_keys, true ) );
		$this->assert_true( in_array( 'inventory_turnover', $retail_kpi_keys, true ) );
		$this->assert_true( in_array( 'gmroi', $retail_kpi_keys, true ) );
	}

	public function test_csv_header_uses_report_columns(): void {
		$planner = new StoreReportsPlanner();
		$plan    = $planner->plan( 'sales' );

		$this->assert_contains( '"Gross Sales"', $planner->csv_header( $plan ) );
		$this->assert_contains( '"Net Sales"', $planner->csv_header( $plan ) );
	}

	public function test_reports_controller_exposes_manager_only_callbacks(): void {
		$controller = new ReportsController();

		$this->assert_true( method_exists( $controller, 'get_report' ) );
		$this->assert_true( method_exists( $controller, 'can_view_reports' ) );
	}

	public function test_admin_reports_screen_source_contains_graph_dashboard_markers(): void {
		$source = file_get_contents( dirname( __DIR__, 2 ) . '/src/Admin/AdminMenu.php' );

		$this->assert_true( is_string( $source ) );
		$this->assert_contains( 'tcg-store-platform-reports', $source );
		$this->assert_contains( 'Business Reports', $source );
		$this->assert_contains( 'Graph Dashboard', $source );
		$this->assert_contains( 'Manager Decision Board', $source );
		$this->assert_contains( 'Comparison Builder', $source );
		$this->assert_contains( 'Report Matrix', $source );
		$this->assert_contains( 'Retail KPI Library', $source );
		$this->assert_contains( 'tcg-report-chart-grid', $source );
		$this->assert_contains( 'tcg-report-filters', $source );
		$this->assert_contains( 'tcg-report-insight-grid', $source );
		$this->assert_contains( 'tcg-report-api-contract', $source );
	}
}
