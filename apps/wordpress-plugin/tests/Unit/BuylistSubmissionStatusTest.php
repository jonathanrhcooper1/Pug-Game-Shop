<?php
/**
 * Buylist submission status tests.
 *
 * @package TCGStorePlatform
 */

namespace TCGStorePlatform\Tests\Unit;

use TCGStorePlatform\Buylist\BuylistSubmissionStatus;
use TCGStorePlatform\Tests\TestCase;

final class BuylistSubmissionStatusTest extends TestCase {
	public function test_buylist_statuses_include_review_offer_acceptance_and_completion_flow(): void {
		$this->assert_true( in_array( BuylistSubmissionStatus::DRAFT, BuylistSubmissionStatus::all(), true ) );
		$this->assert_true( in_array( BuylistSubmissionStatus::UNDER_REVIEW, BuylistSubmissionStatus::all(), true ) );
		$this->assert_true( in_array( BuylistSubmissionStatus::OFFER_PENDING_APPROVAL, BuylistSubmissionStatus::all(), true ) );
		$this->assert_true( in_array( BuylistSubmissionStatus::CONVERSION_PENDING, BuylistSubmissionStatus::all(), true ) );
	}

	public function test_status_flow_allows_documented_forward_transitions(): void {
		$this->assert_true( BuylistSubmissionStatus::can_transition( BuylistSubmissionStatus::DRAFT, BuylistSubmissionStatus::SUBMITTED ) );
		$this->assert_true( BuylistSubmissionStatus::can_transition( BuylistSubmissionStatus::SUBMITTED, BuylistSubmissionStatus::UNDER_REVIEW ) );
		$this->assert_true( BuylistSubmissionStatus::can_transition( BuylistSubmissionStatus::UNDER_REVIEW, BuylistSubmissionStatus::OFFER_PENDING_APPROVAL ) );
		$this->assert_true( BuylistSubmissionStatus::can_transition( BuylistSubmissionStatus::OFFER_PENDING_APPROVAL, BuylistSubmissionStatus::OFFERED ) );
		$this->assert_true( BuylistSubmissionStatus::can_transition( BuylistSubmissionStatus::OFFERED, BuylistSubmissionStatus::ACCEPTED ) );
		$this->assert_true( BuylistSubmissionStatus::can_transition( BuylistSubmissionStatus::ACCEPTED, BuylistSubmissionStatus::PAYOUT_PENDING ) );
		$this->assert_true( BuylistSubmissionStatus::can_transition( BuylistSubmissionStatus::CONVERSION_PENDING, BuylistSubmissionStatus::COMPLETED ) );
	}

	public function test_status_flow_rejects_backwards_or_terminal_transitions(): void {
		$this->assert_false( BuylistSubmissionStatus::can_transition( BuylistSubmissionStatus::OFFERED, BuylistSubmissionStatus::UNDER_REVIEW ) );
		$this->assert_false( BuylistSubmissionStatus::can_transition( BuylistSubmissionStatus::COMPLETED, BuylistSubmissionStatus::UNDER_REVIEW ) );
		$this->assert_false( BuylistSubmissionStatus::can_transition( BuylistSubmissionStatus::REJECTED, BuylistSubmissionStatus::OFFERED ) );
	}

	public function test_terminal_statuses_are_identified(): void {
		$this->assert_true( BuylistSubmissionStatus::is_terminal( BuylistSubmissionStatus::REJECTED ) );
		$this->assert_true( BuylistSubmissionStatus::is_terminal( BuylistSubmissionStatus::EXPIRED ) );
		$this->assert_true( BuylistSubmissionStatus::is_terminal( BuylistSubmissionStatus::COMPLETED ) );
		$this->assert_true( BuylistSubmissionStatus::is_terminal( BuylistSubmissionStatus::CANCELLED ) );
		$this->assert_false( BuylistSubmissionStatus::is_terminal( BuylistSubmissionStatus::OFFERED ) );
	}
}
