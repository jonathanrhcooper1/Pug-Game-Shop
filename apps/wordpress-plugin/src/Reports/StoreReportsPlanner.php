<?php
/**
 * Store report planning.
 *
 * @package TCGStorePlatform
 */

namespace TCGStorePlatform\Reports;

final class StoreReportsPlanner {
	private const REPORTS = array(
		'customers',
		'sales',
		'inventory',
		'trade_ins',
		'fulfillment',
		'scrydex',
		'square_reconciliation',
		'audit',
	);

	/**
	 * @return list<string>
	 */
	public function report_keys(): array {
		return self::REPORTS;
	}

	/**
	 * @param array<string, mixed> $filters Report filters.
	 * @return array<string, mixed>
	 */
	public function dashboard_plan( array $filters = array() ): array {
		$filters = $this->filters( $filters );

		return array(
			'capability'      => 'view_reports',
			'public'          => false,
			'filters'         => $filters,
			'filter_controls' => $this->filter_controls(),
			'kpi_cards'       => $this->kpi_cards(),
			'insight_tiles'   => $this->insight_tiles(),
			'comparison_sets' => $this->comparison_sets(),
			'charts'          => $this->charts(),
			'retail_kpis'     => $this->retail_kpis(),
			'report_matrix'   => $this->report_matrix(),
			'data_contracts'  => $this->data_contracts(),
			'csv_exports'     => array_map(
				fn ( string $report ): array => array(
					'report'   => $report,
					'label'    => ucwords( str_replace( '_', ' ', $report ) ),
					'filename' => 'the-pug-' . $report . '-report.csv',
				),
				self::REPORTS
			),
			'query_strategy'  => array(
				'graph_ready'              => true,
				'pagination_required'      => true,
				'avoid_full_catalog_loads' => true,
				'manager_only'             => true,
			),
			'research_basis'  => array(
				'woocommerce_analytics' => array( 'revenue', 'orders', 'products', 'categories', 'coupons', 'taxes', 'stock', 'customers' ),
				'retail_inventory_kpis' => array( 'sell_through_rate', 'inventory_turnover', 'days_on_hand', 'weeks_on_hand', 'stock_to_sales_ratio', 'gmroi' ),
				'store_operations'      => array( 'employee_intake_vs_sales', 'online_vs_in_store_sales', 'trade_in_cash_vs_credit', 'pickup_fulfillment_speed' ),
			),
		);
	}

	/**
	 * @param array<string, mixed> $filters Report filters.
	 * @return array<string, mixed>
	 */
	public function plan( string $report, array $filters = array() ): array {
		$report  = $this->report_key( $report );
		$filters = $this->filters( $filters );

		return array(
			'report'       => $report,
			'filters'      => $filters,
			'page'         => $filters['page'],
			'page_size'    => $filters['page_size'],
			'capability'   => 'view_reports',
			'public'       => false,
			'csv_filename' => 'the-pug-' . $report . '-report.csv',
			'columns'      => $this->columns( $report ),
			'query_plan'   => $this->query_plan( $report, $filters ),
		);
	}

	/**
	 * @param array<string, mixed> $plan Report plan.
	 */
	public function csv_header( array $plan ): string {
		$labels = array_map(
			static fn ( array $column ): string => (string) ( $column['label'] ?? '' ),
			is_array( $plan['columns'] ?? null ) ? $plan['columns'] : array()
		);

		return implode( ',', array_map( array( $this, 'csv_cell' ), $labels ) ) . "\n";
	}

	private function report_key( string $report ): string {
		$report = strtolower( trim( preg_replace( '/[^a-z0-9_]+/', '_', $report ) ?? '' ) );

		return in_array( $report, self::REPORTS, true ) ? $report : 'inventory';
	}

