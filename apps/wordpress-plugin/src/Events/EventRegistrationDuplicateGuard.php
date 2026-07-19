<?php
/**
 * Event registration duplicate request checks.
 *
 * @package TCGStorePlatform
 */

namespace TCGStorePlatform\Events;

final class EventRegistrationDuplicateGuard {
	/**
	 * @param array<string, mixed> $registration Existing registration row.
	 * @param array<string, mixed> $event Event row.
	 */
	public function matches_request( array $registration, array $event, EventRegistrationInput $input ): bool {
		return (int) ( $registration['event_id'] ?? 0 ) === (int) ( $event['event_id'] ?? 0 )
			&& strtolower( (string) ( $registration['email'] ?? '' ) ) === $input->email();
	}

	/**
	 * @param array<string, mixed> $registration Existing registration row.
	 */
	public function blocks_duplicate_registration( array $registration ): bool {
		return in_array(
			(string) ( $registration['status'] ?? '' ),
			EventRegistrationStatus::duplicate_blocking_statuses(),
			true
		);
	}
}
