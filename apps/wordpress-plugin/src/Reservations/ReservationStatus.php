<?php
/**
 * Inventory reservation status rules.
 *
 * @package TCGStorePlatform
 */

namespace TCGStorePlatform\Reservations;

final class ReservationStatus {
	public const ACTIVE    = 'active';
	public const CONVERTED = 'converted';
	public const RELEASED  = 'released';
	public const EXPIRED   = 'expired';
	public const CANCELLED = 'cancelled';

	/**
	 * @return list<string>
	 */
	public static function active_statuses(): array {
		return array(
			self::ACTIVE,
		);
	}

	public static function is_active( string $status ): bool {
		return in_array( $status, self::active_statuses(), true );
	}

	private function __construct() {
	}
}
