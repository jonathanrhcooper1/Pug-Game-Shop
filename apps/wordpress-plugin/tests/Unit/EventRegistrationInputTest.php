<?php
/**
 * Event registration input tests.
 *
 * @package TCGStorePlatform
 */

namespace TCGStorePlatform\Tests\Unit;

use TCGStorePlatform\Events\EventRegistrationInput;
use TCGStorePlatform\Tests\TestCase;

final class EventRegistrationInputTest extends TestCase {
	public function test_input_sanitizes_public_registration_payload(): void {
		$input = EventRegistrationInput::from_array(
			array(
				'first_name'    => "  Ada\n",
				'last_name'     => "  Lovelace\tByron  ",
				'phone'         => '+1 (555) cards! x100',
				'email'         => 'ADA@EXAMPLE.TEST',
				'topdeck_email' => '',
			),
			'retry-key-1001'
		);

		$this->assert_true( $input->is_valid() );
		$this->assert_same( 'Ada', $input->first_name() );
		$this->assert_same( 'Lovelace Byron', $input->last_name() );
		$this->assert_same( '+1 (555) 100', $input->phone() );
		$this->assert_same( 'ada@example.test', $input->email() );
		$this->assert_same( 'ada@example.test', $input->topdeck_email() );
		$this->assert_same( 'retry-key-1001', $input->idempotency_key() );
	}

	public function test_input_reports_required_and_email_errors(): void {
		$input = EventRegistrationInput::from_array(
			array(
				'first_name'    => '',
				'last_name'     => '',
				'email'         => 'not-an-email',
				'topdeck_email' => 'also-not-email',
			)
		);

		$this->assert_false( $input->is_valid() );
		$this->assert_same(
			array(
				'first_name_required',
				'last_name_required',
				'email_invalid',
				'topdeck_email_invalid',
			),
			$input->errors()
		);
	}

	public function test_insert_data_uses_topdeck_email_when_provided(): void {
		$input = EventRegistrationInput::from_array(
			array(
				'first_name'      => 'Grace',
				'last_name'       => 'Hopper',
				'email'           => 'grace@example.test',
				'topdeck_email'   => 'topdeck-grace@example.test',
				'idempotency_key' => 'client-key-1',
			)
		);

		$data = $input->to_insert_data();

		$this->assert_same( 'topdeck-grace@example.test', $data['topdeck_email'] );
		$this->assert_same( 'client-key-1', $data['idempotency_key'] );
	}
}
