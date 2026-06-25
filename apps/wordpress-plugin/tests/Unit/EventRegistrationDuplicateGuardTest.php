<?php
/**
 * Event registration duplicate guard tests.
 *
 * @package TCGStorePlatform
 */

namespace TCGStorePlatform\Tests\Unit;

use TCGStorePlatform\Events\EventRegistrationDuplicateGuard;
use TCGStorePlatform\Events\EventRegistrationInput;
use TCGStorePlatform\Events\EventRegistrationStatus;
use TCGStorePlatform\Tests\TestCase;

final class EventRegistrationDuplicateGuardTest extends TestCase {
	public function test_idempotency_match_requires_same_event_and_email(): void {
		$guard = new EventRegistrationDuplicateGuard();
		$input = EventRegistrationInput::from_array(
			array(
				'first_name' => 'Ada',
				'last_name'  => 'Lovelace',
				'email'      => 'ada@example.test',
			)
		);

		$this->assert_true(
			$guard->matches_request(
				array(
					'event_id' => 1001,
					'email'    => 'ADA@EXAMPLE.TEST',
				),
				array( 'event_id' => 1001 ),
				$input
			)
		);

		$this->assert_false(
			$guard->matches_request(
				array(
					'event_id' => 2002,
					'email'    => 'ada@example.test',
				),
				array( 'event_id' => 1001 ),
				$input
			)
		);

		$this->assert_false(
			$guard->matches_request(
				array(
					'event_id' => 1001,
					'email'    => 'other@example.test',
				),
				array( 'event_id' => 1001 ),
				$input
			)
		);
	}

	public function test_duplicate_guard_blocks_only_active_registration_states(): void {
		$guard = new EventRegistrationDuplicateGuard();

		$this->assert_true(
			$guard->blocks_duplicate_registration(
				array( 'status' => EventRegistrationStatus::RESERVED )
			)
		);
		$this->assert_true(
			$guard->blocks_duplicate_registration(
				array( 'status' => EventRegistrationStatus::WAITLIST )
			)
		);
		$this->assert_false(
			$guard->blocks_duplicate_registration(
				array( 'status' => EventRegistrationStatus::CANCELLED )
			)
		);
		$this->assert_false(
			$guard->blocks_duplicate_registration(
				array( 'status' => EventRegistrationStatus::FAILED )
			)
		);
	}
}
