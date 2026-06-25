<?php
/**
 * Square inventory sync request planner tests.
 *
 * @package TCGStorePlatform
 */

namespace TCGStorePlatform\Tests\Unit;

use TCGStorePlatform\Square\SquareInventoryProjectionPlan;
use TCGStorePlatform\Square\SquareInventoryProjectionPlanner;
use TCGStorePlatform\Square\SquareInventorySyncRequestPlan;
use TCGStorePlatform\Square\SquareInventorySyncRequestPlanner;
use TCGStorePlatform\Tests\TestCase;

final class SquareInventorySyncRequestPlannerTest extends TestCase {
	public function test_planner_prepares_sandbox_catalog_and_inventory_request_plan(): void {
		$projection = ( new SquareInventoryProjectionPlanner() )->plan_row(
			$this->available_row(),
			array(
				'square_location_id' => 'L-SANDBOX-1',
				'occurred_at'        => '2026-06-07T12:00:00Z',
			)
		);
		$plan       = ( new SquareInventorySyncRequestPlanner() )->plan(
			$projection,
			array(
				'environment'            => 'sandbox',
				'credential_environment' => 'sandbox',
				'access_token'           => 'EAAA-sandbox-token',
			)
		);
		$requests   = $plan->request_plan();
		$audit      = $plan->audit_payload();

		$this->assert_same( SquareInventorySyncRequestPlan::READY, $plan->status() );
		$this->assert_true( $plan->is_ready() );
		$this->assert_same( 'square_inventory_sync_request_ready', $plan->code() );
		$this->assert_same( 'sandbox', $plan->environment() );
		$this->assert_same(
			array(
				'square:inventory-projection:card-public-42:v7',
				'square:inventory-projection:card-public-42:v7:inventory',
			),
			$plan->idempotency_keys()
		);
		$this->assert_same( 'POST', $requests['catalog_batch_upsert']['method'] );
		$this->assert_same( '/v2/catalog/batch-upsert', $requests['catalog_batch_upsert']['path'] );
		$this->assert_same( 'POST', $requests['inventory_batch_change']['method'] );
		$this->assert_same( '/v2/inventory/changes/batch-create', $requests['inventory_batch_change']['path'] );
		$this->assert_same( 1, count( $requests['catalog_batch_upsert']['body']['batches'][0]['objects'] ) );
		$this->assert_same( 1, count( $requests['inventory_batch_change']['body']['changes'] ) );
		$this->assert_true( $audit['network_request_deferred'] );
		$this->assert_true( $audit['provider_inventory_write_deferred'] );
		$this->assert_true( $audit['production_network_request_deferred'] );
		$this->assert_same( 'official_woocommerce_square_extension', $audit['payment_capture_authority'] );
		$this->assert_false( $audit['plugin_square_payment_capture_allowed'] );
		$this->assert_true( in_array( '#tcg-var-' . substr( hash( 'sha256', 'card-public-42' ), 0, 20 ), $plan->external_ids()['catalog_object_ids'], true ) );
		$this->assert_same( array( 'PKM-BASE-004-HOLO' ), $plan->external_ids()['skus'] );
	}

	public function test_planner_prepares_zero_count_inventory_only_request_for_unavailable_mapped_item(): void {
		$row                                  = $this->available_row();
		$row['status']                        = 'sold';
		$row['square_catalog_item_id']        = 'SQUARE-ITEM-1';
		$row['square_catalog_variation_id']   = 'SQUARE-VARIATION-1';
		$projection                           = ( new SquareInventoryProjectionPlanner() )->plan_row(
			$row,
			array(
				'square_location_id' => 'L-SANDBOX-1',
				'occurred_at'        => '2026-06-07T12:10:00Z',
			)
		);
		$plan                                 = ( new SquareInventorySyncRequestPlanner() )->plan( $projection );
		$requests                             = $plan->request_plan();

		$this->assert_same( SquareInventorySyncRequestPlan::READY, $plan->status() );
		$this->assert_same( null, $requests['catalog_batch_upsert'] );
		$this->assert_same( '/v2/inventory/changes/batch-create', $requests['inventory_batch_change']['path'] );
		$this->assert_same( 'SQUARE-VARIATION-1', $requests['inventory_batch_change']['body']['changes'][0]['physical_count']['catalog_object_id'] );
		$this->assert_same( '0', $requests['inventory_batch_change']['body']['changes'][0]['physical_count']['quantity'] );
		$this->assert_same( array( 'SQUARE-VARIATION-1' ), $plan->external_ids()['catalog_object_ids'] );
	}

	public function test_planner_skips_hidden_unmapped_projection_without_requests(): void {
		$row                   = $this->available_row();
		$row['pos_visibility'] = 'hidden';
		$projection            = ( new SquareInventoryProjectionPlanner() )->plan_row(
			$row,
			array( 'square_location_id' => 'L-SANDBOX-1' )
		);
		$plan                  = ( new SquareInventorySyncRequestPlanner() )->plan( $projection );

		$this->assert_same( SquareInventoryProjectionPlan::SKIPPED, $projection->status() );
		$this->assert_same( SquareInventorySyncRequestPlan::SKIPPED, $plan->status() );
		$this->assert_true( $plan->is_skipped() );
		$this->assert_same(
			array(
				'catalog_batch_upsert'   => null,
				'inventory_batch_change' => null,
			),
			$plan->request_plan()
		);
		$this->assert_same( array( $projection->idempotency_key() ), $plan->idempotency_keys() );
	}

	public function test_planner_rejects_production_environment_live_credentials_and_failed_projection(): void {
		$row                           = $this->available_row();
		$row['sku']                    = '';
		$row['barcode']                = '';
		$row['sale_price_minor_units'] = null;
		$projection                    = ( new SquareInventoryProjectionPlanner() )->plan_row( $row );
		$plan                          = ( new SquareInventorySyncRequestPlanner() )->plan(
			$projection,
			array(
				'environment'  => 'production',
				'access_token' => 'EAA-live-production-token',
			)
		);

		$this->assert_same( SquareInventorySyncRequestPlan::REJECTED, $plan->status() );
		$this->assert_true( $plan->is_rejected() );
		$this->assert_same(
			array(
				'square_inventory_sync_sandbox_environment_required',
				'square_inventory_sync_production_credentials_rejected',
				'square_projection_failed',
			),
			$plan->errors()
		);
		$this->assert_same( array(), $plan->request_plan() );
		$this->assert_true( $plan->audit_payload()['network_request_deferred'] );
	}

	public function test_planner_rejects_credentials_declared_as_production(): void {
		$projection = ( new SquareInventoryProjectionPlanner() )->plan_row(
			$this->available_row(),
			array( 'square_location_id' => 'L-SANDBOX-1' )
		);
		$plan       = ( new SquareInventorySyncRequestPlanner() )->plan(
			$projection,
			array(
				'environment'            => 'sandbox',
				'credential_environment' => 'production',
				'access_token'           => 'redacted-token-without-live-marker',
			)
		);

		$this->assert_same( SquareInventorySyncRequestPlan::REJECTED, $plan->status() );
		$this->assert_same(
			array( 'square_inventory_sync_production_credentials_rejected' ),
			$plan->errors()
		);
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
