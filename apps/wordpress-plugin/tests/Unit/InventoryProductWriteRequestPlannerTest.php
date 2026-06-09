<?php
/**
 * WooCommerce inventory product write request planner tests.
 *
 * @package TCGStorePlatform
 */

namespace TCGStorePlatform\Tests\Unit;

use TCGStorePlatform\Tests\TestCase;
use TCGStorePlatform\WooCommerce\InventoryProductProjectionPlan;
use TCGStorePlatform\WooCommerce\InventoryProductProjectionPlanner;
use TCGStorePlatform\WooCommerce\InventoryProductWriteRequestPlan;
use TCGStorePlatform\WooCommerce\InventoryProductWriteRequestPlanner;

final class InventoryProductWriteRequestPlannerTest extends TestCase {
	public function test_planner_prepares_non_production_create_product_request(): void {
		$projection = ( new InventoryProductProjectionPlanner() )->plan_row(
			$this->available_row(),
			array( 'store_currency' => 'USD' )
		);
		$plan       = ( new InventoryProductWriteRequestPlanner() )->plan(
			$projection,
			array( 'environment' => 'staging' )
		);
		$requests   = $plan->request_plan()['requests'];
		$audit      = $plan->audit_payload();

		$this->assert_same( InventoryProductWriteRequestPlan::READY, $plan->status() );
		$this->assert_true( $plan->is_ready() );
		$this->assert_same( 'woocommerce_product_write_request_ready', $plan->code() );
		$this->assert_same( 'staging', $plan->environment() );
		$this->assert_same( 1, count( $requests ) );
		$this->assert_same( 'create_product', $requests[0]['operation'] );
		$this->assert_same( 'POST', $requests[0]['method'] );
		$this->assert_same( '/wp-json/wc/v3/products', $requests[0]['path'] );
		$this->assert_same( 'PKM-BASE-004-HOLO', $requests[0]['body']['sku'] );
		$this->assert_same( '125.00', $requests[0]['body']['regular_price'] );
		$this->assert_same(
			array( 'woocommerce:product-projection:card-public-42:v7:woocommerce:0' ),
			$plan->idempotency_keys()
		);
		$this->assert_same( array(), $plan->external_ids()['product_ids'] );
		$this->assert_same( array( 'PKM-BASE-004-HOLO' ), $plan->external_ids()['skus'] );
		$this->assert_true( $audit['woocommerce_write_deferred'] );
		$this->assert_true( $audit['wordpress_crud_write_deferred'] );
		$this->assert_true( $audit['production_woocommerce_write_deferred'] );
		$this->assert_true( $audit['payment_capture_deferred'] );
		$this->assert_true( $audit['square_inventory_write_deferred'] );
	}

	public function test_planner_prepares_update_and_stockout_requests_for_existing_product(): void {
		$row                           = $this->available_row();
		$row['woocommerce_product_id'] = 1001;

		$update = ( new InventoryProductWriteRequestPlanner() )->plan(
			( new InventoryProductProjectionPlanner() )->plan_row( $row )
		);

		$row['status'] = 'sold';
		$stockout      = ( new InventoryProductWriteRequestPlanner() )->plan(
			( new InventoryProductProjectionPlanner() )->plan_row( $row )
		);

		$this->assert_same( InventoryProductWriteRequestPlan::READY, $update->status() );
		$this->assert_same( 'update_product', $update->request_plan()['requests'][0]['operation'] );
		$this->assert_same( 'PUT', $update->request_plan()['requests'][0]['method'] );
		$this->assert_same( '/wp-json/wc/v3/products/1001', $update->request_plan()['requests'][0]['path'] );
		$this->assert_same( array( 1001 ), $update->external_ids()['product_ids'] );

		$this->assert_same( InventoryProductWriteRequestPlan::READY, $stockout->status() );
		$this->assert_same( 'mark_product_out_of_stock', $stockout->request_plan()['requests'][0]['operation'] );
		$this->assert_same( 0, $stockout->request_plan()['requests'][0]['body']['stock_quantity'] );
		$this->assert_same( 'outofstock', $stockout->request_plan()['requests'][0]['body']['stock_status'] );
	}

