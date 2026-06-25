<?php
/**
 * WordPress database adapter for exact inventory reservations.
 *
 * @package TCGStorePlatform
 */

namespace TCGStorePlatform\Reservations;

final class WpdbReservationStorage implements ReservationStorage {
	public function __construct( private \wpdb $database ) {
	}

	public function begin_transaction(): void {
		$this->database->query( 'START TRANSACTION' );
	}

	public function commit(): void {
		$this->database->query( 'COMMIT' );
	}

	public function rollback(): void {
		$this->database->query( 'ROLLBACK' );
	}

	public function find_by_idempotency_key( string $idempotency_key ): ?array {
		$sql = $this->database->prepare(
			'SELECT * FROM `' . $this->reservations_table() . '` WHERE `idempotency_key` = %s LIMIT 1',
			$idempotency_key
		);

		return $this->row( $sql );
	}

	public function get_inventory_for_update( int $inventory_id ): ?array {
		$sql = $this->database->prepare(
			'SELECT * FROM `' . $this->inventory_table() . '` WHERE `inventory_id` = %d LIMIT 1 FOR UPDATE',
			$inventory_id
		);

		return $this->row( $sql );
	}

	public function has_active_reservation_for_inventory( int $inventory_id ): bool {
		$sql = $this->database->prepare(
			'SELECT `reservation_id` FROM `' . $this->reservations_table() . '` WHERE `active_inventory_id` = %d AND `status` = %s LIMIT 1',
			$inventory_id,
			ReservationStatus::ACTIVE
		);

		return null !== $this->row( $sql );
	}

	public function get_reservation_for_update( int $reservation_id ): ?array {
		$sql = $this->database->prepare(
			'SELECT * FROM `' . $this->reservations_table() . '` WHERE `reservation_id` = %d LIMIT 1 FOR UPDATE',
			$reservation_id
		);

		return $this->row( $sql );
	}

	public function insert_reservation( ReservationRequest $request, array $inventory ): ?array {
		$now      = $this->now();
		$metadata = $this->json(
			array_merge(
				$request->metadata(),
				array(
					'inventory_public_id' => (string) ( $inventory['public_id'] ?? '' ),
					'card_name'           => (string) ( $inventory['card_name'] ?? '' ),
					'condition_code'      => (string) ( $inventory['condition_code'] ?? '' ),
				)
			)
		);

		$inserted = $this->database->insert(
			$this->reservations_table(),
			array(
				'public_id'           => $this->uuid(),
				'inventory_id'        => $request->inventory_id(),
				'active_inventory_id' => $request->inventory_id(),
				'source'              => $request->source(),
				'cart_id'             => $request->cart_id(),
				'order_id'            => $request->order_id(),
				'customer_id'         => $request->customer_id(),
				'owner_token_hash'    => $request->owner_token_hash(),
				'idempotency_key'     => $request->idempotency_key(),
				'status'              => ReservationStatus::ACTIVE,
				'expires_at'          => $request->expires_at(),
				'converted_at'        => null,
				'released_at'         => null,
				'release_reason'      => null,
				'price_snapshot'      => $request->price_snapshot(),
				'currency'            => $request->currency(),
				'metadata_json'       => $metadata,
				'created_at'          => $now,
				'updated_at'          => $now,
				'row_version'         => 1,
			),
			array( '%s', '%d', '%d', '%s', '%s', '%d', '%d', '%s', '%s', '%s', '%s', '%s', '%s', '%s', '%s', '%s', '%s', '%s', '%s', '%d' )
		);

		if ( false === $inserted ) {
			return null;
		}

		return $this->get_reservation_for_update( (int) $this->database->insert_id );
	}

