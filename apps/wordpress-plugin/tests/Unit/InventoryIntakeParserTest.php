<?php
/**
 * Inventory intake parser tests.
 *
 * @package TCGStorePlatform
 */

namespace TCGStorePlatform\Tests\Unit;

use TCGStorePlatform\Inventory\InventoryIntakeParser;
use TCGStorePlatform\Inventory\InventoryStatus;
use TCGStorePlatform\Tests\TestCase;

final class InventoryIntakeParserTest extends TestCase {
	public function test_parser_builds_staff_intake_request_for_raw_card(): void {
		$result = ( new InventoryIntakeParser() )->parse(
			array(
				'source'                         => 'Staff',
				'idempotency_key'                => 'body-key-ignored',
				'game'                           => 'Pokemon',
				'card_name'                      => 'Pikachu',
				'set_name'                       => 'Base Set',
				'set_code'                       => 'base',
				'card_number'                    => '58/102',
				'status'                         => InventoryStatus::AVAILABLE,
				'raw_or_graded'                  => 'RAW',
				'condition_code'                 => 'nm',
				'barcode'                        => 'pcs-000001',
				'sku'                            => 'pcs-pika-000001',
				'location_id'                    => '3',
				'sale_currency'                  => 'usd',
				'minimum_sale_price_minor_units' => '150',
				'sale_price_minor_units'         => 250,
				'online_visibility'              => 'visible',
				'kiosk_visibility'               => 'staff_only',
				'price_lock'                     => 'yes',
			),
			'header-inventory-1',
			22
		);

		$this->assert_true( $result->is_valid() );

		$request = $result->request();

		$this->assert_true( null !== $request );
		$this->assert_same( 'staff', $request->source() );
		$this->assert_same( 'header-inventory-1', $request->idempotency_key() );
		$this->assert_same( 'USD', $request->currency() );
		$this->assert_same( 22, $request->actor_user_id() );
		$this->assert_true( $request->woocommerce_projection_deferred() );
		$this->assert_true( $request->label_print_deferred() );

		$item = $request->item_fields();

		$this->assert_same( 'pokemon', $item['game'] );
		$this->assert_same( 'Pikachu', $item['card_name'] );
		$this->assert_same( 'BASE', $item['set_code'] );
		$this->assert_same( 'NM', $item['condition_code'] );
		$this->assert_same( 'PCS-000001', $item['barcode'] );
		$this->assert_same( 3, $item['location_id'] );
		$this->assert_same( 150, $item['minimum_sale_price_minor_units'] );
		$this->assert_same( 250, $item['sale_price_minor_units'] );
		$this->assert_same( 'visible', $item['online_visibility'] );
		$this->assert_same( 'staff_only', $item['kiosk_visibility'] );
		$this->assert_true( $item['price_lock'] );
		$this->assert_contains( '"card_name":"Pikachu"', $item['manual_reference_payload_json'] );
	}

	public function test_parser_accepts_graded_pending_intake_with_reference_identity(): void {
		$result = ( new InventoryIntakeParser() )->parse(
			array(
				'source'                         => 'scrydex_import',
				'idempotency_key'                => 'scrydex-card-1',
				'game'                           => 'mtg',
				'card_name'                      => 'Black Lotus',
				'raw_or_graded'                  => 'graded',
				'grading_company'                => 'psa',
				'grade'                          => '9',
				'reference_card_id'              => '99',
				'reference_variant_id'           => 101,
				'minimum_sale_price_minor_units' => 1000000,
			)
		);

		$this->assert_true( $result->is_valid() );

		$request = $result->request();

		$this->assert_true( null !== $request );
		$this->assert_same( 'scrydex_import', $request->source() );
		$this->assert_same( 'PSA', $request->item_fields()['grading_company'] );
		$this->assert_same( 99, $request->item_fields()['reference_card_id'] );
		$this->assert_same( 101, $request->item_fields()['reference_variant_id'] );
	}

	public function test_parser_rejects_missing_required_inventory_fields(): void {
		$result = ( new InventoryIntakeParser() )->parse(
			array(
				'source'        => 'mailbag',
				'currency'      => 'US',
				'status'        => InventoryStatus::AVAILABLE,
				'raw_or_graded' => 'raw',
			)
		);

		$this->assert_false( $result->is_valid() );
		$this->assert_true( in_array( 'source_invalid', $result->errors(), true ) );
		$this->assert_true( in_array( 'idempotency_key_required', $result->errors(), true ) );
		$this->assert_true( in_array( 'game_required', $result->errors(), true ) );
		$this->assert_true( in_array( 'card_name_required', $result->errors(), true ) );
		$this->assert_true( in_array( 'currency_invalid', $result->errors(), true ) );
		$this->assert_true( in_array( 'sale_price_required_for_listed_item', $result->errors(), true ) );
		$this->assert_true( in_array( 'minimum_price_required', $result->errors(), true ) );
		$this->assert_true( in_array( 'location_required_for_active_item', $result->errors(), true ) );
		$this->assert_true( in_array( 'barcode_required_for_active_item', $result->errors(), true ) );
		$this->assert_true( in_array( 'condition_required_for_raw_item', $result->errors(), true ) );
	}

	public function test_parser_rejects_invalid_ids_visibility_and_below_floor_price(): void {
		$result = ( new InventoryIntakeParser() )->parse(
			array(
				'idempotency_key'                => 'inventory-bad-ids',
				'game'                           => 'pokemon',
				'card_name'                      => 'Charizard',
				'raw_or_graded'                  => 'raw',
				'condition_code'                 => 'lp',
				'minimum_sale_price_minor_units' => 500,
				'sale_price_minor_units'         => 400,
				'location_id'                    => 0,
				'reference_card_id'              => 'abc',
				'online_visibility'              => 'public',
			)
		);

		$this->assert_false( $result->is_valid() );
		$this->assert_true( in_array( 'sale_price_below_minimum', $result->errors(), true ) );
		$this->assert_true( in_array( 'location_id_invalid', $result->errors(), true ) );
		$this->assert_true( in_array( 'reference_card_id_invalid', $result->errors(), true ) );
		$this->assert_true( in_array( 'online_visibility_invalid', $result->errors(), true ) );
	}
}
