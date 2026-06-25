<?php
/**
 * POS/payment fee snapshot query planner tests.
 *
 * @package TCGStorePlatform
 */

namespace TCGStorePlatform\Tests\Unit;

use TCGStorePlatform\Payments\PosPaymentFeeSnapshotQueryPlanner;
use TCGStorePlatform\Tests\TestCase;

final class PosPaymentFeeSnapshotQueryPlannerTest extends TestCase {
	public function test_planner_builds_safe_fee_snapshot_query_contract_without_execution(): void {
		$plan     = ( new PosPaymentFeeSnapshotQueryPlanner() )->plan(
			array(
				'provider'     => 'square-sandbox',
				'channel'      => 'pos',
				'currency'     => 'usd',
				'effective_on' => '2026-06-07',
				'page_size'    => '250',
			),
			'wp_'
		);
		$contract = $plan->query_contract();
		$audit    = $plan->audit_payload();

		$this->assert_true( $plan->is_valid() );
		$this->assert_same( 'wp_tcg_payment_fee_snapshots', $plan->table_name() );
		$this->assert_same( 'square-sandbox', $plan->filters()['provider'] );
		$this->assert_same( 'pos', $plan->filters()['channel'] );
		$this->assert_same( 'USD', $plan->filters()['currency'] );
		$this->assert_same( '2026-06-07', $plan->filters()['effective_on'] );
		$this->assert_same( 100, $plan->limit() );
		$this->assert_true( in_array( 'percentage_basis_points', $plan->selected_columns(), true ) );
		$this->assert_same( 'DESC', $plan->order_by()['effective_from'] );
		$this->assert_true( $contract['query_ready'] );
		$this->assert_true( $contract['read_execution_deferred'] );
		$this->assert_true( $contract['route_registration_deferred'] );
		$this->assert_same( 'pos_payment_fee_snapshot_query_planned', $audit['action'] );
		$this->assert_same( 4, $audit['filter_count'] );
		$this->assert_true( $audit['provider_capture_deferred'] );
		$this->assert_true( $audit['woocommerce_gateway_capture_deferred'] );
	}

	public function test_planner_rejects_invalid_filters_without_table_contract(): void {
		$plan = ( new PosPaymentFeeSnapshotQueryPlanner() )->plan(
			array(
				'provider'     => 'Square Sandbox',
				'channel'      => 'pos!',
				'currency'     => 'US',
				'effective_on' => '2026-02-31',
				'page_size'    => 'zero',
			),
			'wp;drop_'
		);

		$this->assert_false( $plan->is_valid() );
		$this->assert_same( '', $plan->table_name() );
		$this->assert_true( in_array( 'table_prefix_invalid', $plan->errors(), true ) );
		$this->assert_true( in_array( 'provider_invalid', $plan->errors(), true ) );
		$this->assert_true( in_array( 'channel_invalid', $plan->errors(), true ) );
		$this->assert_true( in_array( 'currency_invalid', $plan->errors(), true ) );
		$this->assert_true( in_array( 'effective_on_invalid', $plan->errors(), true ) );
		$this->assert_true( in_array( 'limit_invalid', $plan->errors(), true ) );
	}
}
