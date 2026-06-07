<?php
/**
 * Event registration payment status constants.
 *
 * @package TCGStorePlatform
 */

namespace TCGStorePlatform\Events;

final class EventPaymentStatus {
	public const NOT_REQUIRED   = 'not_required';
	public const PAY_AT_STORE   = 'pay_at_store';
	public const PENDING_ONLINE = 'pending_online';
	public const PAID           = 'paid';
	public const REFUNDED       = 'refunded';

	private function __construct() {
	}
}
