<?php
/**
 * Persists refunded serialized inventory in a non-sellable review state.
 *
 * @package TCGStorePlatform
 */

namespace TCGStorePlatform\WooCommerce;

use TCGStorePlatform\Inventory\InventoryStatus;
use TCGStorePlatform\Reservations\ReservationStatus;
use Throwable;

final class SerializedReturnReviewRepository {
	public function __construct( private \wpdb $database ) {
	}

	/**
	 * @param array<string, mixed> $transition Validated lifecycle transition.
	 * @return array{status:string,code:string,changed:bool,idempotent:bool,inventory_id:int,errors:list<string>}
	 */
	public function move_to_return_review( array $transition, int $refund_id ): array {
		$validated = $this->validated_transition( $transition, $refund_id );
		if ( null === $validated ) {
			return $this->failure( 'return_review_transition_invalid', 0 );
		}

		$inventory_id    = $validated['inventory_id'];
		$reservation_id  = $validated['reservation_id'];
		$idempotency_key = $validated['idempotency_key'] . '-refund-' . $refund_id;

		if ( false === $this->database->query( 'START TRANSACTION' ) ) {
			return $this->failure( 'return_review_transaction_begin_failed', $inventory_id );
		}

		try {
			$existing  = $this->movement_by_key( $idempotency_key );
			$inventory = $this->inventory_for_update( $inventory_id );

			if ( null !== $existing ) {
				if ( null !== $inventory && InventoryStatus::RETURN_REVIEW === (string) ( $inventory['status'] ?? '' ) ) {
					$this->database->query( 'COMMIT' );

					return array(
						'status'       => 'return_review',
						'code'         => 'serialized_return_already_recorded',
						'changed'      => false,
						'idempotent'   => true,
						'inventory_id' => $inventory_id,
						'errors'       => array(),
					);
				}

				$this->database->query( 'ROLLBACK' );

				return $this->failure( 'return_review_idempotency_state_mismatch', $inventory_id );
			}

			if ( null === $inventory ) {
				$this->database->query( 'ROLLBACK' );

				return $this->failure( 'return_review_inventory_not_found', $inventory_id );
			}

			if ( InventoryStatus::SOLD !== (string) ( $inventory['status'] ?? '' ) ) {
				$this->database->query( 'ROLLBACK' );

				return $this->failure( 'return_review_inventory_not_sold', $inventory_id );
			}

			$reservation = $this->reservation_for_update( $reservation_id );
			if (
				null === $reservation
				|| (int) ( $reservation['inventory_id'] ?? 0 ) !== $inventory_id
				|| ReservationStatus::CONVERTED !== (string) ( $reservation['status'] ?? '' )
			) {
				$this->database->query( 'ROLLBACK' );

				return $this->failure( 'return_review_reservation_mismatch', $inventory_id );
			}

			$order_id        = (int) $validated['order_id'];
			$linked_order_id = (int) ( $reservation['order_id'] ?? 0 );
			if ( $linked_order_id > 0 && $linked_order_id !== $order_id ) {
				$this->database->query( 'ROLLBACK' );

				return $this->failure( 'return_review_order_mismatch', $inventory_id );
			}

			$now = $this->now();
			if ( ! $this->update_inventory( $inventory, $now ) ) {
				$this->database->query( 'ROLLBACK' );

				return $this->failure( 'return_review_inventory_update_failed', $inventory_id );
			}

			if ( ! $this->insert_movement( $inventory, $idempotency_key, $now ) ) {
				$this->database->query( 'ROLLBACK' );

				return $this->failure( 'return_review_movement_insert_failed', $inventory_id );
			}

			if ( ! $this->insert_audit( $validated, $refund_id, $inventory, $now ) ) {
				$this->database->query( 'ROLLBACK' );

				return $this->failure( 'return_review_audit_insert_failed', $inventory_id );
			}

			if ( false === $this->database->query( 'COMMIT' ) ) {
				$this->database->query( 'ROLLBACK' );

				return $this->failure( 'return_review_commit_failed', $inventory_id );
			}

			return array(
				'status'       => 'return_review',
				'code'         => 'serialized_inventory_moved_to_return_review',
				'changed'      => true,
				'idempotent'   => false,
				'inventory_id' => $inventory_id,
				'errors'       => array(),
			);
		} catch ( Throwable ) {
			$this->database->query( 'ROLLBACK' );

			return $this->failure( 'return_review_transaction_failed', $inventory_id );
		}
	}

