<?php
/**
 * Phase 2 pricing policy.
 *
 * @package TCGStorePlatform
 */

namespace TCGStorePlatform\Pricing;

use InvalidArgumentException;
use TCGStorePlatform\Inventory\InventoryStatus;

final class PricingCalculator {
	public const FORMULA = 'market_plus_10_percent';

	public function evaluate(
		int $market_price_minor_units,
		int $minimum_sale_price_minor_units,
		string $market_currency,
		string $sale_currency,
		bool $price_lock,
		string $status
	): PriceEvaluation {
		$this->assert_non_negative( $market_price_minor_units, 'market_price_minor_units' );
		$this->assert_non_negative( $minimum_sale_price_minor_units, 'minimum_sale_price_minor_units' );

		if ( strtoupper( $market_currency ) !== strtoupper( $sale_currency ) ) {
			return new PriceEvaluation(
				0,
				$minimum_sale_price_minor_units,
				false,
				false,
				'currency_mismatch'
			);
		}

		$suggested_price = $this->suggested_price( $market_price_minor_units );

		if ( $price_lock ) {
			return new PriceEvaluation(
				$suggested_price,
				$minimum_sale_price_minor_units,
				false,
				false,
				'price_locked'
			);
		}

		if ( ! InventoryStatus::can_auto_price( $status ) ) {
			return new PriceEvaluation(
				$suggested_price,
				$minimum_sale_price_minor_units,
				false,
				false,
				'status_excluded'
			);
		}

		if ( $suggested_price < $minimum_sale_price_minor_units ) {
			return new PriceEvaluation(
				$suggested_price,
				$minimum_sale_price_minor_units,
				true,
				true,
				'minimum_floor_applied'
			);
		}

		return new PriceEvaluation(
			$suggested_price,
			$suggested_price,
			false,
			true,
			'suggested_price_applied'
		);
	}

	public function suggested_price( int $market_price_minor_units ): int {
		$this->assert_non_negative( $market_price_minor_units, 'market_price_minor_units' );

		return PriceRounding::market_plus_basis_points_minor_units( $market_price_minor_units, 1000 );
	}

	private function assert_non_negative( int $amount, string $field ): void {
		if ( $amount < 0 ) {
			throw new InvalidArgumentException( $field . ' must be greater than or equal to zero.' );
		}
	}
}
