<?php
/**
 * Event registration status policy.
 *
 * @package TCGStorePlatform
 */

namespace TCGStorePlatform\Events;

final class EventRegistrationStatus {
	public const RESERVED              = 'reserved';
	public const PAID                  = 'paid';
	public const ALREADY_REGISTERED    = 'already_registered';
	public const WAITLIST              = 'waitlist';
	public const CANCELLED             = 'cancelled';
	public const REFUNDED              = 'refunded';
	public const CHECKED_IN            = 'checked_in';
	public const FAILED                = 'failed';
	public const STAFF_REVIEW_REQUIRED = 'staff_review_required';
	/**
	 * @return list<string>
	 */
	public static function all(): array {
		return array(
			self::RESERVED,
			self::PAID,
			self::ALREADY_REGISTERED,
			self::WAITLIST,
			self::CANCELLED,
			self::REFUNDED,
			self::CHECKED_IN,
			self::FAILED,
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
			self::ALREADY_REGISTERED,
			self::CHECKED_IN,
		);
	}

	/**
	 * @return list<string>
	 */
	public static function duplicate_blocking_statuses(): array {
		return array(
			self::RESERVED,
			self::PAID,
			self::ALREADY_REGISTERED,
			self::WAITLIST,
			self::CHECKED_IN,
			self::STAFF_REVIEW_REQUIRED,
		);
	}

	public static function consumes_capacity( string $status ): bool {
		return in_array( $status, self::capacity_consuming_statuses(), true );
	}

	private function __construct() {
	}
}
