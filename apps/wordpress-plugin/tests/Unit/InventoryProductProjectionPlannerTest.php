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
		$this->assert_same( 'Pokemon - Charizard - Base Set - 4', $product['name'] );
		$this->assert_same( 'PKM-BASE-004-HOLO', $product['sku'] );
		$this->assert_same( '125.00', $product['regular_price'] );
		$this->assert_same( true, $product['manage_stock'] );
		$this->assert_same( 1, $product['stock_quantity'] );
		$this->assert_same( 'instock', $product['stock_status'] );
		$this->assert_same( true, $product['sold_individually'] );
		$this->assert_same( array( 'singles', 'pokemon' ), $product['category_slugs'] );
		$this->assert_same( true, $contract['woocommerce_write_deferred'] );
		$this->assert_same( true, $contract['square_inventory_write_deferred'] );
		$this->assert_contains( 'Charizard', $product['description'] );
		$this->assert_same( 'NM / Holo / raw', $product['short_description'] );
		$this->assert_meta_value( '1', '_tcg_serialized_inventory', $product['meta_data'] );
		$this->assert_meta_value( 'card-public-42', '_tcg_inventory_public_id', $product['meta_data'] );
		$this->assert_meta_value( 'USD', '_tcg_sale_currency', $product['meta_data'] );
	}

	public function test_graded_item_projects_to_graded_cards_category(): void {
		$row                   = $this->available_row();
		$row['raw_or_graded']  = 'graded';
		$row['condition_code'] = 'PSA 10';

		$plan    = ( new InventoryProductProjectionPlanner() )->plan_row( $row );
		$product = $plan->product_operations()[0]['product'];

		$this->assert_same( InventoryProductProjectionPlan::READY, $plan->status() );
		$this->assert_same( array( 'singles', 'graded-cards', 'pokemon' ), $product['category_slugs'] );
		$this->assert_same( 'PSA 10 / Holo / graded', $product['short_description'] );
	}

	public function test_available_card_group_projects_one_product_with_condition_price_options(): void {
		$near_mint                       = $this->available_row();
		$near_mint['reference_card_id']  = 777;
		$near_mint['front_image_remote_url'] = 'https://images.example.test/charizard.png';
		$light_played                    = $this->available_row();
		$light_played['inventory_id']    = 43;
		$light_played['public_id']       = 'card-public-43';
		$light_played['reference_card_id'] = 777;
		$light_played['condition_code']  = 'LP';
		$light_played['sale_price']      = '80.00';
		unset( $light_played['sale_price_minor_units'] );

		$plan      = ( new InventoryProductProjectionPlanner() )->plan_group(
			array( $near_mint, $light_played ),
			array( 'store_currency' => 'USD' )
		);
		$operation = $plan->product_operations()[0];
		$product   = $operation['product'];

		$this->assert_same( InventoryProductProjectionPlan::READY, $plan->status() );
		$this->assert_same( 'woocommerce_grouped_product_projection_ready', $plan->code() );
		$this->assert_same( 'create_product', $operation['operation'] );
		$this->assert_same( 'simple', $product['type'] );
		$this->assert_same( 'TCG-777', $product['sku'] );
		$this->assert_same( '80.00', $product['regular_price'] );
		$this->assert_same( 2, $product['stock_quantity'] );
		$this->assert_same( 'instock', $product['stock_status'] );
		$this->assert_same( true, $product['sold_individually'] );
		$this->assert_same( array( 'singles', 'pokemon' ), $product['category_slugs'] );
		$this->assert_meta_value( 'grouped_card', '_tcg_inventory_product_mode', $product['meta_data'] );
		$this->assert_meta_value( 'reference:777', '_tcg_inventory_group_key', $product['meta_data'] );
		$this->assert_meta_value( 'https://images.example.test/charizard.png', '_tcg_front_image_url', $product['meta_data'] );
		$this->assert_true( in_array( 'serialized_checkout_reserves_exact_inventory_row', $plan->errors(), true ) );
		$this->assert_contains( '"condition_code":"LP"', $this->meta_value( '_tcg_inventory_options_json', $product['meta_data'] ) );
		$this->assert_contains( '"price":"80.00"', $this->meta_value( '_tcg_inventory_options_json', $product['meta_data'] ) );
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
		$this->assert_same( $expected, $this->meta_value( $key, $meta_data ) );
	}

	/**
	 * @param list<array{key:string,value:string}> $meta_data Product metadata rows.
	 */
	private function meta_value( string $key, array $meta_data ): string {
		foreach ( $meta_data as $meta_row ) {
			if ( $key === $meta_row['key'] ) {
				return $meta_row['value'];
			}
		}

		$this->assert_true( false, 'Expected product metadata key ' . $key . '.' );
		return '';
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