	public function update_inventory_status( int $inventory_id, string $from_status, string $to_status ): bool {
		$sql = $this->database->prepare(
			'UPDATE `' . $this->inventory_table() . '` SET `status` = %s, `updated_at` = %s, `row_version` = `row_version` + 1 WHERE `inventory_id` = %d AND `status` = %s LIMIT 1',
			$to_status,
			$this->now(),
			$inventory_id,
			$from_status
		);
		$updated = is_string( $sql ) ? $this->database->query( $sql ) : false; // phpcs:ignore WordPress.DB.PreparedSQL.NotPrepared

		return false !== $updated && (int) $updated > 0;
	}

	public function update_reservation_status(
		int $reservation_id,
		string $from_status,
		string $to_status,
		array $updates
	): bool {
		$updates = array_merge(
			$this->reservation_updates( $updates ),
			array(
				'status'     => $to_status,
				'updated_at' => $this->now(),
			)
		);
		$sql     = $this->reservation_update_sql( $reservation_id, $from_status, $updates );
		$updated = is_string( $sql ) ? $this->database->query( $sql ) : false; // phpcs:ignore WordPress.DB.PreparedSQL.NotPrepared

		return false !== $updated && (int) $updated > 0;
	}

	private function reservation_updates( array $updates ): array {
		$allowed = array(
			'order_id',
			'converted_at',
			'released_at',
			'release_reason',
			'active_inventory_id',
		);
		$result  = array();

		foreach ( $allowed as $key ) {
			if ( array_key_exists( $key, $updates ) ) {
				$result[ $key ] = $updates[ $key ];
			}
		}

		return $result;
	}

	private function reservation_update_sql( int $reservation_id, string $from_status, array $updates ): ?string {
		$assignments = array();
		$args        = array();

		foreach ( $updates as $key => $value ) {
			if ( 1 !== preg_match( '/^[A-Za-z0-9_]+$/', (string) $key ) ) {
				continue;
			}

			if ( null === $value ) {
				$assignments[] = '`' . $key . '` = NULL';
				continue;
			}

			$assignments[] = '`' . $key . '` = ' . ( is_int( $value ) ? '%d' : '%s' );
			$args[]        = $value;
		}

		$assignments[] = '`row_version` = `row_version` + 1';
		$args[]        = $reservation_id;
		$args[]        = $from_status;
		$sql           = $this->database->prepare(
			'UPDATE `' . $this->reservations_table() . '` SET ' . implode( ', ', $assignments ) . ' WHERE `reservation_id` = %d AND `status` = %s LIMIT 1',
			$args
		);

		return is_string( $sql ) ? $sql : null;
	}

	private function row( mixed $sql ): ?array {
		if ( ! is_string( $sql ) || '' === $sql ) {
			return null;
		}

		$row = $this->database->get_row( $sql, ARRAY_A ); // phpcs:ignore WordPress.DB.PreparedSQL.NotPrepared

		return is_array( $row ) ? $row : null;
	}

	private function inventory_table(): string {
		return $this->table_name( 'tcg_inventory_items' );
	}

	private function reservations_table(): string {
		return $this->table_name( 'tcg_reservations' );
	}

	private function table_name( string $suffix ): string {
		$prefix = (string) ( $this->database->prefix ?? '' );

		if ( 1 !== preg_match( '/^[A-Za-z0-9_]+$/', $prefix ) ) {
			return $suffix;
		}

		return $prefix . $suffix;
	}

	private function json( array $value ): string {
		$json = function_exists( 'wp_json_encode' ) ? wp_json_encode( $value ) : json_encode( $value );

		return false === $json ? '{}' : (string) $json;
	}

	private function now(): string {
		return gmdate( 'Y-m-d H:i:s' );
	}

	private function uuid(): string {
		return function_exists( 'wp_generate_uuid4' ) ? wp_generate_uuid4() : sprintf(
			'%s-%s-%s-%s-%s',
			bin2hex( random_bytes( 4 ) ),
			bin2hex( random_bytes( 2 ) ),
			bin2hex( random_bytes( 2 ) ),
			bin2hex( random_bytes( 2 ) ),
			bin2hex( random_bytes( 6 ) )
		);
	}
}
