<?php
/**
 * Customer credit REST posting parser tests.
 *
 * @package TCGStorePlatform
 */

namespace TCGStorePlatform\Tests\Unit;

use TCGStorePlatform\Credit\CustomerCreditEntryType;
use TCGStorePlatform\Credit\CustomerCreditRestPostingParser;
use TCGStorePlatform\Tests\TestCase;

final class CustomerCreditRestPostingParserTest extends TestCase {
	public function test_parser_builds_redemption_request_from_route_and_header(): void {
		$result = ( new CustomerCreditRestPostingParser() )->parse(
			10,
			array(
				'customer_id'     => 10,
				'entry_type'      => CustomerCreditEntryType::PURCHASE_REDEMPTION,
				'amount'          => '5.2500',
				'idempotency_key' => 'body-key-ignored',
				'currency'        => 'usd',
				'order_id'        => '100',
				'location_id'     => 7,
				'metadata'        => array(
					'cart_id' => 'cart-123',
				),
			),
			'header-key-100',
			22
		);

		$this->assert_true( $result->is_valid() );

		$request = $result->request();

		$this->assert_true( null !== $request );
		$this->assert_same( 10, $request->customer_id() );
		$this->assert_same( CustomerCreditEntryType::PURCHASE_REDEMPTION, $request->entry_type() );
		$this->assert_same( '5.2500', $request->amount() );
		$this->assert_same( 'header-key-100', $request->idempotency_key() );
		$this->assert_same( 'USD', $request->currency() );
		$this->assert_same( 22, $request->actor_user_id() );
		$this->assert_same( 100, $request->order_id() );
		$this->assert_same( 7, $request->location_id() );
	}

	public function test_parser_rejects_customer_mismatch_missing_key_and_bad_currency(): void {
		$result = ( new CustomerCreditRestPostingParser() )->parse(
			10,
			array(
				'customer_id' => 11,
				'entry_type'  => CustomerCreditEntryType::BUYLIST_CREDIT,
				'amount'      => '2.00',
				'currency'    => 'US',
			)
		);

		$this->assert_false( $result->is_valid() );
		$this->assert_true( in_array( 'customer_id_mismatch', $result->errors(), true ) );
		$this->assert_true( in_array( 'idempotency_key_required', $result->errors(), true ) );
		$this->assert_true( in_array( 'currency_invalid', $result->errors(), true ) );
	}

	public function test_manager_adjustment_requires_manager_and_reason(): void {
		$missing = ( new CustomerCreditRestPostingParser() )->parse(
			10,
			array(
				'entry_type'      => CustomerCreditEntryType::MANUAL_ADD,
				'amount'          => '10.00',
				'idempotency_key' => 'manual-10-1',
			)
		);

		$this->assert_false( $missing->is_valid() );
		$this->assert_true( in_array( 'manager_user_id_required', $missing->errors(), true ) );
		$this->assert_true( in_array( 'reason_required', $missing->errors(), true ) );

		$accepted = ( new CustomerCreditRestPostingParser() )->parse(
			10,
			array(
				'entry_type'      => CustomerCreditEntryType::MANUAL_ADD,
				'amount'          => '10.00',
				'idempotency_key' => 'manual-10-1',
				'manager_user_id' => 91,
				'reason'          => 'Corrected intake credit.',
			)
		);

		$this->assert_true( $accepted->is_valid() );
		$this->assert_true( $accepted->request()?->has_manager_approval() ?? false );
		$this->assert_same( 'Corrected intake credit.', $accepted->request()?->reason() );
	}

	public function test_parser_rejects_invalid_optional_ids_and_metadata(): void {
		$result = ( new CustomerCreditRestPostingParser() )->parse(
			10,
			array(
				'entry_type'      => CustomerCreditEntryType::REFUND_CREDIT,
				'amount'          => '3.00',
				'idempotency_key' => 'refund-10-1',
				'order_id'        => 0,
				'location_id'     => 'front',
				'metadata'        => 'not-an-object',
			)
		);

		$this->assert_false( $result->is_valid() );
		$this->assert_true( in_array( 'order_id_invalid', $result->errors(), true ) );
		$this->assert_true( in_array( 'location_id_invalid', $result->errors(), true ) );
		$this->assert_true( in_array( 'metadata_must_be_object', $result->errors(), true ) );
	}
}
