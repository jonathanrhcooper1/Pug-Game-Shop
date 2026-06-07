<?php
/**
 * Customer credit ledger entry types.
 *
 * @package TCGStorePlatform
 */

namespace TCGStorePlatform\Credit;

final class CustomerCreditEntryType {
	public const BUYLIST_CREDIT      = 'buylist_credit';
	public const PURCHASE_REDEMPTION = 'purchase_redemption';
	public const REFUND_CREDIT       = 'refund_credit';
	public const MANUAL_ADD          = 'manual_add';
	public const MANUAL_SUBTRACT     = 'manual_subtract';
	public const CORRECTION          = 'correction';
	public const VOID                = 'void';
	public const TRANSFER_IN         = 'transfer_in';
	public const TRANSFER_OUT        = 'transfer_out';

	/**
	 * @return list<string>
	 */
	public static function all(): array {
		return array(
			self::BUYLIST_CREDIT,
			self::PURCHASE_REDEMPTION,
			self::REFUND_CREDIT,
			self::MANUAL_ADD,
			self::MANUAL_SUBTRACT,
			self::CORRECTION,
			self::VOID,
			self::TRANSFER_IN,
			self::TRANSFER_OUT,
		);
	}

	public static function is_valid( string $entry_type ): bool {
		return in_array( $entry_type, self::all(), true );
	}

	public static function typical_sign( string $entry_type ): string {
		return match ( $entry_type ) {
			self::BUYLIST_CREDIT,
			self::REFUND_CREDIT,
			self::MANUAL_ADD,
			self::TRANSFER_IN => 'positive',
			self::PURCHASE_REDEMPTION,
			self::MANUAL_SUBTRACT,
			self::TRANSFER_OUT => 'negative',
			self::CORRECTION,
			self::VOID => 'either',
			default => 'invalid',
		};
	}

	public static function requires_manager_approval( string $entry_type ): bool {
		return in_array(
			$entry_type,
			array(
				self::MANUAL_ADD,
				self::MANUAL_SUBTRACT,
				self::CORRECTION,
				self::VOID,
				self::TRANSFER_IN,
				self::TRANSFER_OUT,
			),
			true
		);
	}

	private function __construct() {
	}
}