	/**
	 * @return list<array{key:string,label:string,type:string,options:list<string>}>
	 */
	private function filter_controls(): array {
		return array(
			array(
				'key'     => 'date_from',
				'label'   => 'From',
				'type'    => 'date',
				'options' => array(),
			),
			array(
				'key'     => 'date_to',
				'label'   => 'To',
				'type'    => 'date',
				'options' => array(),
			),
			array(
				'key'     => 'staff_user_id',
				'label'   => 'Employee',
				'type'    => 'staff_lookup',
				'options' => array(),
			),
			array(
				'key'     => 'channel',
				'label'   => 'Channel',
				'type'    => 'select',
				'options' => array( 'online', 'square_pos', 'kiosk', 'local_pickup', 'manual' ),
			),
			array(
				'key'     => 'game',
				'label'   => 'Game',
				'type'    => 'select',
				'options' => array( 'pokemon', 'magicthegathering', 'lorcana', 'onepiece', 'riftbound', 'gundam', 'digimon' ),
			),
			array(
				'key'     => 'product_type',
				'label'   => 'Product Type',
				'type'    => 'select',
				'options' => array( 'singles', 'graded', 'sealed', 'accessories', 'events' ),
			),
			array(
				'key'     => 'condition',
				'label'   => 'Condition',
				'type'    => 'select',
				'options' => array( 'NM', 'LP', 'MP', 'HP', 'DMG' ),
			),
			array(
				'key'     => 'grading_company',
				'label'   => 'Grading Company',
				'type'    => 'select',
				'options' => array( 'PSA', 'CGC', 'BGS', 'SGC', 'TAG', 'Other' ),
			),
			array(
				'key'     => 'source',
				'label'   => 'Source',
				'type'    => 'select',
				'options' => array( 'trade_in', 'buy_in', 'manual_intake', 'square_pos', 'online', 'kiosk' ),
			),
		);
	}

	/**
	 * @return list<array{key:string,label:string,report:string,metric:string,format:string,description:string}>
	 */
	private function kpi_cards(): array {
		return array(
			array(
				'key'         => 'gross_sales',
				'label'       => 'Gross Sales',
				'report'      => 'sales',
				'metric'      => 'gross_sales',
				'format'      => 'money',
				'description' => 'All online, Square/POS, kiosk, and local pickup sales before refunds.',
			),
			array(
				'key'         => 'net_sales',
				'label'       => 'Net Sales',
				'report'      => 'sales',
				'metric'      => 'net_sales',
				'format'      => 'money',
				'description' => 'Sales after refunds, discounts, taxes, and shipping adjustments.',
			),
			array(
				'key'         => 'inventory_value',
				'label'       => 'Inventory Value',
				'report'      => 'inventory',
				'metric'      => 'inventory_value',
				'format'      => 'money',
				'description' => 'Current sellable inventory value by singles, graded, sealed, and accessories.',
			),
			array(
				'key'         => 'trade_in_liability',
				'label'       => 'Credit Liability',
				'report'      => 'customers',
				'metric'      => 'customer_credit_balances',
				'format'      => 'money',
				'description' => 'Outstanding local-store-only customer credit balance.',
			),
			array(
				'key'         => 'cash_paid_buyins',
				'label'       => 'Cash Paid Buy-Ins',
				'report'      => 'trade_ins',
				'metric'      => 'cash_given',
				'format'      => 'money',
				'description' => 'Cash payouts by employee, customer, game, and card.',
			),
			array(
				'key'         => 'fulfillment_speed',
				'label'       => 'Pickup Speed',
				'report'      => 'fulfillment',
				'metric'      => 'placed_to_ready_minutes',
				'format'      => 'duration',
				'description' => 'Average time from paid pickup order to ready for pickup.',
			),
		);
	}

