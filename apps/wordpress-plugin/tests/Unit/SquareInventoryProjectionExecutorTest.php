<?php
/**
 * Square inventory projection executor tests.
 *
 * @package TCGStorePlatform
 */

namespace TCGStorePlatform\Tests\Unit;

use TCGStorePlatform\Square\SquareInventoryProjectionExecutionResult;
use TCGStorePlatform\Square\SquareInventoryProjectionExecutor;
use TCGStorePlatform\Square\SquareInventoryProjectionPlan;
use TCGStorePlatform\Square\SquareInventoryProjectionPlanner;
use TCGStorePlatform\Square\SquareInventorySyncRequestPlanner;
use TCGStorePlatform\Tests\TestCase;

final class SquareInventoryProjectionExecutorTest extends TestCase {
	public function test_executor_blocks_ready_projection_by_default(): void {
		$plan   = ( new SquareInventoryProjectionPlanner() )->plan_row(
			$this->available_row(),
			array(
				'square_location_id' => 'L-SANDBOX-1',
				'occurred_at'        => '2026-06-07T12:00:00Z',
			)
		);
		$result = ( new SquareInventoryProjectionExecutor() )->execute( $plan );
		$audit  = $result->audit_payload();

		$this->assert_same( SquareInventoryProjectionExecutionResult::STATUS_BLOCKED, $result->status() );
		$this->assert_true( $result->is_blocked() );
		$this->assert_false( $result->is_executed() );
		$this->assert_same( 2, $result->operation_count() );
		$this->assert_same( 0, $result->executed_operation_count() );
		$this->assert_true( in_array( 'square_inventory_projection_execution_disabled', $result->block_reasons(), true ) );
		$this->assert_true( in_array( 'explicit_square_inventory_execution_required', $result->block_reasons(), true ) );
		$this->assert_true( in_array( 'square_catalog_writer_deferred', $result->block_reasons(), true ) );
		$this->assert_true( in_array( 'square_inventory_writer_deferred', $result->block_reasons(), true ) );
		$this->assert_true( $audit['provider_inventory_write_deferred'] );
		$this->assert_true( $audit['network_request_deferred'] );
		$this->assert_same( 'ready', $audit['square_sync_request_status'] );
		$this->assert_true( $audit['square_sync_request_ready'] );
		$this->assert_same(
			array(
				'square:inventory-projection:card-public-42:v7',
				'square:inventory-projection:card-public-42:v7:inventory',
			),
			$audit['square_sync_request_idempotency_keys']
		);
		$this->assert_same( '/v2/catalog/batch-upsert', $audit['square_sync_request_plan']['catalog_batch_upsert']['path'] );
		$this->assert_same( '/v2/inventory/changes/batch-create', $audit['square_sync_request_plan']['inventory_batch_change']['path'] );
		$this->assert_true( $audit['payment_capture_deferred'] );
		$this->assert_same( 'required_for_payments', $audit['official_square_payment_extension'] );
		$this->assert_same( 'official_woocommerce_square_extension', $audit['payment_capture_authority'] );
		$this->assert_false( $audit['plugin_square_payment_capture_allowed'] );
		$this->assert_same( 'delegated_to_official_extension', $audit['plugin_square_payment_gateway_mode'] );
	}

	public function test_executor_skips_skipped_projection_without_writers(): void {
		$row                   = $this->available_row();
		$row['pos_visibility'] = 'hidden';
		$plan                  = ( new SquareInventoryProjectionPlanner() )->plan_row(
			$row,
			array( 'square_location_id' => 'L-SANDBOX-1' )
		);
		$result                = ( new SquareInventoryProjectionExecutor( true ) )->execute( $plan );

		$this->assert_same( SquareInventoryProjectionPlan::SKIPPED, $plan->status() );
		$this->assert_same( SquareInventoryProjectionExecutionResult::STATUS_SKIPPED, $result->status() );
		$this->assert_true( $result->is_skipped() );
		$this->assert_same( 0, $result->operation_count() );
		$this->assert_same( array(), $result->block_reasons() );
		$audit = $result->audit_payload();

		$this->assert_true( $audit['provider_inventory_write_deferred'] );
		$this->assert_same( 'skipped', $audit['square_sync_request_status'] );
	}

	public function test_executor_rejects_failed_projection_before_writers(): void {
		$called                        = false;
		$row                           = $this->available_row();
		$row['sku']                    = '';
		$row['barcode']                = '';
		$row['sale_price_minor_units'] = null;
		$plan                          = ( new SquareInventoryProjectionPlanner() )->plan_row( $row );
		$result                        = ( new SquareInventoryProjectionExecutor(
			true,
			function () use ( &$called ): array {
				$called = true;

				return array( 'status' => 'written' );
			},
			function () use ( &$called ): array {
				$called = true;

				return array( 'status' => 'written' );
			}
		) )->execute( $plan );

		$this->assert_same( SquareInventoryProjectionPlan::FAILED, $plan->status() );
		$this->assert_same( SquareInventoryProjectionExecutionResult::STATUS_REJECTED, $result->status() );
		$this->assert_true( $result->is_rejected() );
		$this->assert_false( $called );
		$this->assert_true( in_array( 'square_inventory_projection_plan_failed', $result->errors(), true ) );
		$this->assert_true( in_array( 'barcode_or_sku_required', $result->errors(), true ) );
		$this->assert_same( 'rejected', $result->audit_payload()['square_sync_request_status'] );
	}