	public function test_planner_skips_hidden_unmapped_projection_without_requests(): void {
		$row                      = $this->available_row();
		$row['online_visibility'] = 'hidden';
		$projection               = ( new InventoryProductProjectionPlanner() )->plan_row( $row );
		$plan                     = ( new InventoryProductWriteRequestPlanner() )->plan( $projection );

		$this->assert_same( InventoryProductProjectionPlan::SKIPPED, $projection->status() );
		$this->assert_same( InventoryProductWriteRequestPlan::SKIPPED, $plan->status() );
		$this->assert_true( $plan->is_skipped() );
		$this->assert_same(
			array(
				'requests'                      => array(),
				'request_count'                 => 0,
				'woocommerce_write_deferred'    => true,
				'wordpress_crud_write_deferred' => true,
				'production_write_approved'     => false,
			),
			$plan->request_plan()
		);
		$this->assert_same( array( $projection->idempotency_key() ), $plan->idempotency_keys() );
	}

	public function test_planner_rejects_production_environment_and_failed_projection(): void {
		$row                           = $this->available_row();
		$row['barcode']                = '';
		$row['sale_price_minor_units'] = null;
		$projection                    = ( new InventoryProductProjectionPlanner() )->plan_row( $row );
		$plan                          = ( new InventoryProductWriteRequestPlanner() )->plan(
			$projection,
			array( 'environment' => 'production' )
		);

		$this->assert_same( InventoryProductWriteRequestPlan::REJECTED, $plan->status() );
		$this->assert_true( $plan->is_rejected() );
		$this->assert_same(
			array(
				'woocommerce_product_write_non_production_environment_required',
				'woocommerce_product_projection_failed',
			),
			$plan->errors()
		);
		$this->assert_same( array(), $plan->request_plan() );
		$this->assert_true( $plan->audit_payload()['woocommerce_write_deferred'] );
	}

	public function test_planner_allows_approved_production_product_sync_without_payment_or_square_writes(): void {
		$projection = ( new InventoryProductProjectionPlanner() )->plan_row(
			$this->available_row(),
			array( 'store_currency' => 'USD' )
		);
		$plan       = ( new InventoryProductWriteRequestPlanner() )->plan(
			$projection,
			array(
				'environment'               => 'production',
				'production_write_approval' => 'woocommerce-product-sync',
			)
		);
		$audit      = $plan->audit_payload();

		$this->assert_same( InventoryProductWriteRequestPlan::READY, $plan->status() );
		$this->assert_true( $plan->is_ready() );
		$this->assert_same( 'approved_production_product_sync', $plan->request_plan()['requests'][0]['write_scope'] );
		$this->assert_true( $audit['production_write_approved'] );
		$this->assert_false( $audit['production_woocommerce_write_deferred'] );
		$this->assert_true( $audit['payment_capture_deferred'] );
		$this->assert_true( $audit['square_inventory_write_deferred'] );
	}

	/**
	 * @return array<string, mixed>
	 */
	private function available_row(): array {
		return array(
			'inventory_id'           => 42,
			'public_id'              => 'card-public-42',
			'game'                   => 'pokemon',
			'card_name'              => 'Charizard',
			'set_name'               => 'Base Set',
			'set_code'               => 'BASE',
			'card_number'            => '4',
			'rarity'                 => 'Rare Holo',
			'finish'                 => 'Holo',
			'condition_code'         => 'NM',
			'raw_or_graded'          => 'raw',
			'barcode'                => 'PKM-BASE-004-HOLO',
			'sale_price_minor_units' => 12500,
			'sale_currency'          => 'USD',
			'status'                 => 'available',
			'online_visibility'      => 'visible',
			'row_version'            => 7,
		);
	}
}