	/**
	 * @return list<array{key:string,label:string,question:string,primary_report:string,filters:list<string>,action:string}>
	 */
	private function insight_tiles(): array {
		return array(
			array(
				'key'            => 'best_employee_margin',
				'label'          => 'Employee Margin',
				'question'       => 'Which employee is turning intake into profitable sales?',
				'primary_report' => 'sales',
				'filters'        => array( 'staff_user_id', 'date_from', 'date_to', 'product_type' ),
				'action'         => 'Compare items intaken, items sold, gross margin, cash paid, and credit issued.',
			),
			array(
				'key'            => 'channel_shift',
				'label'          => 'Channel Shift',
				'question'       => 'Are online, kiosk, local pickup, or Square/POS sales growing faster?',
				'primary_report' => 'sales',
				'filters'        => array( 'channel', 'date_from', 'date_to', 'game' ),
				'action'         => 'Review net sales, order count, average order value, and refunds by channel.',
			),
			array(
				'key'            => 'inventory_trap',
				'label'          => 'Slow Inventory',
				'question'       => 'Which game, set, condition, or graded company is tying up cash?',
				'primary_report' => 'inventory',
				'filters'        => array( 'game', 'set', 'condition', 'grading_company' ),
				'action'         => 'Sort by days on hand, weeks on hand, stock-to-sales ratio, and GMROI.',
			),
			array(
				'key'            => 'credit_velocity',
				'label'          => 'Credit Velocity',
				'question'       => 'Is store credit coming back as purchases or piling up as liability?',
				'primary_report' => 'customers',
				'filters'        => array( 'customer_id', 'date_from', 'date_to', 'staff_user_id' ),
				'action'         => 'Compare credit given, credit used, balance changes, and trade-in source.',
			),
			array(
				'key'            => 'pickup_bottleneck',
				'label'          => 'Pickup Bottleneck',
				'question'       => 'Where do local pickup orders slow down?',
				'primary_report' => 'fulfillment',
				'filters'        => array( 'order_status', 'staff_user_id', 'date_from', 'date_to' ),
				'action'         => 'Compare placed-to-picked, picked-to-ready, and ready-to-completed timing.',
			),
			array(
				'key'            => 'sync_quality',
				'label'          => 'Sync Quality',
				'question'       => 'Are ScryDex, WooCommerce, Square/POS, and local app syncs healthy?',
				'primary_report' => 'audit',
				'filters'        => array( 'source', 'date_from', 'date_to' ),
				'action'         => 'Track failed pulls, price changes, pending external sync rows, and reconciliation variance.',
			),
		);
	}

	/**
	 * @return list<array{key:string,label:string,chart:string,primary_report:string,compare_by:list<string>,metrics:list<string>}>
	 */
	private function comparison_sets(): array {
		return array(
			array(
				'key'            => 'employee_intake_vs_sales',
				'label'          => 'Employee Intake vs Sales',
				'chart'          => 'stacked_bar',
				'primary_report' => 'sales',
				'compare_by'     => array( 'staff_user_id', 'date' ),
				'metrics'        => array( 'items_intaken', 'items_sold', 'gross_sales', 'cash_paid', 'credit_given' ),
			),
			array(
				'key'            => 'online_vs_in_store_sales',
				'label'          => 'Online Sales vs In-Store Sales',
				'chart'          => 'line_compare',
				'primary_report' => 'sales',
				'compare_by'     => array( 'channel', 'date' ),
				'metrics'        => array( 'gross_sales', 'net_sales', 'order_count', 'average_order_value' ),
			),
			array(
				'key'            => 'trade_in_cash_vs_credit',
				'label'          => 'Trade-In Cash vs Credit',
				'chart'          => 'stacked_area',
				'primary_report' => 'trade_ins',
				'compare_by'     => array( 'staff_user_id', 'game', 'date' ),
				'metrics'        => array( 'cash_given', 'credit_given', 'market_mid_total', 'final_value_total' ),
			),
			array(
				'key'            => 'inventory_profitability',
				'label'          => 'Inventory Profitability',
				'chart'          => 'scatter',
				'primary_report' => 'inventory',
				'compare_by'     => array( 'game', 'set', 'product_type' ),
				'metrics'        => array( 'gross_margin', 'gmroi', 'sell_through_rate', 'inventory_turnover' ),
			),
		);
	}

