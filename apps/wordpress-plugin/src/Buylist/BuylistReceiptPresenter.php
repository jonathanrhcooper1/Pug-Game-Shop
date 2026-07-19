<?php
/**
 * Builds customer trade-in receipt payloads.
 *
 * @package TCGStorePlatform
 */

namespace TCGStorePlatform\Buylist;

final class BuylistReceiptPresenter {
	/**
	 * @param array<string, mixed>       $submission Submission row.
	 * @param list<array<string, mixed>> $line_items Planned trade-in value lines.
	 * @return array<string, mixed>
	 */
	public function present( array $submission, array $line_items, string $store_name = 'The Pug' ): array {
		$cash_total   = 0;
		$credit_total = 0;
		$items        = array();

		foreach ( $line_items as $line ) {
			$value = (int) ( $line['final_value_minor_units'] ?? 0 );

			if ( 'cash' === (string) ( $line['payout_type'] ?? '' ) ) {
				$cash_total += $value;
			} else {
				$credit_total += $value;
			}

			$items[] = array(
				'card_name'          => (string) ( $line['card_name'] ?? '' ),
				'game'               => (string) ( $line['game'] ?? '' ),
				'set_name'           => (string) ( $line['set_name'] ?? '' ),
				'condition_or_grade' => (string) ( $line['condition_or_grade'] ?? '' ),
				'quantity'           => (int) ( $line['accepted_quantity'] ?? 1 ),
				'market_mid'         => $this->money( (int) ( $line['market_mid_minor_units'] ?? 0 ) ),
				'percentage'         => $this->percentage( (int) ( $line['trade_in_percentage_basis_points'] ?? 0 ) ),
				'final_value'        => $this->money( $value ),
				'payout_type'        => (string) ( $line['payout_type'] ?? '' ),
			);
		}

		return array(
			'store_name'               => $store_name,
			'submission_id'            => (int) ( $submission['submission_id'] ?? 0 ),
			'customer_name'            => trim( (string) ( $submission['customer_name'] ?? '' ) ),
			'customer_email'           => trim( (string) ( $submission['customer_email'] ?? '' ) ),
			'completed_at'             => (string) ( $submission['completed_at'] ?? $submission['updated_at'] ?? '' ),
			'items'                    => $items,
			'cash_total'               => $this->money( $cash_total ),
			'credit_total'             => $this->money( $credit_total ),
			'grand_total'              => $this->money( $cash_total + $credit_total ),
			'cash_total_minor_units'   => $cash_total,
			'credit_total_minor_units' => $credit_total,
		);
	}

	private function money( int $minor_units ): string {
		return number_format( $minor_units / 100, 2, '.', '' );
	}

	private function percentage( int $basis_points ): string {
		return rtrim( rtrim( number_format( $basis_points / 100, 2, '.', '' ), '0' ), '.' ) . '%';
	}
}
