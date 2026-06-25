<?php
/**
 * Customer credit REST presenter tests.
 *
 * @package TCGStorePlatform
 */

namespace TCGStorePlatform\Tests\Unit;

use TCGStorePlatform\Credit\CustomerCreditPostingResult;
use TCGStorePlatform\Credit\CustomerCreditRestPresenter;
use TCGStorePlatform\Credit\CustomerCreditRestPostingValidationResult;
use TCGStorePlatform\Tests\TestCase;

final class CustomerCreditRestPresenterTest extends TestCase {
	public function test_balance_response_exposes_credit_without_private_contact_fields(): void {
		$response = CustomerCreditRestPresenter::present_balance(
			array(
				'customer_id'      => 10,
				'public_id'        => 'cust-public-10',
				'display_name'     => 'Jane Player',
				'normalized_phone' => '+15555550123',
				'normalized_email' => 'jane@example.test',
				'credit_balance'   => '12.5',
				'credit_currency'  => 'usd',
				'credit_version'   => 3,
				'row_version'      => 7,
				'status'           => 'active',
				'updated_at'       => '2026-06-06 12:00:00',
			)
		);

		$data = $response['data'];

		$this->assert_same( 10, $data['customer_id'] );
		$this->assert_same( 'cust-public-10', $data['public_id'] );
		$this->assert_same( 'Jane Player', $data['display_name'] );
		$this->assert_same( '12.50', $data['credit']['balance'] );
		$this->assert_same( 'USD', $data['credit']['currency'] );
		$this->assert_same( 3, $data['credit']['version'] );
		$this->assert_false( isset( $data['normalized_phone'] ) );
		$this->assert_false( isset( $data['normalized_email'] ) );
	}

	public function test_ledger_response_shapes_rows_and_redacts_metadata(): void {
		$response = CustomerCreditRestPresenter::present_ledger(
			array(
				array(
					'credit_ledger_id'      => 99,
					'public_id'             => 'ledger-public-99',
					'customer_id'           => 10,
					'entry_type'            => 'buylist_credit',
					'amount'                => '8.5',
					'currency'              => 'usd',
					'balance_before'        => '12.0000',
					'balance_after'         => '20.5000',
					'idempotency_key'       => 'buylist-10-1',
					'actor_user_id'         => 123,
					'buylist_submission_id' => 456,
					'metadata_json'         => '{"safe":"visible","api_key":"secret","nested":{"manager_pin":"1234"}}',
					'created_at'            => '2026-06-06 12:00:00',
				),
			),
			2,
			25,
			'next-cursor'
		);

		$entry = $response['data'][0];

		$this->assert_same( 99, $entry['ledger_entry_id'] );
		$this->assert_same( '8.50', $entry['amount'] );
		$this->assert_same( 'USD', $entry['currency'] );
		$this->assert_same( '20.50', $entry['balance_after'] );
		$this->assert_same( 'visible', $entry['metadata']['safe'] );
		$this->assert_same( '[redacted]', $entry['metadata']['api_key'] );
		$this->assert_same( '[redacted]', $entry['metadata']['nested']['manager_pin'] );
		$this->assert_same( 2, $response['paging']['page'] );
		$this->assert_same( 25, $response['paging']['page_size'] );
		$this->assert_same( 'next-cursor', $response['paging']['next_cursor'] );
	}

	public function test_posting_result_response_includes_outcome_and_balance(): void {
		$response = CustomerCreditRestPresenter::present_posting_result(
			CustomerCreditPostingResult::idempotent(
				array(
					'credit_ledger_id' => 99,
					'balance_after'    => '20.5',
				)
			),
			10,
			'usd'
		);

		$data = $response['data'];

		$this->assert_true( $data['accepted'] );
		$this->assert_true( $data['idempotent'] );
		$this->assert_same( 'idempotent_replay', $data['code'] );
		$this->assert_same( 99, $data['ledger_entry_id'] );
		$this->assert_same( '20.50', $data['balance_after']['amount'] );
		$this->assert_same( 'USD', $data['balance_after']['currency'] );
	}

	public function test_validation_error_response_is_stable(): void {
		$response = CustomerCreditRestPresenter::present_validation_errors(
			CustomerCreditRestPostingValidationResult::rejected(
				array( 'idempotency_key_required', 'amount_invalid' )
			)
		);

		$this->assert_same( 'validation_failed', $response['error']['code'] );
		$this->assert_same(
			array( 'idempotency_key_required', 'amount_invalid' ),
			$response['error']['details']['errors']
		);
	}
}
