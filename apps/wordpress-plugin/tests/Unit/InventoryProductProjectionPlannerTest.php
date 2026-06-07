<?php
/**
 * WooCommerce inventory product projection planner tests.
 *
 * @package TCGStorePlatform
 */

namespace TCGStorePlatform\Tests\Unit;

use TCGStorePlatform\Tests\TestCase;
use TCGStorePlatform\WooCommerce\InventoryProductProjectionPlan;
use TCGStorePlatform\WooCommerce\InventoryProductProjectionPlanner;

final class InventoryProductProjectionPlannerTest extends TestCase {
	public function test_available_visible_item_projects_simple_serialized_product_payload(): void {
		$plan      = ( new InventoryProductProjectionPlanner() )->plan_row(
			$this->available_row(),
			array( 'store_currency' => 'USD' )
		);
		$operation = $plan->product_operations()[0];
		$product   = $operation['product'];
		$contract  = $plan->projection_contract();

		$this->assert_same( InventoryProductProjectionPlan::READY, $plan->status() );
		$this->assert_same( 'woocommerce_product_projection_ready', $plan->code() );
		$this->assert_true( $plan->requires_product_creation() );
		$this->assert_same( 1, $plan->operation_count() );
		$this->assert_same( 'create_product', $operation['operation'] );
		$this->assert_same( 'simple', $product['type'] );
		$this->assert_same( 'publish', $product['status'] );
		$this->assert_same( 'pokemon - Charizard - Base Set - 4', $product['name'] );
		$this->assert_same( 'PKM-BASE-004-HOLO', $product['sku'] );
		$this->assert_same( '125.00', $product['regular_price'] );
		$this->assert_same( true, $product['manage_stock'] );
		$this->assert_same( 1, $product['stock_quantity'] );
		$this->assert_same( 'instock', $product['stock_status'] );
		$this->assert_same( true, $product['sold_individually'] );
		$this->assert_same( true, $contract['woocommerce_write_deferred'] );
		$this->assert_same( true, $contract['square_inventory_write_deferred'] );
		$this->assert_contains( 'Charizard', $product['description'] );
		$this->assert_same( 'NM / Holo / raw', $product['short_description'] );
		$this->assert_meta_value( '1', '_tcg_serialized_inventory', $product['meta_data'] );
		$this->assert_meta_value( 'card-public-42', '_tcg_inventory_public_id', $product['meta_data'] );
		$this->assert_meta_value( 'USD', '_tcg_sale_currency', $product['meta_data'] );
	}

	public function test_existing_woocommerce_product_updates_without_recreation(): void {
		$row                           = $this->available_row();
		$row['woocommerce_product_id'] = '1001';
		$row['sale_price']             = '13.50';
		unset( $row['sale_price_minor_units'] );

		$plan      = ( new InventoryProductProjectionPlanner() )->plan_row( $row );
		$operation = $plan->product_operations()[0];
		$product   = $operation['product'];

		$this->assert_same( InventoryProductProjectionPlan::READY, $plan->status() );
		$this->assert_false( $plan->requires_product_creation() );
		$this->assert_same( 'update_product', $operation['operation'] );
		$this->assert_same( 1001, $operation['product_id'] );
		$this->assert_same( 1001, $product['id'] );
		$this->assert_same( '13.50', $product['regular_price'] );
	}

	public function test_unavailable_mapped_item_projects_stockout_update_only(): void {
		$row                           = $this->available_row();
		$row['status']                 = 'sold';
		$row['woocommerce_product_id'] = 1001;

		$plan      = ( new InventoryProductProjectionPlanner() )->plan_row( $row );
		$operation = $plan->product_operations()[0];
		$product   = $operation['product'];

		$this->assert_same( InventoryProductProjectionPlan::READY, $plan->status() );
		$this->assert_same( 'woocommerce_product_stockout_ready', $plan->code() );
		$this->assert_same( 'mark_product_out_of_stock', $operation['operation'] );
		$this->assert_same( 0, $product['stock_quantity'] );
		$this->assert_same( 'outofstock', $product['stock_status'] );
		$this->assert_same( 'hidden', $product['catalog_visibility'] );
		$this->assert_true( in_array( 'status_not_available', $plan->errors(), true ) );
		$this->assert_meta_value( 'stockout', '_tcg_projection_state', $product['meta_data'] );
	}

	public function test_hidden_unmapped_item_is_skipped_without_product_payload(): void {
		$row                      = $this->available_row();
		$row['online_visibility'] = 'hidden';

		$plan = ( new InventoryProductProjectionPlanner() )->plan_row( $row );

		$this->assert_same( InventoryProductProjectionPlan::SKIPPED, $plan->status() );
		$this->assert_same( 0, $plan->operation_count() );
		$this->assert_true( in_array( 'online_visibility_not_visible', $plan->errors(), true ) );
		$this->assert_true( in_array( 'woocommerce_product_id_missing', $plan->errors(), true ) );
		$this->assert_same( true, $plan->projection_contract()['woocommerce_write_deferred'] );
	}

	public function test_available_item_requires_identity_price_currency_and_single_quantity(): void {
		$row                             = $this->available_row();
		$row['barcode']                  = '';
		$row['sku']                      = '';
		$row['sale_price_minor_units']   = null;
		$row['sale_currency']            = 'CAD';
		$row['quantity']                 = 2;

		$plan = ( new InventoryProductProjectionPlanner() )->plan_row(
			$row,
			array( 'store_currency' => 'USD' )
		);

		$this->assert_same( InventoryProductProjectionPlan::FAILED, $plan->status() );
		$this->assert_same( 0, $plan->operation_count() );
		$this->assert_true( in_array( 'barcode_or_sku_required', $plan->errors(), true ) );
		$this->assert_true( in_array( 'sale_price_required', $plan->errors(), true ) );
		$this->assert_true( in_array( 'sale_currency_mismatch', $plan->errors(), true ) );
		$this->assert_true( in_array( 'serialized_quantity_must_be_one', $plan->errors(), true ) );
	}

	/**
	 * @param list<array{key:string,value:string}> $meta_data Product metadata rows.
	 */
	private function assert_meta_value( string $expected, string $key, array $meta_data ): void {
		foreach ( $meta_data as $meta_row ) {
			if ( $key === $meta_row['key'] ) {
				$this->assert_same( $expected, $meta_row['value'] );
				return;
			}
		}

		$this->assert_true( false, 'Expected product metadata key ' . $key . '.' );
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
			'sale_price_minor_units'   => 12500,
			'sale_currency'            => 'USD',
			'status'                   => 'available',
			'online_visibility'        => 'visible',
			'row_version'              => 7,
		);
	}
}
