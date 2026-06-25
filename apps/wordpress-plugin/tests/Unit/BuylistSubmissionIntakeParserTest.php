<?php
/**
 * Buylist submission intake parser tests.
 *
 * @package TCGStorePlatform
 */

namespace TCGStorePlatform\Tests\Unit;

use TCGStorePlatform\Buylist\BuylistSubmissionIntakeParser;
use TCGStorePlatform\Tests\TestCase;

final class BuylistSubmissionIntakeParserTest extends TestCase {
	public function test_parser_builds_submission_request_with_normalized_items(): void {
		$result = ( new BuylistSubmissionIntakeParser() )->parse(
			array(
				'source'              => 'Website',
				'idempotency_key'     => 'body-key-ignored',
				'currency'            => 'usd',
				'customer_first_name' => 'Sam',
				'customer_last_name'  => 'Collector',
				'customer_phone'      => '555-0101',
				'customer_email'      => 'SAM@example.com',
				'customer_id'         => '12',
				'location_id'         => 3,
				'items'               => array(
					array(
						'manual_card_name'    => 'Charizard',
						'game'                => 'pokemon',
						'quantity'            => '2',
						'submitted_condition' => 'lp',
					),
					array(
						'reference_card_id' => 99,
						'raw_or_graded'     => 'graded',
						'grading_company'   => 'PSA',
						'grade'             => '10',
						'cert_number'       => '12345678',
					),
				),
			),
			'header-buylist-1',
			22
		);

		$this->assert_true( $result->is_valid() );

		$request = $result->request();

		$this->assert_true( null !== $request );
		$this->assert_same( 'website', $request->source() );
		$this->assert_same( 'header-buylist-1', $request->idempotency_key() );
		$this->assert_same( 'USD', $request->currency() );
		$this->assert_same( 'sam@example.com', $request->customer_email() );
		$this->assert_same( 12, $request->customer_id() );
		$this->assert_same( 3, $request->location_id() );
		$this->assert_same( 22, $request->actor_user_id() );
		$this->assert_same( 2, $request->items()[0]['quantity'] );
		$this->assert_same( 'graded', $request->items()[1]['raw_or_graded'] );
	}

	public function test_parser_rejects_missing_required_submission_fields(): void {
		$result = ( new BuylistSubmissionIntakeParser() )->parse(
			array(
				'source'   => 'mailbag',
				'currency' => 'US',
				'items'    => array(),
			)
		);

		$this->assert_false( $result->is_valid() );
		$this->assert_true( in_array( 'source_invalid', $result->errors(), true ) );
		$this->assert_true( in_array( 'idempotency_key_required', $result->errors(), true ) );
		$this->assert_true( in_array( 'customer_phone_required', $result->errors(), true ) );
		$this->assert_true( in_array( 'currency_invalid', $result->errors(), true ) );
		$this->assert_true( in_array( 'items_required', $result->errors(), true ) );
	}

	public function test_parser_rejects_invalid_item_payloads(): void {
		$result = ( new BuylistSubmissionIntakeParser() )->parse(
			array(
				'source'          => 'kiosk',
				'idempotency_key' => 'buylist-kiosk-1',
				'customer_phone'  => '555-0102',
				'items'           => array(
					array(
						'quantity' => 0,
					),
					array(
						'manual_card_name' => 'Graded card',
						'raw_or_graded'     => 'graded',
					),
				),
			)
		);

		$this->assert_false( $result->is_valid() );
		$this->assert_true( in_array( 'items_0_identity_required', $result->errors(), true ) );
		$this->assert_true( in_array( 'items_0_quantity_invalid', $result->errors(), true ) );
		$this->assert_true( in_array( 'items_1_grade_required', $result->errors(), true ) );
	}

	public function test_parser_rejects_bad_owner_token_and_optional_ids(): void {
		$result = ( new BuylistSubmissionIntakeParser() )->parse(
			array(
				'source'           => 'offline',
				'idempotency_key'  => 'offline-1',
				'customer_phone'   => '555-0103',
				'owner_token_hash' => 'not-a-hash',
				'customer_id'      => 'guest',
				'location_id'      => 0,
				'items'            => array(
					array(
						'manual_card_name' => 'Island',
					),
				),
			)
		);

		$this->assert_false( $result->is_valid() );
		$this->assert_true( in_array( 'owner_token_hash_invalid', $result->errors(), true ) );
		$this->assert_true( in_array( 'customer_id_invalid', $result->errors(), true ) );
		$this->assert_true( in_array( 'location_id_invalid', $result->errors(), true ) );
	}
}
