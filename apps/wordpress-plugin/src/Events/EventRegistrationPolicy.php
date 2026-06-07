<?php
/**
 * Event registration acceptance policy.
 *
 * @package TCGStorePlatform
 */

namespace TCGStorePlatform\Events;

use DateTimeImmutable;

final class EventRegistrationPolicy {
	/**
	 * @param array<string, mixed> $event Event row.
	 */
	public function decide( array $event, int $capacity_count, ?DateTimeImmutable $now = null ): EventRegistrationDecision {
		$mode = (string) ( $event['registration_mode'] ?? EventRegistrationMode::LOCAL_ONLY );

		if ( EventRegistrationMode::TOPDECK_HOSTED === $mode ) {
			return EventRegistrationDecision::rejected(
				'topdeck_hosted_registration',
				'This event is hosted by TopDeck. Use the hosted registration link.'
			);
		}

		$deadline = $this->datetime( $event['registration_deadline'] ?? null );
		$status   = EventStatus::registration_status(
			$this->nullable_int( $event['player_cap'] ?? null ),
			$capacity_count,
			! empty( $event['waitlist_enabled'] ),
			$deadline,
			$now
		);

		if ( EventStatus::REGISTRATION_CLOSED === $status ) {
			return EventRegistrationDecision::rejected( 'registration_closed', 'Registration is closed.' );
		}

		if ( EventStatus::SOLD_OUT === $status ) {
			return EventRegistrationDecision::rejected( 'sold_out', 'This event is sold out.' );
		}

		if ( EventStatus::WAITLIST === $status ) {
			return EventRegistrationDecision::accepted(
				EventRegistrationStatus::WAITLIST,
				EventPaymentStatus::NOT_REQUIRED,
				'The event is full. Registration was added to the waitlist.',
				true
			);
		}

		$entry_fee          = (float) ( $event['entry_fee'] ?? 0 );
		$allow_pay_at_store = ! empty( $event['allow_pay_at_store'] );

		if ( $entry_fee > 0 && ! $allow_pay_at_store ) {
			return EventRegistrationDecision::rejected(
				'online_payment_required',
				'Online payment is required for this event and is not enabled yet.'
			);
		}

		return EventRegistrationDecision::accepted(
			EventRegistrationStatus::RESERVED,
			$entry_fee > 0 ? EventPaymentStatus::PAY_AT_STORE : EventPaymentStatus::NOT_REQUIRED,
			'Local reservation accepted.'
		);
	}

	private function datetime( mixed $value ): ?DateTimeImmutable {
		if ( ! is_string( $value ) || '' === trim( $value ) ) {
			return null;
		}

		return new DateTimeImmutable( $value );
	}

	private function nullable_int( mixed $value ): ?int {
		if ( null === $value || '' === $value ) {
			return null;
		}

		return max( 0, (int) $value );
	}
}
