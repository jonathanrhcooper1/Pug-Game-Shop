<?php
/**
 * Expired reservation cleanup planner.
 *
 * @package TCGStorePlatform
 */

namespace TCGStorePlatform\Reservations;

use DateTimeImmutable;
use DateTimeZone;
use Exception;
use TCGStorePlatform\Inventory\InventoryStatus;

final class ReservationExpiryPlanner {
	/**
	 * @param list<array<string, mixed>> $reservations Candidate reservation rows.
	 */
	public function plan( array $reservations, string $now ): ReservationExpiryPlan {
		$now_datetime = $this->datetime( $now );

		if ( null === $now_datetime ) {
			return ReservationExpiryPlan::from_parts(
				array(),
				array(),
				array(
					array(
						'errors' => array( 'invalid_now' ),
					),
				)
			);
		}

		$expired_releases = array();
		$skipped_rows     = array();
		$errors           = array();

		foreach ( $reservations as $index => $reservation ) {
			$reservation_id = $this->positive_int( $reservation['reservation_id'] ?? null );
			$inventory_id   = $this->positive_int( $reservation['inventory_id'] ?? null );
			$status         = $this->clean_string( $reservation['status'] ?? '' );

			if ( null === $reservation_id || null === $inventory_id ) {
				$errors[] = array(
					'index'  => $index,
					'errors' => array( 'invalid_reservation_identity' ),
				);
				continue;
			}

			if ( ! ReservationStatus::is_active( $status ) ) {
				$skipped_rows[] = $this->skip_payload( $reservation_id, $inventory_id, 'not_active' );
				continue;
			}

			$expires_at = $this->datetime( $reservation['expires_at'] ?? '' );

			if ( null === $expires_at ) {
				$errors[] = array(
					'reservation_id' => $reservation_id,
					'errors'         => array( 'invalid_expiry' ),
				);
				continue;
			}

			if ( $expires_at > $now_datetime ) {
				$skipped_rows[] = $this->skip_payload( $reservation_id, $inventory_id, 'not_expired' );
				continue;
			}

			$expired_releases[] = $this->release_payload(
				$reservation,
				$reservation_id,
				$inventory_id,
				$expires_at
			);
		}

		return ReservationExpiryPlan::from_parts( $expired_releases, $skipped_rows, $errors );
	}

	/**
	 * @param array<string, mixed> $reservation Reservation row.
	 * @return array<string, mixed>
	 */
	private function release_payload(
		array $reservation,
		int $reservation_id,
		int $inventory_id,
		DateTimeImmutable $expires_at
	): array {
		return array(
			'reservation_id'            => $reservation_id,
			'inventory_id'              => $inventory_id,
			'cart_id'                   => $this->nullable_string( $reservation['cart_id'] ?? null ),
			'source'                    => $this->nullable_string( $reservation['source'] ?? null ),
			'expires_at'                => $expires_at->format( 'Y-m-d H:i:s' ),
			'release_reason'            => 'expired',
			'target_reservation_status' => ReservationStatus::EXPIRED,
			'target_inventory_status'   => InventoryStatus::AVAILABLE,
			'idempotency_key'           => $this->idempotency_key( $reservation_id, $expires_at ),
		);
	}

	/**
	 * @return array<string, mixed>
	 */
	private function skip_payload( int $reservation_id, int $inventory_id, string $reason ): array {
		return array(
			'reservation_id' => $reservation_id,
			'inventory_id'   => $inventory_id,
			'reason'         => $reason,
		);
	}

	private function datetime( mixed $value ): ?DateTimeImmutable {
		$value = $this->clean_string( $value );

		if ( '' === $value ) {
			return null;
		}

		try {
			return new DateTimeImmutable( $value, new DateTimeZone( 'UTC' ) );
		} catch ( Exception ) {
			return null;
		}
	}

	private function positive_int( mixed $value ): ?int {
		if ( is_int( $value ) && $value > 0 ) {
			return $value;
		}

		if ( is_string( $value ) && 1 === preg_match( '/^\d+$/', $value ) && (int) $value > 0 ) {
			return (int) $value;
		}

		return null;
	}

	private function clean_string( mixed $value ): string {
		return trim( (string) $value );
	}

	private function nullable_string( mixed $value ): ?string {
		$value = $this->clean_string( $value ?? '' );

		return '' === $value ? null : $value;
	}

	private function idempotency_key( int $reservation_id, DateTimeImmutable $expires_at ): string {
		$fingerprint = hash( 'sha256', (string) $reservation_id . '|' . $expires_at->format( 'Y-m-d H:i:s' ) );

		return 'reservation-expiry-' . $reservation_id . '-' . substr( $fingerprint, 0, 16 );
	}
}
