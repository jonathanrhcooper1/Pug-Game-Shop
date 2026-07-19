<?php
/**
 * Event registration status tests.
 *
 * @package TCGStorePlatform
 */

namespace TCGStorePlatform\Tests\Unit;

use TCGStorePlatform\Events\EventRegistrationStatus;
use TCGStorePlatform\Tests\TestCase;

final class EventRegistrationStatusTest extends TestCase {
	public function test_capacity_consuming_statuses_hold_a_seat(): void {
		$this->assert_true( EventRegistrationStatus::consumes_capacity( EventRegistrationStatus::RESERVED ) );
		$this->assert_true( EventRegistrationStatus::consumes_capacity( EventRegistrationStatus::PAID ) );
		$this->assert_true( EventRegistrationStatus::consumes_capacity( EventRegistrationStatus::CHECKED_IN ) );
	}

	public function test_non_capacity_statuses_do_not_hold_a_seat(): void {
		$this->assert_false( EventRegistrationStatus::consumes_capacity( EventRegistrationStatus::WAITLIST ) );
		$this->assert_false( EventRegistrationStatus::consumes_capacity( EventRegistrationStatus::CANCELLED ) );
		$this->assert_false( EventRegistrationStatus::consumes_capacity( EventRegistrationStatus::REFUNDED ) );
		$this->assert_false( EventRegistrationStatus::consumes_capacity( EventRegistrationStatus::FAILED ) );
	}

	public function test_duplicate_blocking_statuses_include_waitlist_and_exclude_closed_states(): void {
		$statuses = EventRegistrationStatus::duplicate_blocking_statuses();

		$this->assert_true( in_array( EventRegistrationStatus::RESERVED, $statuses, true ) );
		$this->assert_true( in_array( EventRegistrationStatus::WAITLIST, $statuses, true ) );
		$this->assert_true( in_array( EventRegistrationStatus::STAFF_REVIEW_REQUIRED, $statuses, true ) );
		$this->assert_false( in_array( EventRegistrationStatus::CANCELLED, $statuses, true ) );
		$this->assert_false( in_array( EventRegistrationStatus::REFUNDED, $statuses, true ) );
		$this->assert_false( in_array( EventRegistrationStatus::FAILED, $statuses, true ) );
	}
}