	public function test_executor_rejects_production_request_context_before_writers(): void {
		$called = false;
		$plan   = ( new SquareInventoryProjectionPlanner() )->plan_row(
			$this->available_row(),
			array( 'square_location_id' => 'L-SANDBOX-1' )
		);
		$result = ( new SquareInventoryProjectionExecutor(
			true,
			function () use ( &$called ): array {
				$called = true;

				return array( 'status' => 'written' );
			},
			function () use ( &$called ): array {
				$called = true;

				return array( 'status' => 'written' );
			},
			new SquareInventorySyncRequestPlanner(),
			array(
				'environment'            => 'production',
				'credential_environment' => 'production',
			)
		) )->execute( $plan );
		$audit  = $result->audit_payload();

		$this->assert_same( SquareInventoryProjectionExecutionResult::STATUS_REJECTED, $result->status() );
		$this->assert_false( $called );
		$this->assert_true( in_array( 'square_inventory_sync_request_rejected', $result->errors(), true ) );
		$this->assert_true( in_array( 'square_inventory_sync_sandbox_environment_required', $result->errors(), true ) );
		$this->assert_true( in_array( 'square_inventory_sync_production_credentials_rejected', $result->errors(), true ) );
		$this->assert_same( 'rejected', $audit['square_sync_request_status'] );
		$this->assert_same( array(), $audit['square_sync_request_plan'] );
		$this->assert_true( $audit['provider_inventory_write_deferred'] );
	}

	public function test_executor_runs_enabled_projection_with_configured_writers(): void {
		$catalog_payloads   = array();
		$inventory_payloads = array();
		$plan               = ( new SquareInventoryProjectionPlanner() )->plan_row(
			$this->available_row(),
			array(
				'square_location_id' => 'L-SANDBOX-1',
				'occurred_at'        => '2026-06-07T12:00:00Z',
			)
		);
		$result             = ( new SquareInventoryProjectionExecutor(
			true,
			function ( array $catalog_object, SquareInventoryProjectionPlan $received_plan, int $index ) use ( &$catalog_payloads, $plan ): array {
				$this->assert_same( $plan, $received_plan );
				$this->assert_same( 0, $index );
				$catalog_payloads[] = $catalog_object;

				return array(
					'status'            => 'written',
					'catalog_object_id' => 'SQUARE-ITEM-1',
				);
			},
			function ( array $inventory_change, SquareInventoryProjectionPlan $received_plan, int $index ) use ( &$inventory_payloads, $plan ): array {
				$this->assert_same( $plan, $received_plan );
				$this->assert_same( 0, $index );
				$inventory_payloads[] = $inventory_change;

				return array(
					'status'            => 'written',
					'catalog_object_id' => 'SQUARE-VARIATION-1',
				);
			}
		) )->execute( $plan );
		$audit              = $result->audit_payload();

		$this->assert_same( SquareInventoryProjectionExecutionResult::STATUS_EXECUTED, $result->status() );
		$this->assert_true( $result->is_executed() );
		$this->assert_same( 1, count( $catalog_payloads ) );
		$this->assert_same( 1, count( $inventory_payloads ) );
		$this->assert_same( 2, $result->executed_operation_count() );
		$this->assert_same( array( 'SQUARE-ITEM-1', 'SQUARE-VARIATION-1' ), $result->catalog_object_ids() );
		$this->assert_false( $audit['provider_inventory_write_deferred'] );
		$this->assert_false( $audit['network_request_deferred'] );
		$this->assert_same( 'ready', $audit['square_sync_request_status'] );
		$this->assert_same( '/v2/catalog/batch-upsert', $audit['square_sync_request_plan']['catalog_batch_upsert']['path'] );
		$this->assert_true( $audit['production_provider_write_deferred'] );
		$this->assert_true( $audit['payment_capture_deferred'] );
		$this->assert_same( 'official_woocommerce_square_extension', $audit['payment_capture_authority'] );
		$this->assert_false( $audit['plugin_square_payment_capture_allowed'] );
		$this->assert_same( 'catalog_upsert', $audit['operation_results'][0]['operation'] );
		$this->assert_same( 'inventory_change', $audit['operation_results'][1]['operation'] );
	}

	public function test_executor_rejects_writer_failure_without_confirming_ids(): void {
		$plan   = ( new SquareInventoryProjectionPlanner() )->plan_row(
			$this->available_row(),
			array( 'square_location_id' => 'L-SANDBOX-1' )
		);
		$result = ( new SquareInventoryProjectionExecutor(
			true,
			static fn (): array => array( 'status' => 'written' ),
			static fn (): array => array(
				'status'            => 'failed',
				'catalog_object_id' => 'SQUARE-VARIATION-1',
			)
		) )->execute( $plan );
		$audit  = $result->audit_payload();

		$this->assert_same( SquareInventoryProjectionExecutionResult::STATUS_REJECTED, $result->status() );
		$this->assert_true( in_array( 'square_projection_writer_failed', $result->errors(), true ) );
		$this->assert_same( array(), $result->catalog_object_ids() );
		$this->assert_true( $audit['provider_inventory_write_deferred'] );
		$this->assert_same( 'failed', $audit['operation_results'][1]['status'] );
	}

	/**
	 * @return array<string, mixed>
	 */
	private function available_row(): array {
		return array(
			'inventory_id'            => 42,
			'public_id'               => 'card-public-42',
			'game'                    => 'pokemon',
			'card_name'               => 'Charizard',
			'set_name'                => 'Base Set',
			'set_code'                => 'BASE',
			'card_number'             => '4',
			'rarity'                  => 'Rare Holo',
			'finish'                  => 'Holo',
			'condition_code'          => 'NM',
			'raw_or_graded'           => 'raw',
			'barcode'                 => 'PKM-BASE-004-HOLO',
			'sku'                     => 'PKM-BASE-004-HOLO',
			'sale_price_minor_units'  => 12500,
			'sale_currency'           => 'USD',
			'status'                  => 'available',
			'pos_visibility'          => 'visible',
			'row_version'             => 7,
		);
	}
}
