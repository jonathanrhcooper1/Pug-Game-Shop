<?php
/**
 * WooCommerce inventory product projection executor tests.
 *
 * @package TCGStorePlatform
 */

namespace TCGStorePlatform\Tests\Unit;

use TCGStorePlatform\Tests\TestCase;
use TCGStorePlatform\WooCommerce\InventoryProductProjectionExecutionResult;
use TCGStorePlatform\WooCommerce\InventoryProductProjectionExecutor;
use TCGStorePlatform\WooCommerce\InventoryProductProjectionPlan;
use TCGStorePlatform\WooCommerce\InventoryProductProjectionPlanner;

final class InventoryProductProjectionExecutorTest extends TestCase {
	public function test_executor_blocks_ready_projection_by_default(): void {
		$plan   = ( new InventoryProductProjectionPlanner() )->plan_row( $this->available_row() );
		$result = ( new InventoryProductProjectionExecutor() )->execute( $plan );
		$audit  = $result->audit_payload();

		$this->assert_same( InventoryProductProjectionExecutionResult::STATUS_BLOCKED, $result->status() );
		$this->assert_true( $result->is_blocked() );
		$this->assert_false( $result->is_executed() );
		$this->assert_same( 1, $result->operation_count() );
		$this->assert_same( 0, $result->executed_operation_count() );
		$this->assert_true( in_array( 'woocommerce_product_projection_execution_disabled', $result->block_reasons(), true ) );
		$this->assert_true( in_array( 'explicit_woocommerce_projection_execution_required', $result->block_reasons(), true ) );
		$this->assert_true( in_array( 'woocommerce_product_writer_deferred', $result->block_reasons(), true ) );
		$this->assert_true( $audit['woocommerce_write_deferred'] );
		$this->assert_true( $audit['production_woocommerce_write_deferred'] );
		$this->assert_true( $audit['payment_capture_deferred'] );
		$this->assert_same( 'tcg_store_platform', $audit['source_of_truth'] );
	}

	public function test_executor_skips_skipped_projection_without_writer(): void {
		$row                      = $this->available_row();
		$row['online_visibility'] = 'hidden';
		$plan                     = ( new InventoryProductProjectionPlanner() )->plan_row( $row );
		$result                   = ( new InventoryProductProjectionExecutor( true ) )->execute( $plan );

		$this->assert_same( InventoryProductProjectionPlan::SKIPPED, $plan->status() );
		$this->assert_same( InventoryProductProjectionExecutionResult::STATUS_SKIPPED, $result->status() );
		$this->assert_true( $result->is_skipped() );
		$this->assert_same( 0, $result->operation_count() );
		$this->assert_same( array(), $result->block_reasons() );
		$this->assert_true( $result->audit_payload()['woocommerce_write_deferred'] );
	}

	public function test_executor_rejects_failed_projection_before_writer(): void {
		$called                         = false;
		$row                            = $this->available_row();
		$row['sku']                     = '';
		$row['barcode']                 = '';
		$row['sale_price_minor_units']  = null;
		$plan                           = ( new InventoryProductProjectionPlanner() )->plan_row( $row );
		$result                         = ( new InventoryProductProjectionExecutor(
			true,
			function () use ( &$called ): array {
				$called = true;

				return array( 'status' => 'written' );
			}
		) )->execute( $plan );

		$this->assert_same( InventoryProductProjectionPlan::FAILED, $plan->status() );
		$this->assert_same( InventoryProductProjectionExecutionResult::STATUS_REJECTED, $result->status() );
		$this->assert_true( $result->is_rejected() );
		$this->assert_false( $called );
		$this->assert_true( in_array( 'woocommerce_product_projection_plan_failed', $result->errors(), true ) );
		$this->assert_true( in_array( 'barcode_or_sku_required', $result->errors(), true ) );
	}

	public function test_executor_runs_enabled_projection_with_configured_writer(): void {
		$written_operations = array();
		$plan               = ( new InventoryProductProjectionPlanner() )->plan_row( $this->available_row() );
		$result             = ( new InventoryProductProjectionExecutor(
			true,
			function ( array $operation, InventoryProductProjectionPlan $received_plan, int $index ) use ( &$written_operations, $plan ): array {
				$this->assert_same( $plan, $received_plan );
				$this->assert_same( 0, $index );
				$written_operations[] = $operation;

				return array(
					'status'     => 'written',
					'product_id' => 2001,
				);
			}
		) )->execute( $plan );
		$audit              = $result->audit_payload();

		$this->assert_same( InventoryProductProjectionExecutionResult::STATUS_EXECUTED, $result->status() );
		$this->assert_true( $result->is_executed() );
		$this->assert_same( 1, count( $written_operations ) );
		$this->assert_same( 1, $result->executed_operation_count() );
		$this->assert_same( array( 2001 ), $result->product_ids() );
		$this->assert_false( $audit['woocommerce_write_deferred'] );
		$this->assert_true( $audit['production_woocommerce_write_deferred'] );
		$this->assert_true( $audit['external_network_request_deferred'] );
		$this->assert_same( 'create_product', $audit['operation_results'][0]['operation'] );
	}

	public function test_executor_rejects_writer_failure_without_leaking_payload(): void {
		$plan   = ( new InventoryProductProjectionPlanner() )->plan_row( $this->available_row() );
		$result = ( new InventoryProductProjectionExecutor(
			true,
			static fn (): array => array(
				'status'     => 'failed',
				'product_id' => 2001,
			)
		) )->execute( $plan );
		$audit  = $result->audit_payload();

		$this->assert_same( InventoryProductProjectionExecutionResult::STATUS_REJECTED, $result->status() );
		$this->assert_true( in_array( 'woocommerce_product_writer_failed', $result->errors(), true ) );
		$this->assert_same( array(), $result->product_ids() );
		$this->assert_true( $audit['woocommerce_write_deferred'] );
		$this->assert_same( 'failed', $audit['operation_results'][0]['status'] );
	}

	/**
	 * @return array<string, mixed>
	 */
	private function available_row(): array {
		return array(
			'inventory_id'             => 42,
			'public_id'                => 'card-public-42',
			'game'                     => 'pokemon',
			'card_name'                => 'Charizard',
			'set_name'                 => 'Base Set',
			'set_code'                 => 'BASE',
			'card_number'              => '4',
			'rarity'                   => 'Rare Holo',
			'finish'                   => 'Holo',
			'condition_code'           => 'NM',
			'raw_or_graded'            => 'raw',
			'barcode'                  => 'PKM-BASE-004-HOLO',
			'sku'                      => 'PKM-BASE-004-HOLO',
			'sale_price_minor_units'   => 12500,
			'sale_currency'            => 'USD',
			'status'                   => 'available',
			'online_visibility'        => 'visible',
			'row_version'              => 7,
		);
	}
}
