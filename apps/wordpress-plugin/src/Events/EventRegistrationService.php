<?php
/**
 * Event registration write orchestration.
 *
 * @package TCGStorePlatform
 */

namespace TCGStorePlatform\Events;

use DateTimeImmutable;
use Throwable;

final class EventRegistrationService {
	private EventRegistrationRepository $repository;
	private EventRegistrationPolicy $policy;
	private EventRegistrationDuplicateGuard $duplicate_guard;
	private EventRegistrationNotificationMailer $notification_mailer;

	public function __construct(
		EventRegistrationRepository $repository,
		?EventRegistrationPolicy $policy = null,
		?EventRegistrationDuplicateGuard $duplicate_guard = null,
		?EventRegistrationNotificationMailer $notification_mailer = null
	) {
		$this->repository          = $repository;
		$this->policy              = $policy ?? new EventRegistrationPolicy();
		$this->duplicate_guard     = $duplicate_guard ?? new EventRegistrationDuplicateGuard();
		$this->notification_mailer = $notification_mailer ?? new EventRegistrationNotificationMailer();
	}

	public function register_by_slug( string $slug, EventRegistrationInput $input ): EventRegistrationResult {
		$slug = $this->clean_slug( $slug );

		if ( '' === $slug ) {
			return EventRegistrationResult::failure(
				'invalid_event_slug',
				'The event slug is invalid.',
				400
			);
		}

		if ( ! $input->is_valid() ) {
			return EventRegistrationResult::failure(
				'validation_failed',
				'Registration details are incomplete or invalid.',
				400,
				$input->errors()
			);
		}

		$transaction_started = false;

		try {
			$this->repository->begin_transaction();
			$transaction_started = true;

			$event = $this->repository->get_public_event_for_update( $slug );

			if ( null === $event ) {
				$this->repository->rollback();

				return EventRegistrationResult::failure(
					'tcg_event_not_found',
					'Event not found.',
					404
				);
			}

			$existing = $this->repository->find_by_idempotency_key( $input->idempotency_key() );

			if ( null !== $existing ) {
				return $this->existing_registration_result( $existing, $event, $input );
			}

			$duplicate = $this->repository->find_active_by_event_email( (int) $event['event_id'], $input->email() );

			if ( null !== $duplicate && $this->duplicate_guard->blocks_duplicate_registration( $duplicate ) ) {
				$this->repository->commit();

				return EventRegistrationResult::success(
					$this->present_registration( $duplicate ),
					'This email is already registered for the event.',
					200,
					'already_registered'
				);
			}

			$capacity_count = $this->repository->capacity_count( (int) $event['event_id'] );
			$decision       = $this->policy->decide( $event, $capacity_count, new DateTimeImmutable( 'now' ) );

			if ( ! $decision->is_accepted() ) {
				$this->repository->write_log(
					(int) $event['event_id'],
					null,
					'registration_rejected',
					$decision->message(),
					array(
						'code'  => $decision->code(),
						'email' => $input->email(),
					)
				);
				$this->repository->commit();

				return EventRegistrationResult::failure(
					$decision->code(),
					$decision->message(),
					$this->status_for_rejection( $decision->code() )
				);
			}

			$registration = $this->repository->create_registration( $event, $input, $decision );

			if ( null === $registration ) {
				$existing = $this->repository->find_by_idempotency_key( $input->idempotency_key() );

				if ( null !== $existing ) {
					return $this->existing_registration_result( $existing, $event, $input );
				}

				$this->repository->rollback();

				return EventRegistrationResult::failure(
					'registration_create_failed',
					'Registration could not be recorded.',
					500
				);
			}

			if ( $decision->is_waitlist() ) {
				$this->repository->add_waitlist_entry(
					(int) $event['event_id'],
					(int) $registration['registration_id']
				);
			}

			if ( EventRegistrationStatus::consumes_capacity( $decision->status() ) ) {
				++$capacity_count;
			}

			$this->repository->update_event_counts( $event, $capacity_count, new DateTimeImmutable( 'now' ) );
			$this->repository->write_log(
				(int) $event['event_id'],
				(int) $registration['registration_id'],
				$decision->is_waitlist() ? 'waitlist_added' : 'registration_reserved',
				$decision->message(),
				array(
					'status'         => $decision->status(),
					'payment_status' => $decision->payment_status(),
				)
			);

			$this->repository->commit();
			$this->send_registration_confirmation( $event, $registration, $decision );

			return EventRegistrationResult::success(
				$this->present_registration( $registration ),
				$decision->message()
			);
		} catch ( Throwable ) {
			if ( $transaction_started ) {
				$this->repository->rollback();
			}

			return EventRegistrationResult::failure(
				'registration_failed',
				'Registration could not be completed.',
				500
			);
		}
	}

	private function clean_slug( string $slug ): string {
		$slug = strtolower( trim( $slug ) );
		$slug = preg_replace( '/[^a-z0-9_-]+/', '-', $slug ) ?? '';
		$slug = trim( $slug, '-' );

		return substr( $slug, 0, 191 );
	}

	/**
	 * @param array<string, mixed> $event Event row.
	 * @param array<string, mixed> $registration Registration row.
	 */
	private function send_registration_confirmation(
		array $event,
		array $registration,
		EventRegistrationDecision $decision
	): void {
		try {
			$this->notification_mailer->send_registration_confirmation( $event, $registration, $decision );
		} catch ( Throwable ) {
			// Email delivery should not roll back or hide a successful registration.
		}
	}

	private function status_for_rejection( string $code ): int {
		return match ( $code ) {
			'online_payment_required' => 402,
			'idempotency_conflict',
			'registration_closed',
			'sold_out' => 409,
			default => 400,
		};
	}

	/**
	 * @param array<string, mixed> $existing Existing registration row.
	 * @param array<string, mixed> $event Event row.
	 */
	private function existing_registration_result(
		array $existing,
		array $event,
		EventRegistrationInput $input
	): EventRegistrationResult {
		if ( ! $this->duplicate_guard->matches_request( $existing, $event, $input ) ) {
			$this->repository->write_log(
				(int) $event['event_id'],
				null,
				'registration_rejected',
				'Idempotency key was already used for another registration.',
				array(
					'code' => 'idempotency_conflict',
				)
			);
			$this->repository->commit();

			return EventRegistrationResult::failure(
				'idempotency_conflict',
				'Idempotency key was already used for another registration.',
				409
			);
		}

		$this->repository->commit();

		return EventRegistrationResult::success(
			$this->present_registration( $existing ),
			'Registration was already recorded for this idempotency key.',
			200,
			'already_registered'
		);
	}

	/**
	 * @param array<string, mixed> $registration Registration row.
	 * @return array<string, mixed>
	 */
	private function present_registration( array $registration ): array {
		return array(
			'id'             => (int) ( $registration['registration_id'] ?? 0 ),
			'public_id'      => (string) ( $registration['public_id'] ?? '' ),
			'event_id'       => (int) ( $registration['event_id'] ?? 0 ),
			'status'         => (string) ( $registration['status'] ?? '' ),
			'payment_status' => (string) ( $registration['payment_status'] ?? '' ),
			'email'          => (string) ( $registration['email'] ?? '' ),
			'created_at'     => (string) ( $registration['created_at'] ?? '' ),
		);
	}
}
