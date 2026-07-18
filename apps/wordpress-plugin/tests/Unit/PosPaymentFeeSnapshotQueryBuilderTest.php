<?php
/**
 * POS/payment fee snapshot query builder tests.
 *
 * @package TCGStorePlatform
 */

namespace TCGStorePlatform\Tests\Unit;

use TCGStorePlatform\Payments\PosPaymentFeeSnapshotQueryBuilder;
use TCGStorePlatform\Payments\PosPaymentFeeSnapshotQueryPlan;
use TCGStorePlatform\Payments\PosPaymentFeeSnapshotQueryPlanner;
use TCGStorePlatform\Tests\TestCase;

final class PosPaymentFeeSnapshotQueryBuilderTest extends TestCase {
	public function test_builder_creates_prepared_fee_snapshot_select_without_execution(): void {
		$build = ( new PosPaymentFeeSnapshotQueryBuilder() )->build(
			$this->query_plan()
		);
		$query = $build->query();
		$audit = $build->audit_payload();

		$this->assert_true( $build->is_valid() );
		$this->assert_same( 'wp_tcg_payment_fee_snapshots', $build->table_name() );
		$this->assert_contains( 'SELECT `payment_fee_snapshot_id`, `public_id`, `provider`', $query['sql_template'] );
		$this->assert_contains( 'FROM `wp_tcg_payment_fee_snapshots`', $query['sql_template'] );
		$this->assert_contains( '`provider` = %s', $query['sql_template'] );
		$this->assert_contains( '`channel` = %s', $query['sql_template'] );
		$this->assert_contains( '`currency` = %s', $query['sql_template'] );
		$this->assert_contains( '`effective_from` <= %s', $query['sql_template'] );
		$this->assert_contains( '(`effective_to` IS NULL OR `effective_to` >= %s)', $query['sql_template'] );
		$this->assert_contains( 'ORDER BY `effective_from` DESC, `payment_fee_snapshot_id` DESC LIMIT %d', $query['sql_template'] );
		$this->assert_same( array( 'square-sandbox', 'pos', 'USD', '2026-06-07', '2026-06-07', 100 ), $query['prepare_args'] );
		$this->assert_true( $query['read_execution_deferred'] );
		$this->assert_true( $query['fee_snapshot_repository_deferred'] );
		$this->assert_true( $query['route_registration_deferred'] );
		$this->assert_same( 6, $build->prepare_arg_count() );
		$this->assert_same( 'pos_payment_fee_snapshot_query_sql_planned', $audit['action'] );
		$this->assert_same( 6, $audit['prepare_arg_count'] );
		$this->assert_true( $audit['sql_query_ready'] );
		$this->assert_true( $audit['read_execution_deferred'] );
		$this->assert_true( $audit['provider_capture_deferred'] );
	}

	public function test_builder_accepts_unfiltered_query_with_only_limit_argument(): void {
		$build = ( new PosPaymentFeeSnapshotQueryBuilder() )->build(
			( new PosPaymentFeeSnapshotQueryPlanner() )->plan( array(), 'wp_' )
		);
		$query = $build->query();

		$this->assert_true( $build->is_valid() );
		$this->assert_not_contains( 'WHERE', $query['sql_template'] );
		$this->assert_same( array( 50 ), $query['prepare_args'] );
		$this->assert_same( 1, $build->prepare_arg_count() );
	}

	public function test_builder_rejects_invalid_and_tampered_query_plans(): void {
		$invalid = ( new PosPaymentFeeSnapshotQueryBuilder() )->build(
			( new PosPaymentFeeSnapshotQueryPlanner() )->plan(
				array(
					'provider' => 'Square Sandbox',
				),
				'wp;drop_'
			)
		);

		$this->assert_false( $invalid->is_valid() );
		$this->assert_true( in_array( 'fee_snapshot_query_plan_invalid', $invalid->errors(), true ) );
		$this->assert_true( in_array( 'table_prefix_invalid', $invalid->errors(), true ) );
		$this->assert_true( in_array( 'provider_invalid', $invalid->errors(), true ) );

		$tampered = ( new PosPaymentFeeSnapshotQueryBuilder() )->build(
			PosPaymentFeeSnapshotQueryPlan::accepted(
				'wp_',
				'wp_users',
				array(
					'provider'     => 'square-sandbox',
					'channel'      => 'pos',
					'currency'     => 'usd',
					'effective_on' => 'bad date',
				),
				array( 'user_pass' ),
				array( 'effective_from' => 'ASC' ),
				500
			)
		);
		$errors   = $tampered->errors();

		$this->assert_false( $tampered->is_valid() );
		$this->assert_true( in_array( 'table_unsupported', $errors, true ) );
		$this->assert_true( in_array( 'selected_columns_unsupported', $errors, true ) );
		$this->assert_true( in_array( 'order_by_unsupported', $errors, true ) );
		$this->assert_true( in_array( 'limit_unsupported', $errors, true ) );
		$this->assert_true( in_array( 'currency_invalid', $errors, true ) );
		$this->assert_true( in_array( 'effective_on_invalid', $errors, true ) );
	}

	private function query_plan(): PosPaymentFeeSnapshotQueryPlan {
		return ( new PosPaymentFeeSnapshotQueryPlanner() )->plan(
			array(
				'provider'     => 'square-sandbox',
				'channel'      => 'pos',
				'currency'     => 'usd',
				'effective_on' => '2026-06-07',
				'page_size'    => '250',
			),
			'wp_'
		);
	}
}
