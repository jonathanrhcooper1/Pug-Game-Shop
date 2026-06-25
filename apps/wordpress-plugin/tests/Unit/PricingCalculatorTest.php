<?php
/**
 * Pricing policy tests.
 *
 * @package TCGStorePlatform
 */

namespace TCGStorePlatform\Tests\Unit;

use InvalidArgumentException;
use TCGStorePlatform\Inventory\InventoryStatus;
use TCGStorePlatform\Pricing\PriceRounding;
use TCGStorePlatform\Pricing\PricingCalculator;
use TCGStorePlatform\Tests\TestCase;

final class PricingCalculatorTest extends TestCase {
	public function test_suggested_price_is_market_plus_ten_percent_and_rounded_up_to_whole_dollars(): void {
		$calculator = new PricingCalculator();

		$this->assert_same( 1100, $calculator->suggested_price( 1000 ) );
		$this->assert_same( 1100, $calculator->suggested_price( 999 ) );
		$this->assert_same( 200, $calculator->suggested_price( 101 ) );
		$this->assert_same( 500, $calculator->suggested_price( 386 ) );
	}

	public function test_sale_price_rounding_keeps_one_dollar_or_less_and_rounds_cents_above_one_dollar_up(): void {
		$this->assert_same( 99, PriceRounding::sale_price_minor_units( 99 ) );
		$this->assert_same( 100, PriceRounding::sale_price_minor_units( 100 ) );
		$this->assert_same( 200, PriceRounding::sale_price_minor_units( 101 ) );
		$this->assert_same( 500, PriceRounding::sale_price_minor_units( 425 ) );
		$this->assert_same( 1000, PriceRounding::sale_price_minor_units( 1000 ) );
	}

	public function test_trade_in_value_applies_percentage_then_rounds_down_to_whole_dollars(): void {
		$this->assert_same( 1100, PriceRounding::trade_in_value_minor_units( 1875, 6000 ) );
		$this->assert_same( 0, PriceRounding::trade_in_value_minor_units( 199, 5000 ) );
		$this->assert_same( 1000, PriceRounding::trade_in_value_minor_units( 2000, 5000 ) );
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
