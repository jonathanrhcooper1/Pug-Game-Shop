<?php
/**
 * Square inventory projection planner tests.
 *
 * @package TCGStorePlatform
 */

namespace TCGStorePlatform\Tests\Unit;

use TCGStorePlatform\Square\SquareInventoryProjectionPlan;
use TCGStorePlatform\Square\SquareInventoryProjectionPlanner;
use TCGStorePlatform\Tests\TestCase;

final class SquareInventoryProjectionPlannerTest extends TestCase {
	public function test_available_visible_item_projects_catalog_object_and_inventory_count(): void {
		$plan      = ( new SquareInventoryProjectionPlanner() )->plan_row(
			$this->available_row(),
			array(
				'square_location_id' => 'L-SANDBOX-1',
				'occurred_at'        => '2026-06-07T12:00:00Z',
			)
		);
		$object    = $plan->catalog_objects()[0];
		$variation = $object['item_data']['variations'][0];
		$change    = $plan->inventory_changes()[0];
		$contract  = $plan->projection_contract();

		$this->assert_same( SquareInventoryProjectionPlan::READY, $plan->status() );
		$this->assert_same( 'square_inventory_projection_ready', $plan->code() );
		$this->assert_same( 2, $plan->operation_count() );
		$this->assert_true( $plan->requires_catalog_id_resolution() );
		$this->assert_same( 'ITEM', $object['type'] );
		$this->assert_same( false, $object['present_at_all_locations'] );
		$this->assert_same( array( 'L-SANDBOX-1' ), $object['present_at_location_ids'] );
		$this->assert_same( 'ITEM_VARIATION', $variation['type'] );
		$this->assert_same( 'PKM-BASE-004-HOLO', $variation['item_variation_data']['sku'] );
		$this->assert_false( isset( $variation['item_variation_data']['upc'] ) );
		$this->assert_same( 'FIXED_PRICING', $variation['item_variation_data']['pricing_type'] );
		$this->assert_same( 12500, $variation['item_variation_data']['price_money']['amount'] );
		$this->assert_same( 'USD', $variation['item_variation_data']['price_money']['currency'] );
		$this->assert_same( true, $variation['item_variation_data']['track_inventory'] );
		$this->assert_same( 'PHYSICAL_COUNT', $change['type'] );
		$this->assert_same( '1', $change['physical_count']['quantity'] );
		$this->assert_same( 'IN_STOCK', $change['physical_count']['state'] );
		$this->assert_same( true, $contract['network_request_deferred'] );
		$this->assert_same( true, $contract['provider_inventory_write_deferred'] );
		$this->assert_same( 'required_for_payments', $contract['official_square_payment_extension'] );
		$this->assert_same( 'official_woocommerce_square_extension', $contract['payment_capture_authority'] );
		$this->assert_false( $contract['plugin_square_payment_capture_allowed'] );
		$this->assert_false( $contract['plugin_square_custom_gateway_allowed'] );
		$this->assert_same( 'catalog_inventory_projection_and_reconciliation_only', $contract['square_inventory_sync_scope'] );
	}

	public function test_existing_square_mapping_for_unavailable_item_projects_zero_count_only(): void {
		$row                         = $this->available_row();
		$row['status']               = 'sold';
		$row['square_catalog_item_id'] = 'SQUARE-ITEM-1';
		$row['square_catalog_variation_id'] = 'SQUARE-VARIATION-1';

		$plan   = ( new SquareInventoryProjectionPlanner() )->plan_row(
			$row,
			array(
				'square_location_id' => 'L-SANDBOX-1',
				'occurred_at'        => '2026-06-07T12:10:00Z',
			)
		);
		$change = $plan->inventory_changes()[0];

		$this->assert_same( SquareInventoryProjectionPlan::READY, $plan->status() );
		$this->assert_same( 'square_inventory_zero_count_ready', $plan->code() );
		$this->assert_same( 0, count( $plan->catalog_objects() ) );
		$this->assert_same( 1, count( $plan->inventory_changes() ) );
		$this->assert_same( 'SQUARE-VARIATION-1', $change['physical_count']['catalog_object_id'] );
		$this->assert_same( '0', $change['physical_count']['quantity'] );
		$this->assert_false( $plan->requires_catalog_id_resolution() );
		$this->assert_true( in_array( 'status_not_available', $plan->errors(), true ) );
	}

