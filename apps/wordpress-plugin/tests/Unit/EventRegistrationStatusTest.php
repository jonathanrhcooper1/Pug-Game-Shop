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
		$this->assert_true( EventRegistrationStatus::consumes_capacity( EventRegistrationStatus::REGISTERED_TOPDECK ) );
		$this->assert_true( EventRegistrationStatus::consumes_capacity( EventRegistrationStatus::PENDING_TOPDECK_INVITE ) );
		$this->assert_true( EventRegistrationStatus::consumes_capacity( EventRegistrationStatus::CHECKED_IN ) );
	}

	public function test_non_capacity_statuses_do_not_hold_a_seat(): void {
		$this->assert_false( EventRegistrationStatus::consumes_capacity( EventRegistrationStatus::WAITLIST ) );
		$this->assert_false( EventRegistrationStatus::consumes_capacity( EventRegistrationStatus::CANCELLED ) );
		$this->assert_false( EventRegistrationStatus::consumes_capacity( EventRegistrationStatus::REFUNDED ) );
		$this->assert_false( EventRegistrationStatus::consumes_capacity( EventRegistrationStatus::FAILED ) );
		$this->assert_false( EventRegistrationStatus::consumes_capacity( EventRegistrationStatus::TOPDECK_CAPACITY_CONFLICT ) );
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

	public function test_topdeck_outcomes_map_to_local_statuses(): void {
		$this->assert_same(
			EventRegistrationStatus::REGISTERED_TOPDECK,
			EventRegistrationStatus::from_topdeck_result( 'registered', 200 )
		);
		$this->assert_same(
			EventRegistrationStatus::PENDING_TOPDECK_INVITE,
			EventRegistrationStatus::from_topdeck_result( 'pending_invitation', 202 )
		);
		$this->assert_same(
			EventRegistrationStatus::ALREADY_REGISTERED,
			EventRegistrationStatus::from_topdeck_result( 'already_registered', 200 )
		);
		$this->assert_same(
			EventRegistrationStatus::TOPDECK_CAPACITY_CONFLICT,
			EventRegistrationStatus::from_topdeck_result( 'registered', 409 )
		);
		$this->assert_same(
			EventRegistrationStatus::FAILED,
			EventRegistrationStatus::from_topdeck_result( 'banned', 403 )
		);
	}
}