	/**
	 * @param array<string, mixed> $transition Candidate lifecycle transition.
	 * @return array<string, int|string>|null
	 */
	private function validated_transition( array $transition, int $refund_id ): ?array {
		$inventory_id    = (int) ( $transition['inventory_id'] ?? 0 );
		$reservation_id  = (int) ( $transition['reservation_id'] ?? 0 );
		$order_id        = (int) ( $transition['order_id'] ?? 0 );
		$order_item_id   = (int) ( $transition['order_item_id'] ?? 0 );
		$idempotency_key = trim( (string) ( $transition['idempotency_key'] ?? '' ) );

		if (
			$refund_id <= 0
			|| $inventory_id <= 0
			|| $reservation_id <= 0
			|| $order_id <= 0
			|| $order_item_id <= 0
			|| '' === $idempotency_key
			|| 'mark_return_review' !== (string) ( $transition['operation'] ?? '' )
			|| InventoryStatus::RETURN_REVIEW !== (string) ( $transition['target_inventory_status'] ?? '' )
		) {
			return null;
		}

		return array(
			'inventory_id'    => $inventory_id,
			'reservation_id'  => $reservation_id,
			'order_id'        => $order_id,
			'order_item_id'   => $order_item_id,
			'idempotency_key' => substr( $idempotency_key, 0, 160 ),
		);
	}

	/** @return array<string, mixed>|null */
	private function inventory_for_update( int $inventory_id ): ?array {
		$sql = $this->database->prepare(
			'SELECT * FROM `' . $this->table( 'tcg_inventory_items' ) . '` WHERE `inventory_id` = %d LIMIT 1 FOR UPDATE',
			array( $inventory_id )
		);

		return $this->row( $sql );
	}

	/** @return array<string, mixed>|null */
	private function reservation_for_update( int $reservation_id ): ?array {
		$sql = $this->database->prepare(
			'SELECT * FROM `' . $this->table( 'tcg_reservations' ) . '` WHERE `reservation_id` = %d LIMIT 1 FOR UPDATE',
			array( $reservation_id )
		);

		return $this->row( $sql );
	}

	/** @return array<string, mixed>|null */
	private function movement_by_key( string $idempotency_key ): ?array {
		$sql = $this->database->prepare(
			'SELECT * FROM `' . $this->table( 'tcg_inventory_movements' ) . '` WHERE `idempotency_key` = %s LIMIT 1 FOR UPDATE',
			array( $idempotency_key )
		);

		return $this->row( $sql );
	}

	/** @param array<string, mixed> $inventory */
	private function update_inventory( array $inventory, string $now ): bool {
		$sql     = $this->database->prepare(
			'UPDATE `' . $this->table( 'tcg_inventory_items' ) . '` SET `status` = %s, `external_sync_state` = %s, `updated_by` = %d, `updated_at` = %s, `row_version` = `row_version` + 1 WHERE `inventory_id` = %d AND `status` = %s AND `row_version` = %d LIMIT 1',
			array(
				InventoryStatus::RETURN_REVIEW,
				'pending',
				$this->actor_user_id(),
				$now,
				(int) $inventory['inventory_id'],
				InventoryStatus::SOLD,
				(int) ( $inventory['row_version'] ?? 0 ),
			)
		);
		$updated = is_string( $sql ) ? $this->database->query( $sql ) : false;

		return 1 === $updated;
	}

	/** @param array<string, mixed> $inventory */
	private function insert_movement( array $inventory, string $idempotency_key, string $now ): bool {
		$location_id   = (int) ( $inventory['location_id'] ?? 0 );
		$actor_user_id = $this->actor_user_id();
		$inserted      = $this->database->insert(
			$this->table( 'tcg_inventory_movements' ),
			array(
				'public_id'        => $this->uuid(),
				'inventory_id'     => (int) $inventory['inventory_id'],
				'from_location_id' => $location_id > 0 ? $location_id : null,
				'to_location_id'   => $location_id > 0 ? $location_id : null,
				'movement_reason'  => 'woocommerce_refund_return_review',
				'actor_user_id'    => $actor_user_id > 0 ? $actor_user_id : null,
				'device_id'        => null,
				'idempotency_key'  => $idempotency_key,
				'created_at'       => $now,
			)
		);

		return false !== $inserted;
	}

