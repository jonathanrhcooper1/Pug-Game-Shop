<?php
/**
 * Plans trade-in item values from market mid prices.
 *
 * @package TCGStorePlatform
 */

namespace TCGStorePlatform\Buylist;

use TCGStorePlatform\Pricing\PriceRounding;

final class BuylistTradeInValuePlanner {
	/**
	 * @param list<array<string, mixed>> $items Trade-in item rows.
	 * @return array{can_plan:bool,cash_total_minor_units:int,credit_total_minor_units:int,combined_total_minor_units:int,currency:string,line_items:list<array<string,mixed>>,errors:list<string>}
	 */
	public function plan( array $items, string $currency = 'USD' ): array {
		$currency          = $this->currency( $currency );
		$errors            = array();
		$line_items        = array();
		$cash_total_units   = 0;
		$credit_total_units = 0;

		if ( array() === $items ) {
			$errors[] = 'items_required';
		}

		foreach ( $items as $index => $item ) {
			$line = $this->line_item( $item, $index, $currency, $errors );

			if ( null === $line ) {
				continue;
			}

			$line_items[] = $line;

			if ( 'cash' === $line['payout_type'] ) {
				$cash_total_units += $line['final_value_minor_units'];
			} else {
				$credit_total_units += $line['final_value_minor_units'];
			}
		}

		return array(
			'can_plan'                   => array() === $errors,
			'cash_total_minor_units'     => $cash_total_units,
			'credit_total_minor_units'   => $credit_total_units,
			'combined_total_minor_units' => $cash_total_units + $credit_total_units,
			'currency'                   => $currency,
			'line_items'                 => $line_items,
			'errors'                     => array_values( array_unique( $errors ) ),
		);
	}

	/**
	 * @param array<string, mixed> $item Trade-in item.
	 * @param list<string>        $errors Validation errors.
	 * @return array<string, mixed>|null
	 */
	private function line_item( array $item, int $index, string $currency, array &$errors ): ?array {
		$item_id       = $this->nullable_positive_int( $item['buylist_item_id'] ?? null );
		$quantity      = $this->positive_int( $item['accepted_quantity'] ?? $item['quantity'] ?? 1, "items_{$index}_quantity", $errors );
		$market_mid    = $this->non_negative_int( $item['market_mid_minor_units'] ?? null, "items_{$index}_market_mid_minor_units", $errors );
		$percentage    = $this->percentage_basis_points( $item['trade_in_percentage_basis_points'] ?? $item['trade_in_percent'] ?? 6000, "items_{$index}_trade_in_percentage", $errors );
		$payout_type   = strtolower( trim( (string) ( $item['payout_type'] ?? '' ) ) );
		$override      = $this->nullable_non_negative_int( $item['override_final_value_minor_units'] ?? null );
		$override_note = trim( (string) ( $item['override_reason'] ?? '' ) );

		if ( ! in_array( $payout_type, array( 'cash', 'credit' ), true ) ) {
			$errors[] = "items_{$index}_payout_type_required";
		}

		if ( null !== $override && '' === $override_note ) {
			$errors[] = "items_{$index}_override_reason_required";
		}

		if ( null === $quantity || null === $market_mid || null === $percentage || ! in_array( $payout_type, array( 'cash', 'credit' ), true ) ) {
			return null;
		}

		$calculated_unit_value = PriceRounding::trade_in_value_minor_units( $market_mid, $percentage );
		$unit_value           = null === $override ? $calculated_unit_value : $override;
		$final_value          = $unit_value * $quantity;

		return array(
			'buylist_item_id'                   => $item_id,
			'card_name'                         => $this->text( $item['card_name'] ?? $item['manual_card_name'] ?? '' ),
			'game'                              => $this->text( $item['game'] ?? '' ),
			'set_name'                          => $this->text( $item['set_name'] ?? '' ),
			'condition_or_grade'                => $this->condition_or_grade( $item ),
			'accepted_quantity'                 => $quantity,
			'market_mid_minor_units'            => $market_mid,
			'trade_in_percentage_basis_points'  => $percentage,
			'calculated_unit_value_minor_units' => $calculated_unit_value,
			'final_unit_value_minor_units'      => $unit_value,
			'final_value_minor_units'           => $final_value,
			'payout_type'                       => $payout_type,
			'currency'                          => $currency,
			'manager_override'                  => null !== $override,
			'override_reason'                   => $override_note,
		);
	}

	/**
	 * @param array<string, mixed> $item Trade-in item.
	 */
	private function condition_or_grade( array $item ): string {
		if ( 'graded' === strtolower( trim( (string) ( $item['raw_or_graded'] ?? '' ) ) ) ) {
			return trim(
				implode(
					' ',
					array_filter(
						array(
							(string) ( $item['grading_company'] ?? '' ),
							(string) ( $item['grade'] ?? '' ),
						)
					)
				)
			);
		}

		return strtoupper( trim( (string) ( $item['submitted_condition'] ?? $item['condition_code'] ?? '' ) ) );
	}

	private function currency( string $currency ): string {
		$currency = strtoupper( trim( $currency ) );

		return 1 === preg_match( '/^[A-Z]{3}$/', $currency ) ? $currency : 'USD';
	}

	private function text( mixed $value ): string {
		return substr( trim( preg_replace( '/\s+/', ' ', (string) $value ) ?? '' ), 0, 160 );
	}

	/**
	 * @param list<string> $errors Validation errors.
	 */
	private function positive_int( mixed $value, string $field, array &$errors ): ?int {
		$value = $this->nullable_positive_int( $value );

		if ( null === $value ) {
			$errors[] = $field . '_required';
		}

		return $value;
	}

	private function nullable_positive_int( mixed $value ): ?int {
		if ( is_int( $value ) && $value > 0 ) {
			return $value;
		}

		if ( is_string( $value ) && 1 === preg_match( '/^\d+$/', $value ) && (int) $value > 0 ) {
			return (int) $value;
		}

		return null;
	}

	/**
	 * @param list<string> $errors Validation errors.
	 */
	private function non_negative_int( mixed $value, string $field, array &$errors ): ?int {
		$value = $this->nullable_non_negative_int( $value );

		if ( null === $value ) {
			$errors[] = $field . '_required';
		}

		return $value;
	}

	private function nullable_non_negative_int( mixed $value ): ?int {
		if ( is_int( $value ) && $value >= 0 ) {
			return $value;
		}

		if ( is_string( $value ) && 1 === preg_match( '/^\d+$/', $value ) ) {
			return (int) $value;
		}

		return null;
	}

	/**
	 * @param list<string> $errors Validation errors.
	 */
	private function percentage_basis_points( mixed $value, string $field, array &$errors ): ?int {
		if ( is_string( $value ) && str_contains( $value, '.' ) ) {
			$value = (int) round( (float) $value * 100 );
		}

		$value = $this->nullable_non_negative_int( $value );

		if ( null === $value || $value > 10000 ) {
			$errors[] = $field . '_invalid';

			return null;
		}

		if ( 0 !== $value % 500 ) {
			$errors[] = $field . '_must_use_5_percent_increment';

			return null;
		}

		return $value;
	}
}
