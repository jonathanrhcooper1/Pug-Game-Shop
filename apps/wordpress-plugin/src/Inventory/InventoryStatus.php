<?php
/**
 * Inventory item status rules.
 *
 * @package TCGStorePlatform
 */

namespace TCGStorePlatform\Inventory;

final class InventoryStatus {
	public const PENDING_INTAKE = 'pending_intake';
	public const AVAILABLE      = 'available';
	public const RESERVED       = 'reserved';
	public const SOLD           = 'sold';
	public const RETURN_REVIEW  = 'return_review';
	public const DAMAGED        = 'damaged';
	public const REMOVED        = 'removed';

	/**
	 * @return list<string>
	 */
	public static function all(): array {
		return array(
			self::PENDING_INTAKE,
			self::AVAILABLE,
			self::RESERVED,
			self::SOLD,
			self::RETURN_REVIEW,
			self::DAMAGED,
			self::REMOVED,
		);
	}

	public static function is_valid( string $status ): bool {
		return in_array( $status, self::all(), true );
	}

	public static function requires_location( string $status ): bool {
		return in_array( $status, array( self::AVAILABLE, self::RESERVED ), true );
	}

	public static function can_auto_price( string $status ): bool {
		return in_array( $status, array( self::PENDING_INTAKE, self::AVAILABLE ), true );
	}

	public static function can_transition( string $from, string $to ): bool {
		if ( $from === $to ) {
			return true;
		}

		$transitions = self::transitions();

		if ( ! isset( $transitions[ $from ] ) ) {
			return false;
		}

		return in_array( $to, $transitions[ $from ], true );
	}

	/**
	 * @return array<string, list<string>>
	 */
	private static function transitions(): array {
		return array(
			self::PENDING_INTAKE => array( self::AVAILABLE, self::DAMAGED, self::REMOVED ),
			self::AVAILABLE      => array( self::RESERVED, self::SOLD, self::DAMAGED, self::REMOVED ),
			self::RESERVED       => array( self::AVAILABLE, self::SOLD ),
			self::SOLD           => array( self::RETURN_REVIEW ),
			self::RETURN_REVIEW  => array( self::AVAILABLE, self::DAMAGED, self::REMOVED ),
			self::DAMAGED        => array( self::REMOVED ),
			self::REMOVED        => array(),
		);
	}

	private function __construct() {
	}
}
