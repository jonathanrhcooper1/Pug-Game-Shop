<?php
/**
 * Event registration notification mailer tests.
 *
 * @package TCGStorePlatform
 */

namespace TCGStorePlatform\Tests\Unit;

use TCGStorePlatform\Events\EventPaymentStatus;
use TCGStorePlatform\Events\EventRegistrationDecision;
use TCGStorePlatform\Events\EventRegistrationNotificationMailer;
use TCGStorePlatform\Events\EventRegistrationStatus;
use TCGStorePlatform\Tests\TestCase;

final class EventRegistrationNotificationMailerTest extends TestCase {
	public function test_registration_email_includes_event_details_and_store_address(): void {
		$mailer       = new EventRegistrationNotificationMailer();
		$decision     = EventRegistrationDecision::accepted(
			EventRegistrationStatus::RESERVED,
			EventPaymentStatus::PAY_AT_STORE,
			'Registration reserved.'
		);
		$message_body = implode(
			"\n",
			$mailer->message_lines(
				array(
					'title'          => 'Commander Night',
					'game'           => 'Magic: The Gathering',
					'format'         => 'Commander',
					'entry_fee'      => '10.00',
					'currency'       => 'USD',
					'start_datetime' => '2026-07-03 18:30:00',
					'timezone'       => 'America/New_York',
				),
				array(
					'first_name' => 'Sam',
					'last_name'  => 'Player',
					'email'      => 'sam@example.com',
					'phone'      => '865-555-0100',
				),
				$decision
			)
		);

		$this->assert_contains( 'Commander Night', $message_body );
		$this->assert_contains( 'Magic: The Gathering', $message_body );
		$this->assert_contains( '$10.00. Pay at the store.', $message_body );
		$this->assert_contains( 'Sam Player', $message_body );
		$this->assert_contains( '513 Wears Valley Rd Suite #9.75', $message_body );
		$this->assert_contains( 'Pigeon Forge, TN 37862', $message_body );
		$this->assert_contains( '(865) 774-0712', $message_body );
	}

	public function test_free_event_email_says_no_payment_needed(): void {
		$mailer       = new EventRegistrationNotificationMailer();
		$decision     = EventRegistrationDecision::accepted(
			EventRegistrationStatus::RESERVED,
			EventPaymentStatus::NOT_REQUIRED,
			'Registration reserved.'
		);
		$message_body = implode(
			"\n",
			$mailer->message_lines(
				array(
					'title'          => 'Free Play',
					'entry_fee'      => '0.00',
					'currency'       => 'USD',
					'start_datetime' => '',
				),
				array(
					'first_name' => 'Alex',
					'last_name'  => 'Guest',
					'email'      => 'alex@example.com',
				),
				$decision
			)
		);

		$this->assert_contains( 'Free. No payment needed.', $message_body );
		$this->assert_contains( 'When: To be announced', $message_body );
	}
}
