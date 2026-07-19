<?php
/**
 * Inventory intake persistence planning tests.
 *
 * @package TCGStorePlatform
 */

namespace TCGStorePlatform\Tests\Unit;

use TCGStorePlatform\Inventory\InventoryIntakeParser;
use TCGStorePlatform\Inventory\InventoryIntakePersistencePlanner;
use TCGStorePlatform\Inventory\InventoryIntakeRequest;
use TCGStorePlatform\Inventory\InventoryStatus;
use TCGStorePlatform\Tests\TestCase;

final class InventoryIntakePersistencePlannerTest extends TestCase {
	public function test_planner_builds_insert_template_for_available_staff_intake(): void {
		$request = $this->valid_staff_request();
		$plan    = $this->planner()->plan( $request, 'wp_' );
		$row     = $plan->insert_row();
		$audit   = $plan->audit_payload();

		$this->assert_true( $plan->is_valid() );
		$this->assert_same( 'planned', $plan->status() );
		$this->assert_same( 'wp_tcg_inventory_items', $plan->table_name() );
		$this->assert_same( 36, strlen( $row['public_id'] ) );
		$this->assert_same( 'pokemon', $row['game'] );
		$this->assert_same( 'Pikachu', $row['card_name'] );
		$this->assert_same( 'PCS-000001', $row['barcode'] );
		$this->assert_same( 'PCS-PIKA-000001', $row['sku'] );
		$this->assert_same( '2.50', $row['sale_price'] );
		$this->assert_same( '1.50', $row['minimum_sale_price'] );
		$this->assert_same( 'USD', $row['sale_currency'] );
		$this->assert_same( 1, $row['price_lock'] );
		$this->assert_same( 3, $row['location_id'] );
		$this->assert_same( '2026-06-07 10:30:00.000000', $row['date_acquired'] );
		$this->assert_same( '2026-06-07 10:30:00.000000', $row['date_listed'] );
		$this->assert_same( null, $row['date_sold'] );
		$this->assert_same( 22, $row['created_by'] );
		$this->assert_contains( 'INSERT INTO `wp_tcg_inventory_items`', $plan->insert_sql_template() );
		$this->assert_contains( '`public_id`', $plan->insert_sql_template() );
		$this->assert_contains( '`row_version`', $plan->insert_sql_template() );
		$this->assert_true( $plan->prepare_arg_count() > 25 );
		$this->assert_false( $audit['generated_barcode'] );
		$this->assert_false( $audit['generated_sku'] );
		$this->assert_true( $audit['route_connected_writes_deferred'] );
		$this->assert_true( $audit['woocommerce_projection_deferred'] );
	}

	public function test_planner_generates_pending_intake_identity_and_defaults_sale_price(): void {
		$result = ( new InventoryIntakeParser() )->parse(
			array(
				'source'                         => 'staff',
				'idempotency_key'                => 'pending-intake-1',
				'game'                           => 'pokemon',
				'card_name'                      => 'Squirtle',
				'status'                         => InventoryStatus::PENDING_INTAKE,
				'raw_or_graded'                  => 'raw',
				'condition_code'                 => 'lp',
				'minimum_sale_price_minor_units' => 100,
			)
		);

		$this->assert_true( $result->is_valid() );

		$request = $result->request();
		$this->assert_true( null !== $request );

		$plan  = $this->planner()->plan( $request, 'wp_' );
		$row   = $plan->insert_row();
		$audit = $plan->audit_payload();

		$this->assert_true( $plan->is_valid() );
		$this->assert_contains( 'PUG-', $row['barcode'] );
		$this->assert_same( $row['barcode'], $row['sku'] );
		$this->assert_same( '1.00', $row['sale_price'] );
		$this->assert_same( '1.00', $row['minimum_sale_price'] );
		$this->assert_same( null, $row['date_listed'] );
		$this->assert_same( 'pending_intake', $row['status'] );
		$this->assert_true( $audit['generated_barcode'] );
		$this->assert_true( $audit['generated_sku'] );
		$this->assert_true( $audit['label_print_deferred'] );
	}

	public function test_planner_marks_sold_items_with_sold_timestamp(): void {
		$result = ( new InventoryIntakeParser() )->parse(
			array(
				'source'                         => 'offline',
				'idempotency_key'                => 'sold-intake-1',
				'game'                           => 'pokemon',
				'card_name'                      => 'Mew',
				'status'                         => InventoryStatus::SOLD,
				'raw_or_graded'                  => 'graded',
				'grading_company'                => 'psa',
				'grade'                          => '10',
				'barcode'                        => 'sold-001',
				'sku'                            => 'sold-001',
				'location_id'                    => 4,
				'reference_card_id'              => 99,
				'minimum_sale_price_minor_units' => 5000,
				'sale_price_minor_units'         => 6500,
			),
			'sold-header-1',
			31
		);

		$this->assert_true( $result->is_valid() );
		$request = $result->request();
		$this->assert_true( null !== $request );

		$row = $this->planner()->plan( $request, 'wp_' )->insert_row();

		$this->assert_same( 'sold', $row['status'] );
		$this->assert_same( '2026-06-07 10:30:00.000000', $row['date_listed'] );
		$this->assert_same( '2026-06-07 10:30:00.000000', $row['date_sold'] );
		$this->assert_same( 31, $row['updated_by'] );
	}

	public function test_planner_rejects_unsafe_prefix_and_incomplete_request(): void {
		$request = new InventoryIntakeRequest(
			'staff',
			'',
			'US1',
			null,
			array(
				'status' => 'bad-status',
			),
			true,
			true
		);
		$plan    = $this->planner()->plan( $request, 'wp-bad_' );

		$this->assert_true( $plan->is_rejected() );
		$this->assert_same( '', $plan->insert_sql_template() );
		$this->assert_same( array(), $plan->prepare_args() );
		$this->assert_true( in_array( 'table_prefix_invalid', $plan->errors(), true ) );
		$this->assert_true( in_array( 'idempotency_key_required', $plan->errors(), true ) );
		$this->assert_true( in_array( 'currency_invalid', $plan->errors(), true ) );
		$this->assert_true( in_array( 'game_required', $plan->errors(), true ) );
		$this->assert_true( in_array( 'card_name_required', $plan->errors(), true ) );
		$this->assert_true( in_array( 'minimum_price_required', $plan->errors(), true ) );
		$this->assert_true( in_array( 'status_invalid', $plan->errors(), true ) );
		$this->assert_true( $plan->audit_payload()['inventory_repository_deferred'] );
	}

	private function planner(): InventoryIntakePersistencePlanner {
		return new InventoryIntakePersistencePlanner(
			static fn (): string => '2026-06-07 10:30:00.000000'
		);
	}

	private function valid_staff_request(): InventoryIntakeRequest {
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

		return $request;
	}
}
