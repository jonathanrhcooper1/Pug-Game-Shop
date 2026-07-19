<?php
/**
 * Event registration confirmation email builder/sender.
 *
 * @package TCGStorePlatform
 */

namespace TCGStorePlatform\Events;

use DateTimeImmutable;
use DateTimeZone;

final class EventRegistrationNotificationMailer {
	/**
	 * @param array<string, mixed> $event Event database row.
	 */
	public function subject( array $event ): string {
		$title = $this->text( $event['title'] ?? 'Event' );

		return 'The Pug event registration: ' . ( '' === $title ? 'Event' : $title );
	}

	/**
	 * @param array<string, mixed> $event Event database row.
	 * @param array<string, mixed> $registration Registration database row.
	 * @return list<string>
	 */
	public function message_lines(
		array $event,
		array $registration,
		EventRegistrationDecision $decision
	): array {
		$first_name = $this->text( $registration['first_name'] ?? '' );
		$last_name  = $this->text( $registration['last_name'] ?? '' );
		$name       = trim( $first_name . ' ' . $last_name );
		$title      = $this->text( $event['title'] ?? 'Event' );
		$game       = $this->text( $event['game'] ?? '' );
		$format     = $this->text( $event['format'] ?? '' );
		$fee        = (float) ( $event['entry_fee'] ?? 0 );
		$currency   = $this->text( $event['currency'] ?? 'USD' );

		$lines = array(
			'Hi ' . ( '' === $first_name ? 'there' : $first_name ) . ',',
			'',
			'Your event registration has been received by The Pug.',
			'',
			'Event: ' . ( '' === $title ? 'Event' : $title ),
			'Status: ' . $this->status_label( $decision ),
			'When: ' . $this->event_time( $event ),
		);

		if ( '' !== $game ) {
			$lines[] = 'Game: ' . $game;
		}

		if ( '' !== $format ) {
			$lines[] = 'Format: ' . $format;
		}

		$lines[] = 'Entry: ' . $this->entry_label( $fee, $currency, $decision );

		if ( '' !== $name ) {
			$lines[] = 'Player: ' . $name;
		}

		$phone = $this->text( $registration['phone'] ?? '' );
		if ( '' !== $phone ) {
			$lines[] = 'Phone: ' . $phone;
		}

		$lines[] = '';
		$lines[] = 'Store address:';

		foreach ( $this->store_address_lines() as $address_line ) {
			$lines[] = $address_line;
		}

		$lines[] = '';
		$lines[] = 'If your registration is pay-at-store, please check in with the counter team when you arrive.';

		return $lines;
	}

	/**
	 * @param array<string, mixed> $event Event database row.
	 * @param array<string, mixed> $registration Registration database row.
	 */
	public function send_registration_confirmation(
		array $event,
		array $registration,
		EventRegistrationDecision $decision
	): bool {
		if ( ! function_exists( 'wp_mail' ) ) {
			return false;
		}

		$email = $this->email( $registration['email'] ?? '' );
		if ( '' === $email ) {
			return false;
		}

		$headers = array( 'Content-Type: text/plain; charset=UTF-8' );

		return (bool) wp_mail(
			$email,
			$this->subject( $event ),
			implode( "\n", $this->message_lines( $event, $registration, $decision ) ),
			$headers
		);
	}

	/**
	 * @return list<string>
	 */
	public function store_address_lines(): array {
		$lines = array(
			'The Pug Cards, Games & More',
			'513 Wears Valley Rd Suite #9.75',
			'Pigeon Forge, TN 37862',
			'(865) 774-0712',
		);

		if ( function_exists( 'apply_filters' ) ) {
			$filtered = apply_filters( 'tcg_store_platform_event_store_address_lines', $lines );

			if ( is_array( $filtered ) ) {
				$clean = array_values(
					array_filter(
						array_map(
							fn ( mixed $line ): string => $this->text( $line ),
							$filtered
						),
						fn ( string $line ): bool => '' !== $line
					)
				);

				if ( array() !== $clean ) {
					return $clean;
				}
			}
		}

		return $lines;
	}

	/**
	 * @param array<string, mixed> $event Event database row.
	 */
	private function event_time( array $event ): string {
		$timezone = $this->timezone( $event['timezone'] ?? 'America/New_York' );
		$start    = $this->datetime( $event['start_datetime'] ?? null, $timezone );

		if ( null === $start ) {
			return 'To be announced';
		}

		if ( function_exists( 'wp_date' ) ) {
			return wp_date( 'F j, Y g:i A T', $start->getTimestamp(), $timezone );
		}

		return $start->setTimezone( $timezone )->format( 'F j, Y g:i A T' );
	}

	private function entry_label( float $fee, string $currency, EventRegistrationDecision $decision ): string {
		if ( $fee <= 0.0 || EventPaymentStatus::NOT_REQUIRED === $decision->payment_status() ) {
			return 'Free. No payment needed.';
		}

		$amount = '$' . number_format( $fee, 2 );
		if ( '' !== $currency && 'USD' !== strtoupper( $currency ) ) {
			$amount .= ' ' . strtoupper( $currency );
		}

		if ( EventPaymentStatus::PAY_AT_STORE === $decision->payment_status() ) {
			return $amount . '. Pay at the store.';
		}

		if ( EventPaymentStatus::PAID === $decision->payment_status() ) {
			return $amount . '. Paid.';
		}

		return $amount . '. Payment pending.';
	}

	private function status_label( EventRegistrationDecision $decision ): string {
		if ( $decision->is_waitlist() ) {
			return 'Waitlist';
		}

		return match ( $decision->status() ) {
			EventRegistrationStatus::RESERVED => 'Registered',
			EventRegistrationStatus::WAITLIST => 'Waitlist',
			EventRegistrationStatus::CHECKED_IN => 'Checked in',
			default => ucfirst( str_replace( '_', ' ', $decision->status() ) ),
		};
	}

	private function datetime( mixed $value, DateTimeZone $timezone ): ?DateTimeImmutable {
		if ( ! is_string( $value ) || '' === trim( $value ) ) {
			return null;
		}

		return new DateTimeImmutable( $value, $timezone );
	}

	private function timezone( mixed $value ): DateTimeZone {
		try {
			return new DateTimeZone( is_string( $value ) && '' !== $value ? $value : 'America/New_York' );
		} catch ( \Exception ) {
			return new DateTimeZone( 'America/New_York' );
		}
	}

	private function email( mixed $value ): string {
		$email = strtolower( $this->text( $value ) );

		if ( function_exists( 'sanitize_email' ) ) {
			$email = sanitize_email( $email );
		}

		return false === filter_var( $email, FILTER_VALIDATE_EMAIL ) ? '' : $email;
	}

	private function text( mixed $value ): string {
		$value = trim( preg_replace( '/\s+/', ' ', (string) $value ) ?? '' );

		return substr( $value, 0, 500 );
	}
}
