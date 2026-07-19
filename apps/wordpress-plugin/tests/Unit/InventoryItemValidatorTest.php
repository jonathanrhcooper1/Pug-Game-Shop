<?php
/**
 * Inventory item validator tests.
 *
 * @package TCGStorePlatform
 */

namespace TCGStorePlatform\Tests\Unit;

use TCGStorePlatform\Inventory\InventoryItemValidator;
use TCGStorePlatform\Inventory\InventoryStatus;
use TCGStorePlatform\Tests\TestCase;

final class InventoryItemValidatorTest extends TestCase {
	public function test_valid_raw_available_item_passes(): void {
		$validator = new InventoryItemValidator();

		$errors = $validator->validate(
			array(
				'status'                         => InventoryStatus::AVAILABLE,
				'minimum_sale_price_minor_units' => 150,
				'sale_price_minor_units'         => 200,
				'location_id'                    => 1,
				'barcode'                        => 'PCS-000001',
				'reference_card_id'              => 10,
				'raw_or_graded'                  => 'raw',
				'condition_code'                 => 'NM',
			)
		);

		$this->assert_same( array(), $errors );
	}

	public function test_minimum_price_is_required(): void {
		$validator = new InventoryItemValidator();
		$errors    = $validator->validate(
			array(
				'status'        => InventoryStatus::PENDING_INTAKE,
				'raw_or_graded' => 'raw',
			)
		);

		$this->assert_true( in_array( 'minimum_price_required', $errors, true ) );
	}

	public function test_active_item_requires_location_barcode_and_reference(): void {
		$validator = new InventoryItemValidator();
		$errors    = $validator->validate(
			array(
				'status'                         => InventoryStatus::AVAILABLE,
				'minimum_sale_price_minor_units' => 100,
				'raw_or_graded'                  => 'raw',
				'condition_code'                 => 'LP',
			)
		);

		$this->assert_true( in_array( 'location_required_for_active_item', $errors, true ) );
		$this->assert_true( in_array( 'barcode_required_for_active_item', $errors, true ) );
		$this->assert_true( in_array( 'reference_required_for_listed_item', $errors, true ) );
	}

	public function test_graded_item_requires_company_and_grade(): void {
		$validator = new InventoryItemValidator();
		$errors    = $validator->validate(
			array(
				'status'                         => InventoryStatus::PENDING_INTAKE,
				'minimum_sale_price_minor_units' => 100,
				'raw_or_graded'                  => 'graded',
			)
		);

		$this->assert_true( in_array( 'grading_company_required_for_graded_item', $errors, true ) );
		$this->assert_true( in_array( 'grade_required_for_graded_item', $errors, true ) );
	}
}
