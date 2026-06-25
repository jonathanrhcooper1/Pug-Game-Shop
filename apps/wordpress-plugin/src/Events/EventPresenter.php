<?php
/**
 * Public event response presentation.
 *
 * @package TCGStorePlatform
 */

namespace TCGStorePlatform\Events;

use DateTimeImmutable;
use DateTimeZone;

final class EventPresenter {
	/**
	 * @param array<string, mixed> $row Event database row.
	 * @return array<string, mixed>
	 */
	public static function present( array $row, ?DateTimeImmutable $now = null ): array {
		$timezone   = self::timezone( $row['timezone'] ?? 'America/New_York' );
		$start      = self::datetime( $row['start_datetime'] ?? null, $timezone );
		$deadline   = self::datetime( $row['registration_deadline'] ?? null, $timezone );
		$player_cap = self::nullable_int( $row['player_cap'] ?? null );
		$count      = max( 0, (int) ( $row['registered_count'] ?? 0 ) );
		$waitlist   = ! empty( $row['waitlist_enabled'] );
		$status     = EventStatus::registration_status( $player_cap, $count, $waitlist, $deadline, $now );
		$entry_fee  = (float) ( $row['entry_fee'] ?? 0 );

		return array(
			'id'                    => (int) ( $row['event_id'] ?? 0 ),
			'public_id'             => (string) ( $row['public_id'] ?? '' ),
			'title'                 => (string) ( $row['title'] ?? '' ),
			'slug'                  => (string) ( $row['slug'] ?? '' ),
			'event_type'            => (string) ( $row['event_type'] ?? '' ),
			'game'                  => (string) ( $row['game'] ?? '' ),
			'format'                => (string) ( $row['format'] ?? '' ),
			'rules_level'           => (string) ( $row['rules_level'] ?? '' ),
			'start_datetime'        => $start ? $start->format( DATE_ATOM ) : null,
			'end_datetime'          => self::format_datetime( $row['end_datetime'] ?? null, $timezone ),
			'timezone'              => $timezone->getName(),
			'entry_fee'             => number_format( $entry_fee, 2, '.', '' ),
			'currency'              => (string) ( $row['currency'] ?? 'USD' ),
			'is_free'               => $entry_fee <= 0.0,
			'allow_pay_at_store'    => ! empty( $row['allow_pay_at_store'] ),
			'player_cap'            => $player_cap,
			'registered_count'      => $count,
			'seats_remaining'       => EventStatus::seats_remaining( $player_cap, $count ),
			'registration_status'   => $status,
			'registration_mode'     => (string) ( $row['registration_mode'] ?? EventRegistrationMode::LOCAL_ONLY ),
			'woocommerce_product_id' => (int) ( $row['woocommerce_product_id'] ?? 0 ),
			'registration_deadline' => $deadline ? $deadline->format( DATE_ATOM ) : null,
			'refund_deadline'       => self::format_datetime( $row['refund_deadline'] ?? null, $timezone ),
			'decklist_required'     => ! empty( $row['decklist_required'] ),
			'decklist_deadline'     => self::format_datetime( $row['decklist_deadline'] ?? null, $timezone ),
			'prize_support'         => (string) ( $row['prize_support'] ?? '' ),
			'description'           => (string) ( $row['description'] ?? '' ),
			'what_to_bring'         => (string) ( $row['what_to_bring'] ?? '' ),
			'featured'              => ! empty( $row['featured_event'] ),
			'header_image'          => (string) ( $row['header_image'] ?? '' ),
			'register_url'          => '',
			'badges'                => $start ? EventStatus::badges(
				$status,
				$start,
				! empty( $row['decklist_required'] ),
				$now
			) : array( $status ),
		);
	}
	private static function format_datetime( mixed $value, DateTimeZone $timezone ): ?string {
		$datetime = self::datetime( $value, $timezone );

		return $datetime ? $datetime->format( DATE_ATOM ) : null;
	}

	private static function datetime( mixed $value, DateTimeZone $timezone ): ?DateTimeImmutable {
		if ( ! is_string( $value ) || '' === trim( $value ) ) {
			return null;
		}

		return new DateTimeImmutable( $value, $timezone );
	}

	private static function timezone( mixed $value ): DateTimeZone {
		try {
			return new DateTimeZone( is_string( $value ) && '' !== $value ? $value : 'America/New_York' );
		} catch ( \Exception ) {
			return new DateTimeZone( 'America/New_York' );
		}
	}

	private static function nullable_int( mixed $value ): ?int {
		if ( null === $value || '' === $value ) {
			return null;
		}

		return max( 0, (int) $value );
	}
}
