<?php
/**
 * Daylight-saving-safe daily schedule calculation.
 *
 * @package TCGStorePlatform
 */

namespace TCGStorePlatform\Scheduler;

use DateTimeImmutable;
use DateTimeZone;

final class DailyScheduleCalculator {
	/**
	 * Calculate the next 9:00 AM Eastern run and return it in UTC.
	 */
	public static function next_run( ?DateTimeImmutable $from = null ): DateTimeImmutable {
		$eastern = new DateTimeZone( 'America/New_York' );
		$utc     = new DateTimeZone( 'UTC' );
		$from    = $from ?? new DateTimeImmutable( 'now', $utc );
		$local   = $from->setTimezone( $eastern );
		$next    = $local->setTime( 9, 0, 0 );

		if ( $next <= $local ) {
			$next = $next->modify( '+1 day' )->setTime( 9, 0, 0 );
		}

		return $next->setTimezone( $utc );
	}

	private function __construct() {
	}
}