	/**
	 * @return list<array{key:string,label:string,type:string,report:string,x:string,y:list<string>,breakdowns:list<string>}>
	 */
	private function charts(): array {
		return array(
			array(
				'key'        => 'sales_by_channel',
				'label'      => 'Sales by Channel',
				'type'       => 'line',
				'report'     => 'sales',
				'x'          => 'date',
				'y'          => array( 'online_sales', 'square_pos_sales', 'kiosk_sales', 'local_pickup_sales' ),
				'breakdowns' => array( 'channel', 'staff_user_id' ),
			),
			array(
				'key'        => 'employee_performance',
				'label'      => 'Employee Performance',
				'type'       => 'bar',
				'report'     => 'sales',
				'x'          => 'staff_user_id',
				'y'          => array( 'items_intaken', 'items_sold', 'gross_sales', 'trade_in_value' ),
				'breakdowns' => array( 'date', 'product_type' ),
			),
			array(
				'key'        => 'inventory_health',
				'label'      => 'Inventory Health',
				'type'       => 'combo',
				'report'     => 'inventory',
				'x'          => 'game',
				'y'          => array( 'quantity', 'inventory_value', 'low_stock', 'reserved_inventory' ),
				'breakdowns' => array( 'set', 'condition', 'grade' ),
			),
			array(
				'key'        => 'trade_in_pipeline',
				'label'      => 'Trade-In Pipeline',
				'type'       => 'funnel',
				'report'     => 'trade_ins',
				'x'          => 'status',
				'y'          => array( 'draft', 'review', 'approved', 'paid', 'converted' ),
				'breakdowns' => array( 'staff_user_id', 'payout_type' ),
			),
			array(
				'key'        => 'fulfillment_timing',
				'label'      => 'Fulfillment Timing',
				'type'       => 'timeline',
				'report'     => 'fulfillment',
				'x'          => 'date',
				'y'          => array( 'awaiting_pull', 'picked', 'ready_for_pickup', 'completed' ),
				'breakdowns' => array( 'staff_user_id', 'order_status' ),
			),
			array(
				'key'        => 'scrydex_sync_health',
				'label'      => 'ScryDex Sync Health',
				'type'       => 'line',
				'report'     => 'scrydex',
				'x'          => 'sync_run',
				'y'          => array( 'new_cards', 'price_changes', 'failed_pulls' ),
				'breakdowns' => array( 'game', 'set' ),
			),
		);
	}

	/**
	 * @return list<array{key:string,label:string,formula:string,report:string,why:string}>
	 */
	private function retail_kpis(): array {
		return array(
			array(
				'key'     => 'sell_through_rate',
				'label'   => 'Sell-Through Rate',
				'formula' => 'units_sold / (units_sold + units_on_hand)',
				'report'  => 'inventory',
				'why'     => 'Shows whether a set/game is moving fast enough.',
			),
			array(
				'key'     => 'inventory_turnover',
				'label'   => 'Inventory Turnover',
				'formula' => 'cost_of_goods_sold / average_inventory_cost',
				'report'  => 'inventory',
				'why'     => 'Measures how often inventory investment turns into sales.',
			),
			array(
				'key'     => 'days_on_hand',
				'label'   => 'Days on Hand',
				'formula' => '(average_inventory / cost_of_sales) * 365',
				'report'  => 'inventory',
				'why'     => 'Flags slow-moving singles, graded cards, and sealed product.',
			),
			array(
				'key'     => 'weeks_on_hand',
				'label'   => 'Weeks on Hand',
				'formula' => '(average_inventory / cost_of_sales) * 52',
				'report'  => 'inventory',
				'why'     => 'Helps plan restocks and markdowns.',
			),
			array(
				'key'     => 'stock_to_sales_ratio',
				'label'   => 'Stock-to-Sales Ratio',
				'formula' => 'inventory_value / sales_value',
				'report'  => 'inventory',
				'why'     => 'Compares money tied in stock against sales demand.',
			),
			array(
				'key'     => 'gmroi',
				'label'   => 'GMROI',
				'formula' => 'gross_margin / average_inventory_cost',
				'report'  => 'inventory',
				'why'     => 'Shows gross margin return on inventory dollars.',
			),
			array(
				'key'     => 'average_order_value',
				'label'   => 'Average Order Value',
				'formula' => 'net_sales / order_count',
				'report'  => 'sales',
				'why'     => 'Compares online, Square/POS, kiosk, and pickup basket size.',
			),
			array(
				'key'     => 'credit_redemption_rate',
				'label'   => 'Credit Redemption Rate',
				'formula' => 'credit_used / credit_given',
				'report'  => 'customers',
				'why'     => 'Tracks how store credit returns as sales.',
			),
		);
	}

