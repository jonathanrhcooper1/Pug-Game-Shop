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

	public function __construct( EventRegistrationRepository $repository, ?EventRegistrationPolicy $policy = null ) {
		$this->repository = $repository;
		$this->policy     = $policy ?? new EventRegistrationPolicy();
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
				$this->repository->commit();

				return EventRegistrationResult::success(
					$this->present_registration( $existing ),
					'Registration was already recorded for this idempotency key.',
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
					$this->repository->commit();

					return EventRegistrationResult::success(
						$this->present_registration( $existing ),
						'Registration was already recorded for this idempotency key.',
						200,
						'already_registered'
					);
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

	private function status_for_rejection( string $code ): int {
		return match ( $code ) {
			'online_payment_required' => 402,
			'topdeck_hosted_registration',
			'registration_closed',
			'sold_out' => 409,
			default => 400,
		};
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
			'topdeck_email'  => (string) ( $registration['topdeck_email'] ?? '' ),
			'created_at'     => (string) ( $registration['created_at'] ?? '' ),
		);
	}
}
