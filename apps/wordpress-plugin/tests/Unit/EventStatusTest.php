<?php
/**
 * Event status tests.
 *
 * @package TCGStorePlatform
 */

namespace TCGStorePlatform\Tests\Unit;

use DateTimeImmutable;
use DateTimeZone;
use TCGStorePlatform\Events\EventStatus;
use TCGStorePlatform\Tests\TestCase;

final class EventStatusTest extends TestCase {
	public function test_registration_status_is_open_when_capacity_remains(): void {
		$status = EventStatus::registration_status( 32, 12, false, null, new DateTimeImmutable( '2026-06-01 12:00:00' ) );

		$this->assert_same( EventStatus::OPEN, $status );
	}

	public function test_registration_status_is_almost_full_near_capacity(): void {
		$status = EventStatus::registration_status( 32, 30, false, null, new DateTimeImmutable( '2026-06-01 12:00:00' ) );

		$this->assert_same( EventStatus::ALMOST_FULL, $status );
	}

	public function test_sold_out_can_be_waitlist_when_enabled(): void {
		$status = EventStatus::registration_status( 32, 32, true, null, new DateTimeImmutable( '2026-06-01 12:00:00' ) );

		$this->assert_same( EventStatus::WAITLIST, $status );
	}

	public function test_registration_deadline_closes_event(): void {
		$status = EventStatus::registration_status(
			32,
			12,
			false,
			new DateTimeImmutable( '2026-05-31 23:59:00' ),
			new DateTimeImmutable( '2026-06-01 12:00:00' )
		);

		$this->assert_same( EventStatus::REGISTRATION_CLOSED, $status );
	}

	public function test_badges_include_today_decklist_and_local_markers(): void {
		$timezone = new DateTimeZone( 'America/New_York' );

		$todays_badges = EventStatus::badges(
			EventStatus::OPEN,
			new DateTimeImmutable( '2026-06-06 19:00:00', $timezone ),
			true,
			new DateTimeImmutable( '2026-06-06 09:00:00', $timezone )
		);

		$local_badges = EventStatus::badges(
			EventStatus::OPEN,
			new DateTimeImmutable( '2026-06-07 19:00:00', $timezone ),
			false,
			new DateTimeImmutable( '2026-06-06 09:00:00', $timezone )
		);

		$this->assert_same( array( 'open', 'today', 'decklist_required', 'local_event' ), $todays_badges );
		$this->assert_same( array( 'open', 'local_event' ), $local_badges );
	}
}
