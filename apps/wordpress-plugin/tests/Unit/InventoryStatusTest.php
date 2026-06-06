<?php
/**
 * Inventory status rule tests.
 *
 * @package TCGStorePlatform
 */

namespace TCGStorePlatform\Tests\Unit;

use TCGStorePlatform\Inventory\InventoryStatus;
use TCGStorePlatform\Tests\TestCase;

final class InventoryStatusTest extends TestCase {
	public function test_available_item_can_be_reserved_or_sold(): void {
		$this->assert_true( InventoryStatus::can_transition( InventoryStatus::AVAILABLE, InventoryStatus::RESERVED ) );
		$this->assert_true( InventoryStatus::can_transition( InventoryStatus::AVAILABLE, InventoryStatus::SOLD ) );
	}

	public function test_sold_item_cannot_return_to_available_directly(): void {
		$this->assert_false( InventoryStatus::can_transition( InventoryStatus::SOLD, InventoryStatus::AVAILABLE ) );
		$this->assert_true( InventoryStatus::can_transition( InventoryStatus::SOLD, InventoryStatus::RETURN_REVIEW ) );
	}

	public function test_active_statuses_require_location(): void {
		$this->assert_true( InventoryStatus::requires_location( InventoryStatus::AVAILABLE ) );
		$this->assert_true( InventoryStatus::requires_location( InventoryStatus::RESERVED ) );
		$this->assert_false( InventoryStatus::requires_location( InventoryStatus::PENDING_INTAKE ) );
	}

	public function test_auto_pricing_is_limited_to_unsold_available_workflow(): void {
		$this->assert_true( InventoryStatus::can_auto_price( InventoryStatus::PENDING_INTAKE ) );
		$this->assert_true( InventoryStatus::can_auto_price( InventoryStatus::AVAILABLE ) );
		$this->assert_false( InventoryStatus::can_auto_price( InventoryStatus::RESERVED ) );
		$this->assert_false( InventoryStatus::can_auto_price( InventoryStatus::SOLD ) );
	}
}