	public function test_hidden_item_without_square_mapping_is_skipped_without_payloads(): void {
		$row                   = $this->available_row();
		$row['kiosk_visibility'] = 'hidden';

		$plan = ( new SquareInventoryProjectionPlanner() )->plan_row(
			$row,
			array(
				'square_location_id' => 'L-SANDBOX-1',
			)
		);

		$this->assert_same( SquareInventoryProjectionPlan::SKIPPED, $plan->status() );
		$this->assert_same( 0, $plan->operation_count() );
		$this->assert_true( in_array( 'kiosk_visibility_not_visible', $plan->errors(), true ) );
		$this->assert_true( in_array( 'square_catalog_variation_id_missing', $plan->errors(), true ) );
		$this->assert_same( true, $plan->projection_contract()['network_request_deferred'] );
	}

	public function test_pos_hidden_item_is_still_square_ready_when_kiosk_visible(): void {
		$row                    = $this->available_row();
		$row['kiosk_visibility'] = 'visible';
		$row['pos_visibility']   = 'hidden';

		$plan = ( new SquareInventoryProjectionPlanner() )->plan_row(
			$row,
			array(
				'square_location_id' => 'L-SANDBOX-1',
			)
		);

		$this->assert_same( SquareInventoryProjectionPlan::READY, $plan->status() );
		$this->assert_same( 2, $plan->operation_count() );
		$this->assert_false( in_array( 'pos_visibility_not_visible', $plan->errors(), true ) );
	}

	public function test_available_item_requires_scan_identity_price_currency_and_square_location(): void {
		$row                        = $this->available_row();
		$row['barcode']             = '';
		$row['sku']                 = '';
		$row['sale_price_minor_units'] = null;
		$row['sale_currency']       = 'US1';

		$plan = ( new SquareInventoryProjectionPlanner() )->plan_row( $row );

		$this->assert_same( SquareInventoryProjectionPlan::FAILED, $plan->status() );
		$this->assert_same( 0, $plan->operation_count() );
		$this->assert_true( in_array( 'barcode_or_sku_required', $plan->errors(), true ) );
		$this->assert_true( in_array( 'sale_price_required', $plan->errors(), true ) );
		$this->assert_true( in_array( 'sale_currency_invalid', $plan->errors(), true ) );
		$this->assert_true( in_array( 'square_location_id_required', $plan->errors(), true ) );
	}

	public function test_existing_square_ids_do_not_require_catalog_id_resolution(): void {
		$row                                  = $this->available_row();
		$row['square_catalog_item_id']        = 'SQUARE-ITEM-1';
		$row['square_catalog_variation_id']   = 'SQUARE-VARIATION-1';
		$row['square_location_id']            = 'L-SANDBOX-1';
		$row['sale_price']                    = '13.50';
		unset( $row['sale_price_minor_units'] );

		$plan      = ( new SquareInventoryProjectionPlanner() )->plan_row( $row );
		$object    = $plan->catalog_objects()[0];
		$variation = $object['item_data']['variations'][0];
		$change    = $plan->inventory_changes()[0];

		$this->assert_same( SquareInventoryProjectionPlan::READY, $plan->status() );
		$this->assert_false( $plan->requires_catalog_id_resolution() );
		$this->assert_same( 'SQUARE-ITEM-1', $object['id'] );
		$this->assert_same( 'SQUARE-VARIATION-1', $variation['id'] );
		$this->assert_same( 1350, $variation['item_variation_data']['price_money']['amount'] );
		$this->assert_same( 'SQUARE-VARIATION-1', $change['physical_count']['catalog_object_id'] );
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
			'sale_price_minor_units'  => 12500,
			'sale_currency'           => 'USD',
			'status'                  => 'available',
			'kiosk_visibility'        => 'visible',
			'pos_visibility'          => 'visible',
			'row_version'             => 7,
		);
	}
}
