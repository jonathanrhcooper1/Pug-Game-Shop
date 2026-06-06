<?php
/**
 * Customer credit posting policy tests.
 *
 * @package TCGStorePlatform
 */

namespace TCGStorePlatform\Tests\Unit;

use TCGStorePlatform\Credit\CustomerCreditEntryType;
use TCGStorePlatform\Credit\CustomerCreditPostingPolicy;
use TCGStorePlatform\Tests\TestCase;

final class CustomerCreditPostingPolicyTest extends TestCase {
	public function test_buylist_credit_adds_to_balance(): void {
		$decision = ( new CustomerCreditPostingPolicy() )->preview(
			CustomerCreditEntryType::BUYLIST_CREDIT,
			'22.50',
			'10.0000'
		);

		$this->assert_true( $decision->is_accepted() );
		$this->assert_same( '22.5000', $decision->signed_amount() );
		$this->assert_same( '10.0000', $decision->balance_before() );
		$this->assert_same( '32.5000', $decision->balance_after() );
		$this->assert_false( $decision->manager_required() );
	}

	public function test_purchase_redemption_subtracts_and_rejects_overspend(): void {
		$accepted = ( new CustomerCreditPostingPolicy() )->preview(
			CustomerCreditEntryType::PURCHASE_REDEMPTION,
			'5.25',
			'10.0000'
		);
		$rejected = ( new CustomerCreditPostingPolicy() )->preview(
			CustomerCreditEntryType::PURCHASE_REDEMPTION,
			'15.00',
			'10.0000'
		);

		$this->assert_true( $accepted->is_accepted() );
		$this->assert_same( '-5.2500', $accepted->signed_amount() );
		$this->assert_same( '4.7500', $accepted->balance_after() );
		$this->assert_false( $rejected->is_accepted() );
		$this->assert_same( 'insufficient_credit', $rejected->code() );
	}

	public function test_manual_adjustments_require_manager_approval(): void {
		$without_manager = ( new CustomerCreditPostingPolicy() )->preview(
			CustomerCreditEntryType::MANUAL_ADD,
			'5.00',
			'10.0000'
		);
		$with_manager    = ( new CustomerCreditPostingPolicy() )->preview(
			CustomerCreditEntryType::MANUAL_ADD,
			'5.00',
			'10.0000',
			true
		);

		$this->assert_false( $without_manager->is_accepted() );
		$this->assert_same( 'manager_approval_required', $without_manager->code() );
		$this->assert_true( $with_manager->is_accepted() );
		$this->assert_true( $with_manager->manager_required() );
		$this->assert_same( '15.0000', $with_manager->balance_after() );
	}

	public function test_corrections_accept_signed_amounts_with_manager(): void {
		$decision = ( new CustomerCreditPostingPolicy() )->preview(
			CustomerCreditEntryType::CORRECTION,
			'-2.1250',
			'10.0000',
			true
		);

		$this->assert_true( $decision->is_accepted() );
		$this->assert_same( '-2.1250', $decision->signed_amount() );
		$this->assert_same( '7.8750', $decision->balance_after() );
	}

	public function test_invalid_amount_and_entry_type_are_rejected(): void {
		$invalid_type   = ( new CustomerCreditPostingPolicy() )->preview( 'gift_card', '1.00', '0.0000' );
		$invalid_amount = ( new CustomerCreditPostingPolicy() )->preview(
			CustomerCreditEntryType::REFUND_CREDIT,
			'1.00001',
			'0.0000'
		);

		$this->assert_false( $invalid_type->is_accepted() );
		$this->assert_same( 'invalid_entry_type', $invalid_type->code() );
		$this->assert_false( $invalid_amount->is_accepted() );
		$this->assert_same( 'invalid_amount', $invalid_amount->code() );
	}
}
