<?php
/**
 * Exact inventory reservation service.
 *
 * @package TCGStorePlatform
 */

namespace TCGStorePlatform\Reservations;

use TCGStorePlatform\Inventory\InventoryStatus;
use Throwable;

final class ReservationService {
	/**
	 * @var list<string>
	 */
	private array $allowed_sources = array( 'online', 'kiosk', 'pos', 'staff', 'offline' );

	public function __construct( private ReservationStorage $storage ) {
	}

	public function reserve( ReservationRequest $request ): ReservationResult {
		$invalid = $this->validate( $request );

		if ( null !== $invalid ) {
			return $invalid;
		}

		$this->storage->begin_transaction();

		try {
			$existing = $this->storage->find_by_idempotency_key( $request->idempotency_key() );

			if ( null !== $existing ) {
				$this->storage->commit();

				return ReservationResult::idempotent( $existing );
			}

			$inventory = $this->storage->get_inventory_for_update( $request->inventory_id() );

			if ( null === $inventory ) {
				$this->storage->rollback();

				return ReservationResult::rejected( 'inventory_not_found', 'Inventory item was not found.' );
			}

			$status = (string) ( $inventory['status'] ?? '' );

			if ( InventoryStatus::AVAILABLE !== $status ) {
				$this->storage->rollback();

				return ReservationResult::rejected(
					'inventory_unavailable',
					'Inventory item is not available for reservation.'
				);
			}

			if ( $this->storage->has_active_reservation_for_inventory( $request->inventory_id() ) ) {
				$this->storage->rollback();

				return ReservationResult::rejected(
					'active_reservation_exists',
					'Inventory item already has an active reservation.'
				);
			}

			$reservation = $this->storage->insert_reservation( $request, $inventory );

			if ( null === $reservation ) {
				$this->storage->rollback();

				return ReservationResult::rejected(
					'reservation_insert_failed',
					'Inventory reservation could not be inserted.'
				);
			}

			$updated = $this->storage->update_inventory_status(
				$request->inventory_id(),
				InventoryStatus::AVAILABLE,
				InventoryStatus::RESERVED
			);

			if ( ! $updated ) {
				$this->storage->rollback();

				return ReservationResult::rejected(
					'inventory_update_failed',
					'Inventory status could not be updated after reservation.'
				);
			}

			$this->storage->commit();

			return ReservationResult::reserved( $reservation );
		} catch ( Throwable $error ) {
			$this->storage->rollback();

			return ReservationResult::rejected( 'reservation_failed', $error->getMessage() );
		}
	}

	public function convert_to_sale( int $reservation_id ): ReservationResult {
		return $this->transition_active_reservation(
			$reservation_id,
			ReservationStatus::CONVERTED,
			InventoryStatus::SOLD,
			'converted',
			'Reservation was converted to a sold inventory item.',
			array(
				'converted_at' => $this->now(),
			)
		);
	}

	public function release( int $reservation_id, string $reason = 'released' ): ReservationResult {
		return $this->transition_active_reservation(
			$reservation_id,
			ReservationStatus::RELEASED,
			InventoryStatus::AVAILABLE,
			'released',
			'Reservation was released and inventory was restored to available.',
			array(
				'released_at'    => $this->now(),
				'release_reason' => trim( $reason ),
			)
		);
	}

	private function validate( ReservationRequest $request ): ?ReservationResult {
		if ( $request->inventory_id() <= 0 ) {
			return ReservationResult::rejected( 'invalid_inventory', 'Inventory ID is required.' );
		}

		if ( ! in_array( $request->source(), $this->allowed_sources, true ) ) {
			return ReservationResult::rejected( 'invalid_source', 'Reservation source is not supported.' );
		}

		if ( '' === $request->owner_token_hash() ) {
			return ReservationResult::rejected( 'missing_owner_token', 'Reservation owner token is required.' );
		}

		if ( '' === $request->idempotency_key() ) {
			return ReservationResult::rejected(
				'missing_idempotency_key',
				'Reservations require an idempotency key.'
			);
		}

		if ( '' === $request->expires_at() ) {
			return ReservationResult::rejected( 'missing_expiry', 'Reservation expiry is required.' );
		}

		if ( 3 !== strlen( $request->currency() ) ) {
			return ReservationResult::rejected( 'invalid_currency', 'Reservation currency must be three letters.' );
		}

		return null;
	}

	/**
	 * @param array<string, mixed> $updates Reservation updates.
	 */
	private function transition_active_reservation(
		int $reservation_id,
		string $target_reservation_status,
		string $target_inventory_status,
		string $code,
		string $message,
		array $updates
	): ReservationResult {
		if ( $reservation_id <= 0 ) {
			return ReservationResult::rejected( 'invalid_reservation', 'Reservation ID is required.' );
		}

		$this->storage->begin_transaction();

		try {
			$reservation = $this->storage->get_reservation_for_update( $reservation_id );

			if ( null === $reservation ) {
				$this->storage->rollback();

				return ReservationResult::rejected( 'reservation_not_found', 'Reservation was not found.' );
			}

			$current_status = (string) ( $reservation['status'] ?? '' );

			if ( $target_reservation_status === $current_status ) {
				$this->storage->commit();

				return ReservationResult::transitioned(
					'already_' . $target_reservation_status,
					'Reservation already reached the requested lifecycle state.',
					$reservation,
					true
				);
			}

			if ( ! ReservationStatus::is_active( $current_status ) ) {
				$this->storage->rollback();

				return ReservationResult::rejected(
					'reservation_not_active',
					'Only active reservations can transition through this lifecycle step.'
				);
			}

			$inventory_id = (int) ( $reservation['inventory_id'] ?? 0 );
			$inventory    = $this->storage->get_inventory_for_update( $inventory_id );

			if ( null === $inventory ) {
				$this->storage->rollback();

				return ReservationResult::rejected( 'inventory_not_found', 'Reserved inventory item was not found.' );
			}

			if ( InventoryStatus::RESERVED !== (string) ( $inventory['status'] ?? '' ) ) {
				$this->storage->rollback();

				return ReservationResult::rejected(
					'inventory_state_mismatch',
					'Reserved inventory item is not in the expected reserved state.'
				);
			}

			$inventory_updated = $this->storage->update_inventory_status(
				$inventory_id,
				InventoryStatus::RESERVED,
				$target_inventory_status
			);

			if ( ! $inventory_updated ) {
				$this->storage->rollback();

				return ReservationResult::rejected(
					'inventory_update_failed',
					'Inventory status could not be updated during reservation transition.'
				);
			}

			$updates['active_inventory_id'] = null;
			$reservation_updated            = $this->storage->update_reservation_status(
				$reservation_id,
				ReservationStatus::ACTIVE,
				$target_reservation_status,
				$updates
			);

			if ( ! $reservation_updated ) {
				$this->storage->rollback();

				return ReservationResult::rejected(
					'reservation_update_failed',
					'Reservation status could not be updated.'
				);
			}

			$this->storage->commit();

			return ReservationResult::transitioned( $code, $message, $reservation );
		} catch ( Throwable $error ) {
			$this->storage->rollback();

			return ReservationResult::rejected( 'reservation_transition_failed', $error->getMessage() );
		}
	}

	private function now(): string {
		return gmdate( 'Y-m-d H:i:s' );
	}
}