	/**
	 * @param array<string, int|string> $transition Validated transition.
	 * @param array<string, mixed>      $inventory Inventory row before transition.
	 */
	private function insert_audit( array $transition, int $refund_id, array $inventory, string $now ): bool {
		$actor_user_id = $this->actor_user_id();
		$location_id   = (int) ( $inventory['location_id'] ?? 0 );
		$context       = array(
			'order_id'                 => (int) $transition['order_id'],
			'order_item_id'            => (int) $transition['order_item_id'],
			'refund_id'                => $refund_id,
			'reservation_id'           => (int) $transition['reservation_id'],
			'before'                   => array( 'status' => InventoryStatus::SOLD ),
			'after'                    => array( 'status' => InventoryStatus::RETURN_REVIEW ),
			'quantity_changed'         => false,
			'payment_action_performed' => false,
		);
		$json          = function_exists( 'wp_json_encode' ) ? wp_json_encode( $context ) : json_encode( $context );

		$inserted = $this->database->insert(
			$this->table( 'tcg_audit_log' ),
			array(
				'public_id'       => $this->uuid(),
				'request_id'      => $this->uuid(),
				'action_name'     => 'woocommerce_refund_return_review',
				'entity_type'     => 'inventory_item',
				'entity_id'       => (string) ( $inventory['public_id'] ?? $inventory['inventory_id'] ),
				'actor_user_id'   => $actor_user_id > 0 ? $actor_user_id : null,
				'manager_user_id' => null,
				'device_id'       => null,
				'location_id'     => $location_id > 0 ? $location_id : null,
				'result_status'   => 'success',
				'before_hash'     => hash( 'sha256', InventoryStatus::SOLD ),
				'after_hash'      => hash( 'sha256', InventoryStatus::RETURN_REVIEW ),
				'context_json'    => false === $json ? null : $json,
				'created_at'      => $now,
			)
		);

		return false !== $inserted;
	}

	/** @return array<string, mixed>|null */
	private function row( mixed $sql ): ?array {
		if ( ! is_string( $sql ) || '' === $sql ) {
			return null;
		}

		$row = $this->database->get_row( $sql, $this->array_output_type() );

		return is_array( $row ) ? $row : null;
	}

	private function table( string $suffix ): string {
		$prefix = (string) ( $this->database->prefix ?? '' );

		return ( 1 === preg_match( '/^[A-Za-z0-9_]+$/', $prefix ) ? $prefix : '' ) . $suffix;
	}

	private function actor_user_id(): int {
		return function_exists( 'get_current_user_id' ) ? max( 0, (int) get_current_user_id() ) : 0;
	}

	private function now(): string {
		return gmdate( 'Y-m-d H:i:s.u' );
	}

	private function uuid(): string {
		if ( function_exists( 'wp_generate_uuid4' ) ) {
			return wp_generate_uuid4();
		}

		return sprintf(
			'%s-%s-%s-%s-%s',
			bin2hex( random_bytes( 4 ) ),
			bin2hex( random_bytes( 2 ) ),
			bin2hex( random_bytes( 2 ) ),
			bin2hex( random_bytes( 2 ) ),
			bin2hex( random_bytes( 6 ) )
		);
	}

	private function array_output_type(): string {
		return defined( 'ARRAY_A' ) ? (string) constant( 'ARRAY_A' ) : 'ARRAY_A';
	}

	/** @return array{status:string,code:string,changed:bool,idempotent:bool,inventory_id:int,errors:list<string>} */
	private function failure( string $code, int $inventory_id ): array {
		return array(
			'status'       => 'failed',
			'code'         => $code,
			'changed'      => false,
			'idempotent'   => false,
			'inventory_id' => $inventory_id,
			'errors'       => array( $code ),
		);
	}
}
