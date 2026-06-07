<?php
/**
 * Buylist offer planner tests.
 *
 * @package TCGStorePlatform
 */

namespace TCGStorePlatform\Tests\Unit;

use TCGStorePlatform\Buylist\BuylistOfferPlanner;
use TCGStorePlatform\Buylist\BuylistSubmissionStatus;
use TCGStorePlatform\Tests\TestCase;

final class BuylistOfferPlannerTest extends TestCase {
	public function test_planner_builds_offer_payload_without_manager_approval(): void {
		$plan = ( new BuylistOfferPlanner() )->plan(
			$this->submission(),
			array(
				$this->item( 101, '4.0000', '5.0000' ),
				$this->item( 102, '1.2500', '2.5000' ),
			),
			array(
				'expires_at' => '2026-06-13 12:00:00',
			)
		);

		$payload = $plan->offer_payload();

		$this->assert_true( $plan->can_offer() );
		$this->assert_false( $plan->requires_manager_approval() );
		$this->assert_same( BuylistSubmissionStatus::OFFERED, $payload['target_submission_status'] );
		$this->assert_same( '5.2500', $payload['total_cash_offer'] );
		$this->assert_same( '7.5000', $payload['total_credit_offer'] );
		$this->assert_same( 'USD', $payload['currency'] );
		$this->assert_same( '2026-06-13 12:00:00', $payload['expires_at'] );
		$this->assert_same( 2, count( $plan->item_offers() ) );
	}

	public function test_thresholds_plan_manager_approval_requests(): void {
		$plan = ( new BuylistOfferPlanner() )->plan(
			$this->submission(),
			array(
				$this->item( 101, '125.0000', '150.0000' ),
			),
			array(
				'cash_approval_threshold'        => '100.0000',
				'credit_approval_threshold'      => '140.0000',
				'item_cash_approval_threshold'   => '50.0000',
				'item_credit_approval_threshold' => '75.0000',
			)
		);

		$payload   = $plan->offer_payload();
		$approvals = $plan->approval_requests();

		$this->assert_true( $plan->requires_manager_approval() );
		$this->assert_same( BuylistSubmissionStatus::OFFER_PENDING_APPROVAL, $payload['target_submission_status'] );
		$this->assert_same( 4, count( $approvals ) );
		$this->assert_same( 'item_cash_threshold', $approvals[0]['reason'] );
		$this->assert_same( 'item_credit_threshold', $approvals[1]['reason'] );
		$this->assert_same( 'cash_total_threshold', $approvals[2]['reason'] );
		$this->assert_same( 'credit_total_threshold', $approvals[3]['reason'] );
	}

	public function test_invalid_submission_and_items_are_reported(): void {
		$submission           = $this->submission();
		$submission['status'] = BuylistSubmissionStatus::SUBMITTED;

		$plan = ( new BuylistOfferPlanner() )->plan(
			$submission,
			array(
				array(
					'buylist_item_id'   => '',
					'quantity'          => 1,
					'accepted_quantity' => 2,
					'cash_offer'        => '-1.00',
					'credit_offer'      => 'bad',
				),
			)
		);

		$this->assert_false( $plan->can_offer() );
		$this->assert_true( in_array( 'submission_not_ready_for_offer', $plan->errors(), true ) );
		$this->assert_true( in_array( 'items_0_buylist_item_id_required', $plan->errors(), true ) );
		$this->assert_true( in_array( 'items_0_accepted_quantity_exceeds_quantity', $plan->errors(), true ) );
		$this->assert_true( in_array( 'items_0_cash_offer_invalid', $plan->errors(), true ) );
		$this->assert_true( in_array( 'items_0_credit_offer_invalid', $plan->errors(), true ) );
	}

	public function test_zero_offer_amount_is_rejected(): void {
		$plan = ( new BuylistOfferPlanner() )->plan(
			$this->submission(),
			array(
				$this->item( 101, '0.0000', '0.0000' ),
			)
		);

		$this->assert_false( $plan->can_offer() );
		$this->assert_true( in_array( 'offer_amount_required', $plan->errors(), true ) );
	}

	public function test_offer_fingerprint_is_stable_for_same_payload(): void {
		$planner = new BuylistOfferPlanner();
		$first   = $planner->plan( $this->submission(), array( $this->item( 101, '1.0000', '2.0000' ) ) );
		$second  = $planner->plan( $this->submission(), array( $this->item( 101, '1.0000', '2.0000' ) ) );

		$this->assert_same(
			$first->offer_payload()['offer_fingerprint'],
			$second->offer_payload()['offer_fingerprint']
		);
	}

	/**
	 * @return array<string, mixed>
	 */
	private function submission(): array {
		return array(
			'submission_id' => 77,
			'status'        => BuylistSubmissionStatus::UNDER_REVIEW,
			'currency'      => 'usd',
			'offer_version' => 2,
		);
	}

	/**
	 * @return array<string, mixed>
	 */
	private function item( int $item_id, string $cash_offer, string $credit_offer ): array {
		return array(
			'buylist_item_id'   => $item_id,
			'quantity'          => 1,
			'accepted_quantity' => 1,
			'cash_offer'        => $cash_offer,
			'credit_offer'      => $credit_offer,
		);
	}
}
