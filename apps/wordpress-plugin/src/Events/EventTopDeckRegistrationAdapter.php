<?php
/**
 * Adapter for pushing local event registrations to TopDeck.
 *
 * @package TCGStorePlatform
 */

namespace TCGStorePlatform\Events;

use TCGStorePlatform\TopDeck\TopDeckProvider;

final class EventTopDeckRegistrationAdapter {
	public function __construct( private TopDeckProvider $provider ) {
	}

	/**
	 * @param array<string, mixed> $event        Event row.
	 * @param array<string, mixed> $registration Registration row.
	 */
	public function push(
		array $event,
		array $registration,
		bool $override_cap = false
	): EventTopDeckRegistrationSyncResult {
		$tid = trim( (string) ( $event['topdeck_tid'] ?? '' ) );

		if ( '' === $tid ) {
			return EventTopDeckRegistrationSyncResult::failure(
				EventRegistrationStatus::STAFF_REVIEW_REQUIRED,
				'topdeck_tid_required',
				'TopDeck TID is required before registration can be pushed.'
			);
		}

		$email = $this->registration_email( $registration );

		if ( '' === $email ) {
			return EventTopDeckRegistrationSyncResult::failure(
				EventRegistrationStatus::STAFF_REVIEW_REQUIRED,
				'topdeck_email_required',
				'A valid registration email is required before TopDeck push.'
			);
		}

		return EventTopDeckRegistrationSyncResult::from_topdeck_result(
			$this->provider->register_players( $tid, array( $email ), $override_cap )
		);
	}

	/**
	 * @param array<string, mixed> $registration Registration row.
	 */
	private function registration_email( array $registration ): string {
		$email = (string) ( $registration['topdeck_email'] ?? '' );

		if ( '' === trim( $email ) ) {
			$email = (string) ( $registration['email'] ?? $registration['customer_email'] ?? '' );
		}

		$email = strtolower( trim( $email ) );

		return false === filter_var( $email, FILTER_VALIDATE_EMAIL ) ? '' : $email;
	}
}