	/**
	 * @return list<array{area:string,reports:list<string>,graphs:list<string>,default_filters:list<string>,exports:list<string>}>
	 */
	private function report_matrix(): array {
		return array(
			array(
				'area'            => 'Customer and Credit',
				'reports'         => array( 'customers', 'audit' ),
				'graphs'          => array( 'credit liability trend', 'credit given vs used', 'top customers' ),
				'default_filters' => array( 'date range', 'customer', 'staff', 'location' ),
				'exports'         => array( 'ledger csv', 'customer balance csv' ),
			),
			array(
				'area'            => 'Sales and Channel',
				'reports'         => array( 'sales', 'square_reconciliation' ),
				'graphs'          => array( 'online vs in-store', 'sales by game', 'sales by employee', 'refunds/discounts/taxes' ),
				'default_filters' => array( 'date range', 'channel', 'staff', 'game', 'product type' ),
				'exports'         => array( 'sales csv', 'square reconciliation csv' ),
			),
			array(
				'area'            => 'Inventory Health',
				'reports'         => array( 'inventory', 'scrydex' ),
				'graphs'          => array( 'inventory value', 'sell-through', 'aging', 'low stock', 'price changes' ),
				'default_filters' => array( 'game', 'set', 'condition', 'grade', 'source' ),
				'exports'         => array( 'inventory csv', 'scrydex sync csv' ),
			),
			array(
				'area'            => 'Trade-In / Buy-In',
				'reports'         => array( 'trade_ins', 'customers' ),
				'graphs'          => array( 'cash vs credit', 'market mid vs payout', 'accepted/rejected/pending', 'employee intake volume' ),
				'default_filters' => array( 'date range', 'staff', 'customer', 'game', 'payout type' ),
				'exports'         => array( 'trade-in csv', 'receipt line csv' ),
			),
			array(
				'area'            => 'Fulfillment',
				'reports'         => array( 'fulfillment', 'sales' ),
				'graphs'          => array( 'awaiting picking', 'picked', 'ready for pickup', 'completed history', 'staff timing' ),
				'default_filters' => array( 'date range', 'staff', 'order status', 'channel' ),
				'exports'         => array( 'pickup queue csv', 'completed pickup csv' ),
			),
		);
	}

	/**
	 * @return array<string, array<string, mixed>>
	 */
	private function data_contracts(): array {
		return array(
			'dashboard' => array(
				'endpoint'    => '/wp-json/tcg-store/v1/reports/{report}',
				'auth'        => 'manager_or_above',
				'pagination'  => 'page/page_size; max 250 rows per request',
				'csv'         => 'CSV header uses the same column order as the REST report plan.',
				'chart_shape' => array( 'labels', 'series', 'totals', 'filters', 'generated_at' ),
			),
			'app'       => array(
				'endpoint' => 'GET /reports/{report} through the paired website connector',
				'auth'     => 'local session with Reports access and website application password',
				'cache'    => 'short local cache allowed; refresh on manager filter changes',
				'offline'  => 'show last synced report snapshot when WordPress is unavailable',
			),
		);
	}

	/**
	 * @param array<string, mixed> $filters Raw filters.
	 * @return array<string, mixed>
	 */
	private function filters( array $filters ): array {
		return array(
			'date_from'       => $this->date( $filters['date_from'] ?? '' ),
			'date_to'         => $this->date( $filters['date_to'] ?? '' ),
			'customer_id'     => $this->positive_int_or_zero( $filters['customer_id'] ?? 0 ),
			'staff_user_id'   => $this->positive_int_or_zero( $filters['staff_user_id'] ?? 0 ),
			'channel'         => $this->slug( $filters['channel'] ?? '' ),
			'game'            => $this->slug( $filters['game'] ?? '' ),
			'product_type'    => $this->slug( $filters['product_type'] ?? '' ),
			'condition'       => strtoupper( $this->slug( $filters['condition'] ?? '' ) ),
			'grade'           => $this->short_text( $filters['grade'] ?? '' ),
			'grading_company' => $this->short_text( $filters['grading_company'] ?? '' ),
			'order_status'    => $this->slug( $filters['order_status'] ?? '' ),
			'source'          => $this->slug( $filters['source'] ?? '' ),
			'page'            => max( 1, (int) ( $filters['page'] ?? 1 ) ),
			'page_size'       => min( 250, max( 10, (int) ( $filters['page_size'] ?? 50 ) ) ),
		);
	}

