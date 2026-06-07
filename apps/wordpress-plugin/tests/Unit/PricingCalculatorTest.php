<?php
/**
 * Pricing policy tests.
 *
 * @package TCGStorePlatform
 */

namespace TCGStorePlatform\Tests\Unit;

use InvalidArgumentException;
use TCGStorePlatform\Inventory\InventoryStatus;
use TCGStorePlatform\Pricing\PricingCalculator;
use TCGStorePlatform\Tests\TestCase;

final class PricingCalculatorTest extends TestCase {
	public function test_suggested_price_is_market_plus_ten_percent_rounded(): void {
		$calculator = new PricingCalculator();

		$this->assert_same( 1100, $calculator->suggested_price( 1000 ) );
		$this->assert_same( 1099, $calculator->suggested_price( 999 ) );
	}

	public function test_minimum_price_floor_is_applied(): void {
		$calculator = new PricingCalculator();
		$result     = $calculator->evaluate( 1000, 1500, 'USD', 'USD', false, InventoryStatus::AVAILABLE );

		$this->assert_same( 1100, $result->suggested_price_minor_units );
		$this->assert_same( 1500, $result->sale_price_minor_units );
		$this->assert_true( $result->floor_hit );
		$this->assert_true( $result->should_change );
		$this->assert_same( 'minimum_floor_applied', $result->reason );
	}

	public function test_currency_mismatch_blocks_automatic_pricing(): void {
		$calculator = new PricingCalculator();
		$result     = $calculator->evaluate( 1000, 100, 'USD', 'CAD', false, InventoryStatus::AVAILABLE );

		$this->assert_false( $result->should_change );
		$this->assert_same( 'currency_mismatch', $result->reason );
	}

	public function test_price_lock_blocks_automatic_pricing(): void {
		$calculator = new PricingCalculator();
		$result     = $calculator->evaluate( 1000, 100, 'USD', 'USD', true, InventoryStatus::AVAILABLE );

		$this->assert_false( $result->should_change );
		$this->assert_same( 'price_locked', $result->reason );
	}

	public function test_sold_status_is_excluded_from_automatic_pricing(): void {
		$calculator = new PricingCalculator();
		$result     = $calculator->evaluate( 1000, 100, 'USD', 'USD', false, InventoryStatus::SOLD );

		$this->assert_false( $result->should_change );
		$this->assert_same( 'status_excluded', $result->reason );
	}

	public function test_negative_market_price_is_rejected(): void {
		$calculator = new PricingCalculator();

		try {
			$calculator->suggested_price( -1 );
		} catch ( InvalidArgumentException ) {
			$this->assert_true( true );
			return;
		}

		$this->assert_true( false, 'Expected negative market price to throw.' );
	}
}
