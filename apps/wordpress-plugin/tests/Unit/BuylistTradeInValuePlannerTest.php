<?php
/**
 * Buylist trade-in value planner tests.
 *
 * @package TCGStorePlatform
 */

namespace TCGStorePlatform\Tests\Unit;

use TCGStorePlatform\Buylist\BuylistReceiptPresenter;
use TCGStorePlatform\Buylist\BuylistTradeInValuePlanner;
use TCGStorePlatform\Tests\TestCase;

final class BuylistTradeInValuePlannerTest extends TestCase {
	public function test_planner_uses_market_mid_percentage_and_rounds_down_to_whole_dollars(): void {
		$plan = ( new BuylistTradeInValuePlanner() )->plan(
			array(
				array(
					'buylist_item_id'                 => 10,
					'card_name'                       => 'Demonic Tutor',
					'game'                            => 'magicthegathering',
					'set_name'                        => 'Mystical Archive',
					'quantity'                        => 1,
					'market_mid_minor_units'          => 1875,
					'trade_in_percentage_basis_points' => 6000,
					'payout_type'                     => 'credit',
				),
			)
		);

		$this->assert_true( $plan['can_plan'] );
		$this->assert_same( 0, $plan['cash_total_minor_units'] );
		$this->assert_same( 1100, $plan['credit_total_minor_units'] );
		$this->assert_same( 1100, $plan['line_items'][0]['final_unit_value_minor_units'] );
	}

	public function test_planner_supports_mixed_cash_and_credit_lines(): void {
		$plan = ( new BuylistTradeInValuePlanner() )->plan(
			array(
				$this->item( 1, 2500, 5000, 'cash' ),
				$this->item( 2, 1999, 5000, 'credit' ),
			)
		);

		$this->assert_true( $plan['can_plan'] );
		$this->assert_same( 1200, $plan['cash_total_minor_units'] );
		$this->assert_same( 900, $plan['credit_total_minor_units'] );
		$this->assert_same( 2100, $plan['combined_total_minor_units'] );
	}

	public function test_manager_override_requires_reason_and_is_logged_on_line(): void {
		$without_reason = ( new BuylistTradeInValuePlanner() )->plan(
			array(
				$this->item( 1, 2500, 5000, 'cash' ) + array(
					'override_final_value_minor_units' => 2000,
				),
			)
		);

		$with_reason = ( new BuylistTradeInValuePlanner() )->plan(
			array(
				$this->item( 1, 2500, 5000, 'cash' ) + array(
					'override_final_value_minor_units' => 2000,
					'override_reason'                  => 'manager approved premium condition',
				),
			)
		);

		$this->assert_false( $without_reason['can_plan'] );
		$this->assert_true( in_array( 'items_0_override_reason_required', $without_reason['errors'], true ) );
		$this->assert_true( $with_reason['can_plan'] );
		$this->assert_true( $with_reason['line_items'][0]['manager_override'] );
		$this->assert_same( 2000, $with_reason['cash_total_minor_units'] );
	}

	public function test_trade_in_percentage_must_be_zero_to_one_hundred_in_five_percent_increments(): void {
		$valid = ( new BuylistTradeInValuePlanner() )->plan(
			array(
				$this->item( 1, 2500, 0, 'credit' ),
				$this->item( 2, 2500, 10000, 'cash' ),
			)
		);

		$invalid = ( new BuylistTradeInValuePlanner() )->plan(
			array(
				$this->item( 3, 2500, 6250, 'credit' ),
				$this->item( 4, 2500, 10500, 'cash' ),
			)
		);

		$this->assert_true( $valid['can_plan'] );
		$this->assert_false( $invalid['can_plan'] );
		$this->assert_true( in_array( 'items_0_trade_in_percentage_must_use_5_percent_increment', $invalid['errors'], true ) );
		$this->assert_true( in_array( 'items_1_trade_in_percentage_invalid', $invalid['errors'], true ) );
	}

	public function test_receipt_uses_stored_line_values_and_two_decimal_display(): void {
		$plan = ( new BuylistTradeInValuePlanner() )->plan(
			array(
				$this->item( 1, 2500, 5000, 'cash' ),
				$this->item( 2, 1999, 5000, 'credit' ),
			)
		);

		$receipt = ( new BuylistReceiptPresenter() )->present(
			array(
				'submission_id'  => 77,
				'customer_name'  => 'Jane Customer',
				'customer_email' => 'jane@example.test',
			),
			$plan['line_items']
		);

		$this->assert_same( '12.00', $receipt['cash_total'] );
		$this->assert_same( '9.00', $receipt['credit_total'] );
		$this->assert_same( '21.00', $receipt['grand_total'] );
		$this->assert_same( '12.00', $receipt['items'][0]['final_value'] );
	}

	/**
	 * @return array<string, mixed>
	 */
	private function item( int $id, int $market_mid, int $percentage, string $payout_type ): array {
		return array(
			'buylist_item_id'                  => $id,
			'card_name'                        => 'Charizard VMAX',
			'game'                             => 'pokemon',
			'set_name'                         => 'Shining Fates',
			'condition_code'                   => 'NM',
			'quantity'                         => 1,
			'market_mid_minor_units'           => $market_mid,
			'trade_in_percentage_basis_points' => $percentage,
			'payout_type'                      => $payout_type,
		);
	}
}