	/**
	 * @return list<array{key:string,label:string,type:string}>
	 */
	private function columns( string $report ): array {
		$common = array(
			array(
				'key'   => 'date',
				'label' => 'Date',
				'type'  => 'date',
			),
			array(
				'key'   => 'count',
				'label' => 'Count',
				'type'  => 'integer',
			),
			array(
				'key'   => 'amount',
				'label' => 'Amount',
				'type'  => 'money',
			),
		);

		$map = array(
			'customers'             => array( 'Customer', 'Credit Balance', 'Credit Given', 'Credit Used', 'Cash Paid' ),
			'sales'                 => array( 'Channel', 'Product Type', 'Game', 'Set', 'Condition', 'Gross Sales', 'Net Sales' ),
			'inventory'             => array( 'Product Type', 'Game', 'Set', 'Condition/Grade', 'Quantity', 'Inventory Value' ),
			'trade_ins'             => array( 'Submission', 'Customer', 'Staff', 'Cash Given', 'Credit Given', 'Status' ),
			'fulfillment'           => array( 'Order', 'Status', 'Picked By', 'Placed To Picked', 'Picked To Ready' ),
			'scrydex'               => array( 'Sync Run', 'Game', 'New Cards', 'Price Changes', 'Failures', 'Last Success' ),
			'square_reconciliation' => array( 'Transaction ID', 'Channel', 'Payment Method', 'Square Total', 'Website Total', 'Variance' ),
			'audit'                 => array( 'Actor', 'Action', 'Object', 'Result', 'Timestamp' ),
		);

		$labels  = $map[ $report ] ?? array();
		$columns = array();

		foreach ( $labels as $label ) {
			$columns[] = array(
				'key'   => strtolower( preg_replace( '/[^a-z0-9]+/', '_', $label ) ?? '' ),
				'label' => $label,
				'type'  => str_contains( strtolower( $label ), 'cash' )
					|| str_contains( strtolower( $label ), 'credit' )
					|| str_contains( strtolower( $label ), 'sales' )
					|| str_contains( strtolower( $label ), 'value' )
					|| str_contains( strtolower( $label ), 'total' )
						? 'money'
						: 'text',
			);
		}

		return array() === $columns ? $common : $columns;
	}

	/**
	 * @param array<string, mixed> $filters Sanitized filters.
	 * @return array<string, mixed>
	 */
	private function query_plan( string $report, array $filters ): array {
		return array(
			'tables'           => $this->tables( $report ),
			'filters'          => $filters,
			'pagination'       => array(
				'limit'  => $filters['page_size'],
				'offset' => ( $filters['page'] - 1 ) * $filters['page_size'],
			),
			'defer_heavy_rows' => true,
		);
	}

	/**
	 * @return list<string>
	 */
	private function tables( string $report ): array {
		return match ( $report ) {
			'customers' => array( 'tcg_customers', 'tcg_customer_credit_ledger' ),
			'sales' => array( 'woocommerce_orders', 'tcg_inventory_items' ),
			'inventory' => array( 'tcg_inventory_items' ),
			'trade_ins' => array( 'tcg_buylist_submissions', 'tcg_buylist_items', 'tcg_customer_credit_ledger' ),
			'fulfillment' => array( 'woocommerce_orders', 'tcg_inventory_items' ),
			'scrydex' => array( 'tcg_provider_price_observations', 'tcg_sync_checkpoints' ),
			'square_reconciliation' => array( 'tcg_pos_payment_transactions', 'tcg_inventory_external_mappings' ),
			'audit' => array( 'tcg_audit_log' ),
			default => array( 'tcg_inventory_items' ),
		};
	}

	private function csv_cell( string $value ): string {
		return '"' . str_replace( '"', '""', $value ) . '"';
	}

	private function date( mixed $value ): string {
		$value = trim( (string) $value );

		return 1 === preg_match( '/^\d{4}-\d{2}-\d{2}$/', $value ) ? $value : '';
	}

	private function positive_int_or_zero( mixed $value ): int {
		return is_numeric( $value ) ? max( 0, (int) $value ) : 0;
	}

	private function slug( mixed $value ): string {
		return strtolower( trim( preg_replace( '/[^a-zA-Z0-9_-]+/', '', (string) $value ) ?? '' ) );
	}

	private function short_text( mixed $value ): string {
		return substr( trim( preg_replace( '/\s+/', ' ', (string) $value ) ?? '' ), 0, 64 );
	}
}
