<?php
/**
 * Square inventory sync readiness planner tests.
 *
 * @package TCGStorePlatform
 */

namespace TCGStorePlatform\Tests\Unit;

use TCGStorePlatform\Square\SquareInventorySyncReadinessPlanner;
use TCGStorePlatform\Tests\TestCase;

final class SquareInventorySyncReadinessPlannerTest extends TestCase {
	public function test_default_probe_reports_ready_planning_with_execution_deferred(): void {
		$plan = ( new SquareInventorySyncReadinessPlanner() )->plan();

		$this->assert_same( 'ready', $plan['status'] );
		$this->assert_true( $plan['inventory_sync_planning_ready'] );
		$this->assert_true( $plan['projection_planner_ready'] );
		$this->assert_true( $plan['sync_request_planner_ready'] );
		$this->assert_true( $plan['projection_executor_ready'] );
		$this->assert_true( $plan['probe_inventory_row_used'] );
		$this->assert_same( 'square-readiness-probe-card', $plan['probe_public_id'] );
		$this->assert_same( 'sandbox', $plan['environment'] );
		$this->assert_same( 'ready', $plan['projection_status'] );
		$this->assert_same( 'ready', $plan['sync_request_status'] );
		$this->assert_true( $plan['sync_request_ready'] );
		$this->assert_same( 'blocked', $plan['execution_status'] );
		$this->assert_false( $plan['execution_enabled'] );
		$this->assert_false( $plan['catalog_writer_configured'] );
		$this->assert_false( $plan['inventory_writer_configured'] );
		$this->assert_same( 2, $plan['projection_operation_count'] );
		$this->assert_same( '/v2/catalog/batch-upsert', $plan['sync_request_plan']['catalog_batch_upsert']['path'] );
		$this->assert_same( '/v2/inventory/batch-change', $plan['sync_request_plan']['inventory_batch_change']['path'] );
		$this->assert_true( in_array( 'square_inventory_projection_execution_disabled', $plan['block_reasons'], true ) );
		$this->assert_true( in_array( 'square_catalog_writer_deferred', $plan['block_reasons'], true ) );
		$this->assert_true( in_array( 'square_inventory_writer_deferred', $plan['block_reasons'], true ) );
		$this->assert_true( $plan['network_request_deferred'] );
		$this->assert_true( $plan['provider_inventory_write_deferred'] );
		$this->assert_true( $plan['production_network_request_deferred'] );
		$this->assert_true( $plan['payment_capture_deferred'] );
		$this->assert_same( 'official_woocommerce_square_extension', $plan['payment_capture_authority'] );
		$this->assert_false( $plan['plugin_square_payment_capture_allowed'] );
		$this->assert_same( 'catalog_inventory_projection_and_reconciliation_only', $plan['square_inventory_sync_scope'] );
	}

	public function test_production_context_is_rejected_before_network_writes(): void {
		$plan = ( new SquareInventorySyncReadinessPlanner() )->plan(
			array(
				'environment'            => 'production',
				'credential_environment' => 'production',
				'access_token'           => 'prod-square-token',
			)
		);

		$this->assert_same( 'blocked', $plan['status'] );
		$this->assert_false( $plan['inventory_sync_planning_ready'] );
		$this->assert_same( 'rejected', $plan['sync_request_status'] );
		$this->assert_true( in_array( 'square_inventory_sync_planning_not_ready', $plan['block_reasons'], true ) );
		$this->assert_true( in_array( 'square_inventory_sync_sandbox_environment_required', $plan['configuration_issues'], true ) );
		$this->assert_true( in_array( 'square_inventory_sync_production_credentials_rejected', $plan['configuration_issues'], true ) );
		$this->assert_true( $plan['network_request_deferred'] );
		$this->assert_true( $plan['production_provider_write_deferred'] );
		$this->assert_true( $plan['payment_capture_deferred'] );
	}

	public function test_supplied_inventory_row_is_reported_without_using_probe_identity(): void {
		$plan = ( new SquareInventorySyncReadinessPlanner() )->plan(
			array(
				'environment'        => 'sandbox',
				'square_location_id' => 'L-SANDBOX-1',
			),
			array(
				'inventory_id'            => 52,
				'public_id'               => 'card-public-52',
				'game'                    => 'pokemon',
				'card_name'               => 'Blastoise',
				'set_name'                => 'Base Set',
				'set_code'                => 'BASE',
				'card_number'             => '2',
				'rarity'                  => 'Rare Holo',
				'finish'                  => 'Holo',
				'condition_code'          => 'NM',
				'raw_or_graded'           => 'raw',
				'barcode'                 => 'PKM-BASE-002-HOLO',
				'sku'                     => 'PKM-BASE-002-HOLO',
				'sale_price_minor_units'  => 8500,
				'sale_currency'           => 'USD',
				'status'                  => 'available',
				'pos_visibility'          => 'visible',
				'row_version'             => 3,
			)
		);

		$this->assert_same( 'ready', $plan['status'] );
		$this->assert_false( $plan['probe_inventory_row_used'] );
		$this->assert_same( 'card-public-52', $plan['probe_public_id'] );
		$this->assert_true( in_array( 'PKM-BASE-002-HOLO', $plan['sync_request_external_ids']['skus'], true ) );
		$this->assert_same( 2, count( $plan['sync_request_idempotency_keys'] ) );
	}
}
