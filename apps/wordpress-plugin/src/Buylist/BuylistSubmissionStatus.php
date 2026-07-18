<?php
/**
 * Buylist submission status flow.
 *
 * @package TCGStorePlatform
 */

namespace TCGStorePlatform\Buylist;

final class BuylistSubmissionStatus {
	public const DRAFT                  = 'draft';
	public const SUBMITTED              = 'submitted';
	public const UNDER_REVIEW           = 'under_review';
	public const OFFER_PENDING_APPROVAL = 'offer_pending_approval';
	public const OFFERED                = 'offered';
	public const ACCEPTED               = 'accepted';
	public const REJECTED               = 'rejected';
	public const EXPIRED                = 'expired';
	public const PAYOUT_PENDING         = 'payout_pending';
	public const CONVERSION_PENDING     = 'conversion_pending';
	public const COMPLETED              = 'completed';
	public const CANCELLED              = 'cancelled';

	/**
	 * @return list<string>
	 */
	public static function all(): array {
		return array(
			self::DRAFT,
			self::SUBMITTED,
			self::UNDER_REVIEW,
			self::OFFER_PENDING_APPROVAL,
			self::OFFERED,
			self::ACCEPTED,
			self::REJECTED,
			self::EXPIRED,
			self::PAYOUT_PENDING,
			self::CONVERSION_PENDING,
			self::COMPLETED,
			self::CANCELLED,
		);
	}

	public static function can_transition( string $from, string $to ): bool {
		return in_array( $to, self::allowed_next( $from ), true );
	}

	/**
	 * @return list<string>
	 */
	public static function allowed_next( string $status ): array {
		return match ( $status ) {
			self::DRAFT => array( self::SUBMITTED ),
			self::SUBMITTED => array( self::UNDER_REVIEW, self::CANCELLED ),
			self::UNDER_REVIEW => array( self::OFFER_PENDING_APPROVAL, self::OFFERED, self::CANCELLED ),
			self::OFFER_PENDING_APPROVAL => array( self::OFFERED, self::CANCELLED ),
			self::OFFERED => array( self::ACCEPTED, self::REJECTED, self::EXPIRED ),
			self::ACCEPTED => array( self::PAYOUT_PENDING, self::CONVERSION_PENDING ),
			self::PAYOUT_PENDING,
			self::CONVERSION_PENDING => array( self::COMPLETED ),
			default => array(),
		};
	}

	public static function is_terminal( string $status ): bool {
		return in_array(
			$status,
			array(
				self::REJECTED,
				self::EXPIRED,
				self::COMPLETED,
				self::CANCELLED,
			),
			true
		);
	}

	private function __construct() {
	}
}
