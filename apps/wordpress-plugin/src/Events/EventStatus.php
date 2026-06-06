<?php
/**
 * Public event status helpers.
 *
 * @package TCGStorePlatform
 */

namespace TCGStorePlatform\Events;

use DateTimeImmutable;

final class EventStatus {
	public const OPEN                = 'open';
	public const ALMOST_FULL         = 'almost_full';
	public const SOLD_OUT            = 'sold_out';
	public const WAITLIST            = 'waitlist';
	public const REGISTRATION_CLOSED = 'registration_closed';

	/**
	 * @param DateTimeImmutable|null $now Current time for deterministic tests.
	 */
	public static function registration_status(
		?int $player_cap,
		int $capacity_count,
		bool $waitlist_enabled,
		?DateTimeImmutable $registration_deadline,
		?DateTimeImmutable $now = null
	): string {
		$now ??= new DateTimeImmutable( 'now' );

		if ( null !== $registration_deadline && $registration_deadline <= $now ) {
			return self::REGISTRATION_CLOSED;
		}

		if ( null !== $player_cap && $capacity_count >= $player_cap ) {
			return $waitlist_enabled ? self::WAITLIST : self::SOLD_OUT;
		}

		if ( null !== $player_cap && $player_cap > 0 ) {
			$remaining = $player_cap - $capacity_count;

			if ( $remaining <= max( 2, (int) ceil( $player_cap * 0.1 ) ) ) {
				return self::ALMOST_FULL;
			}
		}

		return self::OPEN;
	}

	public static function seats_remaining( ?int $player_cap, int $capacity_count ): ?int {
		if ( null === $player_cap ) {
			return null;
		}

		return max( 0, $player_cap - $capacity_count );
	}

	/**
	 * @return list<string>
	 */
	public static function badges(
		string $registration_status,
		DateTimeImmutable $start_datetime,
		bool $decklist_required,
		bool $topdeck_enabled,
		string $topdeck_sync_status,
		?DateTimeImmutable $now = null
	): array {
		$now ??= new DateTimeImmutable( 'now', $start_datetime->getTimezone() );
		$badges = array( $registration_status );

		if ( $start_datetime->format( 'Y-m-d' ) === $now->format( 'Y-m-d' ) ) {
			$badges[] = 'today';
		}

		if ( $decklist_required ) {
			$badges[] = 'decklist_required';
		}

		if ( $topdeck_enabled && 'synced' === $topdeck_sync_status ) {
			$badges[] = 'topdeck_synced';
		}

		if ( ! $topdeck_enabled ) {
			$badges[] = 'local_event';
		}

		return array_values( array_unique( $badges ) );
	}

	private function __construct() {
	}
}
