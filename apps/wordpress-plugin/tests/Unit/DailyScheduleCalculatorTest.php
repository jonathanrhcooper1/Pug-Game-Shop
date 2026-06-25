<?php
/**
 * Daily schedule tests.
 *
 * @package TCGStorePlatform
 */

namespace TCGStorePlatform\Tests\Unit;

use DateTimeImmutable;
use DateTimeZone;
use TCGStorePlatform\Scheduler\DailyScheduleCalculator;
use TCGStorePlatform\Tests\TestCase;

final class DailyScheduleCalculatorTest extends TestCase {
	public function test_same_day_before_nine_eastern(): void {
		$from = new DateTimeImmutable( '2026-06-06 12:00:00', new DateTimeZone( 'UTC' ) );
		$next = DailyScheduleCalculator::next_run( $from );

		$this->assert_same( '2026-06-06T13:00:00+00:00', $next->format( DATE_ATOM ) );
	}

	public function test_next_day_after_nine_eastern(): void {
		$from = new DateTimeImmutable( '2026-06-06 14:00:00', new DateTimeZone( 'UTC' ) );
		$next = DailyScheduleCalculator::next_run( $from );

		$this->assert_same( '2026-06-07T13:00:00+00:00', $next->format( DATE_ATOM ) );
	}

	public function test_spring_daylight_saving_transition(): void {
		$from = new DateTimeImmutable( '2026-03-07 15:00:00', new DateTimeZone( 'UTC' ) );
		$next = DailyScheduleCalculator::next_run( $from );

		$this->assert_same( '2026-03-08T13:00:00+00:00', $next->format( DATE_ATOM ) );
	}

	public function test_fall_daylight_saving_transition(): void {
		$from = new DateTimeImmutable( '2026-10-31 14:00:00', new DateTimeZone( 'UTC' ) );
		$next = DailyScheduleCalculator::next_run( $from );

		$this->assert_same( '2026-11-01T14:00:00+00:00', $next->format( DATE_ATOM ) );
	}
}
