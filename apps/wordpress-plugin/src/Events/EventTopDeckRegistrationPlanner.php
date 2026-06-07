<?php
/**
 * Decide whether a local event registration should queue TopDeck sync.
 *
 * @package TCGStorePlatform
 */

namespace TCGStorePlatform\Events;

final class EventTopDeckRegistrationPlanner {
	public function __construct( private bool $provider_queue_enabled = false ) {
	}

	/**
	 * @param array<string, mixed> $event Event row.
	 */
	public function should_queue( array $event, EventRegistrationDecision $decision ): bool {
		if ( ! $this->provider_queue_enabled ) {
			return false;
		}

		if ( EventRegistrationMode::WEBSITE_PUSH_TOPDECK !== (string) ( $event['registration_mode'] ?? '' ) ) {
			return false;
		}

		if ( empty( $event['topdeck_enabled'] ) || '' === trim( (string) ( $event['topdeck_tid'] ?? '' ) ) ) {
			return false;
		}

		if ( $decision->is_waitlist() || EventRegistrationStatus::RESERVED !== $decision->status() ) {
			return false;
		}

		return EventPaymentStatus::NOT_REQUIRED === $decision->payment_status();
	}
}
