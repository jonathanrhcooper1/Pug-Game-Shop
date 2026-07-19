<?php
/**
 * Shared store pricing rounding rules.
 *
 * @package TCGStorePlatform
 */

namespace TCGStorePlatform\Pricing;

use InvalidArgumentException;

final class PriceRounding {
	public static function sale_price_minor_units( int $amount_minor_units ): int {
		self::assert_non_negative( $amount_minor_units, 'amount_minor_units' );

		if ( $amount_minor_units <= 100 || 0 === $amount_minor_units % 100 ) {
			return $amount_minor_units;
		}

		return (int) ( ceil( $amount_minor_units / 100 ) * 100 );
	}

	public static function market_plus_basis_points_minor_units( int $market_minor_units, int $markup_basis_points ): int {
		self::assert_non_negative( $market_minor_units, 'market_minor_units' );

		if ( $markup_basis_points < -10000 ) {
			throw new InvalidArgumentException( 'markup_basis_points must not reduce the price below zero.' );
		}

		$raw_minor_units = intdiv(
			( $market_minor_units * ( 10000 + $markup_basis_points ) ) + 5000,
			10000
		);

		return self::sale_price_minor_units( $raw_minor_units );
	}

	public static function trade_in_value_minor_units( int $market_mid_minor_units, int $percentage_basis_points ): int {
		self::assert_non_negative( $market_mid_minor_units, 'market_mid_minor_units' );

		if ( $percentage_basis_points < 0 ) {
			throw new InvalidArgumentException( 'percentage_basis_points must be greater than or equal to zero.' );
		}

		$raw_minor_units = intdiv( $market_mid_minor_units * $percentage_basis_points, 10000 );

		return intdiv( $raw_minor_units, 100 ) * 100;
	}

	private static function assert_non_negative( int $amount, string $field ): void {
		if ( $amount < 0 ) {
			throw new InvalidArgumentException( $field . ' must be greater than or equal to zero.' );
		}
	}
}
