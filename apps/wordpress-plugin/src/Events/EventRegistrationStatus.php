<?php
/**
 * Event registration status policy.
 *
 * @package TCGStorePlatform
 */

namespace TCGStorePlatform\Events;

final class EventRegistrationStatus {
	public const RESERVED                  = 'reserved';
	public const PAID                      = 'paid';
	public const REGISTERED_TOPDECK        = 'registered_topdeck';
	public const PENDING_TOPDECK_INVITE    = 'pending_topdeck_invite';
	public const ALREADY_REGISTERED        = 'already_registered';
	public const WAITLIST                  = 'waitlist';
	public const CANCELLED                 = 'cancelled';
	public const REFUNDED                  = 'refunded';
	public const CHECKED_IN                = 'checked_in';
	public const FAILED                    = 'failed';
	public const TOPDECK_CAPACITY_CONFLICT = 'topdeck_capacity_conflict';
	public const STAFF_REVIEW_REQUIRED     = 'staff_review_required';

	/**
	 * @return list<string>
	 */
	public static function all(): array {
		return array(
			self::RESERVED,
			self::PAID,
			self::REGISTERED_TOPDECK,
			self::PENDING_TOPDECK_INVITE,
			self::ALREADY_REGISTERED,
			self::WAITLIST,
			self::CANCELLED,
			self::REFUNDED,
			self::CHECKED_IN,
			self::FAILED,
			self::TOPDECK_CAPACITY_CONFLICT,
			self::STAFF_REVIEW_REQUIRED,
		);
	}

	/**
	 * @return list<string>
	 */
	public static function capacity_consuming_statuses(): array {
		return array(
			self::RESERVED,
			self::PAID,
			self::REGISTERED_TOPDECK,
			self::PENDING_TOPDECK_INVITE,
			self::ALREADY_REGISTERED,
			self::CHECKED_IN,
		);
	}

	public static function consumes_capacity( string $status ): bool {
		return in_array( $status, self::capacity_consuming_statuses(), true );
	}

	public static function from_topdeck_result( string $result, int $http_status ): string {
		if ( 409 === $http_status || 'capacity_conflict' === $result ) {
			return self::TOPDECK_CAPACITY_CONFLICT;
		}

		return match ( $result ) {
			'registered' => self::REGISTERED_TOPDECK,
			'pending_invitation' => self::PENDING_TOPDECK_INVITE,
			'already_registered' => self::ALREADY_REGISTERED,
			'failed', 'banned' => self::FAILED,
			default => self::STAFF_REVIEW_REQUIRED,
		};
	}

	private function __construct() {
	}
}
