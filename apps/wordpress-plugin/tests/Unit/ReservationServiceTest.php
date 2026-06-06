<?php
/**
 * Reservation service tests.
 *
 * @package TCGStorePlatform
 */

namespace TCGStorePlatform\Tests\Unit;

use TCGStorePlatform\Inventory\InventoryStatus;
use TCGStorePlatform\Reservations\ReservationRequest;
use TCGStorePlatform\Reservations\ReservationService;
use TCGStorePlatform\Reservations\ReservationStatus;
use TCGStorePlatform\Reservations\ReservationStorage;
use TCGStorePlatform\Tests\TestCase;

final class ReservationServiceTest extends TestCase {
	public function test_service_reserves_available_inventory_and_updates_status(): void {
		$storage = new FakeReservationStorage(
			array(
				'inventory_id' => 42,
				'status'       => InventoryStatus::AVAILABLE,
			)
		);
		$result  = ( new ReservationService( $storage ) )->reserve( $this->request() );

		$this->assert_true( $result->is_accepted() );
		$this->assert_same( 'reserved', $result->code() );
		$this->assert_same( 1, $result->reservation_id() );
		$this->assert_same( 1, $storage->insert_count );
		$this->assert_same( 1, $storage->update_count );
		$this->assert_same( 1, $storage->commit_count );
		$this->assert_same( InventoryStatus::RESERVED, $storage->inventory['status'] );
		$this->assert_same( 42, $storage->active_reservation['active_inventory_id'] );
	}

	public function test_service_rejects_active_reservation_collision(): void {
		$storage = new FakeReservationStorage(
			array(
				'inventory_id' => 42,
				'status'       => InventoryStatus::AVAILABLE,
			),
			array(
				'reservation_id'      => 99,
				'inventory_id'        => 42,
				'active_inventory_id' => 42,
				'status'              => ReservationStatus::ACTIVE,
				'idempotency_key'     => 'other-cart',
			)
		);
		$result  = ( new ReservationService( $storage ) )->reserve( $this->request() );

		$this->assert_false( $result->is_accepted() );
		$this->assert_same( 'active_reservation_exists', $result->code() );
		$this->assert_same( 0, $storage->insert_count );
		$this->assert_same( 0, $storage->update_count );
		$this->assert_same( 1, $storage->rollback_count );
	}

	public function test_service_replays_duplicate_idempotency_key_without_new_claim(): void {
		$storage = new FakeReservationStorage(
			array(
				'inventory_id' => 42,
				'status'       => InventoryStatus::RESERVED,
			),
			array(
				'reservation_id'      => 55,
				'inventory_id'        => 42,
				'active_inventory_id' => 42,
				'status'              => ReservationStatus::ACTIVE,
				'idempotency_key'     => 'cart-abc-42',
			)
		);
		$result  = ( new ReservationService( $storage ) )->reserve( $this->request() );

		$this->assert_true( $result->is_accepted() );
		$this->assert_true( $result->is_idempotent() );
		$this->assert_same( 'idempotent_replay', $result->code() );
		$this->assert_same( 55, $result->reservation_id() );
		$this->assert_same( 0, $storage->insert_count );
		$this->assert_same( 0, $storage->update_count );
		$this->assert_same( 1, $storage->commit_count );
	}

	public function test_service_rejects_unavailable_inventory_without_insert(): void {
		$storage = new FakeReservationStorage(
			array(
				'inventory_id' => 42,
				'status'       => InventoryStatus::SOLD,
			)
		);
		$result  = ( new ReservationService( $storage ) )->reserve( $this->request() );

		$this->assert_false( $result->is_accepted() );
		$this->assert_same( 'inventory_unavailable', $result->code() );
		$this->assert_same( 0, $storage->insert_count );
		$this->assert_same( 0, $storage->update_count );
		$this->assert_same( 1, $storage->rollback_count );
	}

	public function test_service_rejects_missing_idempotency_key_before_transaction(): void {
		$storage = new FakeReservationStorage(
			array(
				'inventory_id' => 42,
				'status'       => InventoryStatus::AVAILABLE,
			)
		);
		$result  = ( new ReservationService( $storage ) )->reserve(
			new ReservationRequest(
				42,
				'online',
				str_repeat( 'a', 64 ),
				'',
				'2026-06-06 12:00:00'
			)
		);

		$this->assert_false( $result->is_accepted() );
		$this->assert_same( 'missing_idempotency_key', $result->code() );
		$this->assert_same( 0, $storage->begin_count );
	}

	public function test_service_converts_active_reservation_to_sold(): void {
		$storage = new FakeReservationStorage(
			array(
				'inventory_id' => 42,
				'status'       => InventoryStatus::RESERVED,
			),
			$this->active_reservation()
		);
		$result  = ( new ReservationService( $storage ) )->convert_to_sale( 55 );

		$this->assert_true( $result->is_accepted() );
		$this->assert_same( 'converted', $result->code() );
		$this->assert_same( InventoryStatus::SOLD, $storage->inventory['status'] );
		$this->assert_same( ReservationStatus::CONVERTED, $storage->active_reservation['status'] );
		$this->assert_same( null, $storage->active_reservation['active_inventory_id'] );
		$this->assert_same( 1, $storage->update_count );
		$this->assert_same( 1, $storage->reservation_update_count );
	}

	public function test_service_releases_active_reservation_to_available(): void {
		$storage = new FakeReservationStorage(
			array(
				'inventory_id' => 42,
				'status'       => InventoryStatus::RESERVED,
			),
			$this->active_reservation()
		);
		$result  = ( new ReservationService( $storage ) )->release( 55, 'cart_removed' );

		$this->assert_true( $result->is_accepted() );
		$this->assert_same( 'released', $result->code() );
		$this->assert_same( InventoryStatus::AVAILABLE, $storage->inventory['status'] );
		$this->assert_same( ReservationStatus::RELEASED, $storage->active_reservation['status'] );
		$this->assert_same( null, $storage->active_reservation['active_inventory_id'] );
		$this->assert_same( 'cart_removed', $storage->active_reservation['release_reason'] );
	}

	public function test_service_replays_already_converted_reservation(): void {
		$reservation                        = $this->active_reservation();
		$reservation['status']              = ReservationStatus::CONVERTED;
		$reservation['active_inventory_id'] = null;
		$storage                            = new FakeReservationStorage(
			array(
				'inventory_id' => 42,
				'status'       => InventoryStatus::SOLD,
			),
			$reservation
		);
		$result                             = ( new ReservationService( $storage ) )->convert_to_sale( 55 );

		$this->assert_true( $result->is_accepted() );
		$this->assert_true( $result->is_idempotent() );
		$this->assert_same( 'already_converted', $result->code() );
		$this->assert_same( 0, $storage->update_count );
		$this->assert_same( 0, $storage->reservation_update_count );
		$this->assert_same( 1, $storage->commit_count );
	}

	public function test_service_rejects_transition_when_inventory_state_mismatches(): void {
		$storage = new FakeReservationStorage(
			array(
				'inventory_id' => 42,
				'status'       => InventoryStatus::SOLD,
			),
			$this->active_reservation()
		);
		$result  = ( new ReservationService( $storage ) )->release( 55 );

		$this->assert_false( $result->is_accepted() );
		$this->assert_same( 'inventory_state_mismatch', $result->code() );
		$this->assert_same( 0, $storage->update_count );
		$this->assert_same( 0, $storage->reservation_update_count );
		$this->assert_same( 1, $storage->rollback_count );
	}

	private function request(): ReservationRequest {
		return new ReservationRequest(
			42,
			'online',
			str_repeat( 'a', 64 ),
			'cart-abc-42',
			'2026-06-06 12:00:00',
			'cart-abc',
			123,
			null,
			'12.9900',
			'USD'
		);
	}

	/**
	 * @return array<string, mixed>
	 */
	private function active_reservation(): array {
		return array(
			'reservation_id'      => 55,
			'inventory_id'        => 42,
			'active_inventory_id' => 42,
			'status'              => ReservationStatus::ACTIVE,
			'idempotency_key'     => 'cart-abc-42',
		);
	}
}

final class FakeReservationStorage implements ReservationStorage {
	/**
	 * @var array<string, mixed>
	 */
	public array $inventory;

	/**
	 * @var array<string, mixed>|null
	 */
	public ?array $active_reservation;

	public int $begin_count    = 0;
	public int $commit_count   = 0;
	public int $rollback_count = 0;
	public int $insert_count   = 0;
	public int $update_count   = 0;
	public int $reservation_update_count = 0;

	/**
	 * @param array<string, mixed>      $inventory Inventory row.
	 * @param array<string, mixed>|null $active_reservation Active reservation row.
	 */
	public function __construct( array $inventory, ?array $active_reservation = null ) {
		$this->inventory          = $inventory;
		$this->active_reservation = $active_reservation;
	}

	public function begin_transaction(): void {
		++$this->begin_count;
	}

	public function commit(): void {
		++$this->commit_count;
	}

	public function rollback(): void {
		++$this->rollback_count;
	}

	/**
	 * @return array<string, mixed>|null
	 */
	public function find_by_idempotency_key( string $idempotency_key ): ?array {
		if (
			null !== $this->active_reservation
			&& $idempotency_key === (string) $this->active_reservation['idempotency_key']
		) {
			return $this->active_reservation;
		}

		return null;
	}

	/**
	 * @return array<string, mixed>|null
	 */
	public function get_inventory_for_update( int $inventory_id ): ?array {
		return $inventory_id === (int) $this->inventory['inventory_id'] ? $this->inventory : null;
	}

	public function has_active_reservation_for_inventory( int $inventory_id ): bool {
		return null !== $this->active_reservation
			&& ReservationStatus::ACTIVE === (string) $this->active_reservation['status']
			&& $inventory_id === (int) $this->active_reservation['active_inventory_id'];
	}

	/**
	 * @return array<string, mixed>|null
	 */
	public function get_reservation_for_update( int $reservation_id ): ?array {
		return null !== $this->active_reservation
			&& $reservation_id === (int) $this->active_reservation['reservation_id']
				? $this->active_reservation
				: null;
	}

	/**
	 * @param array<string, mixed> $inventory Inventory row.
	 * @return array<string, mixed>|null
	 */
	public function insert_reservation( ReservationRequest $request, array $inventory ): ?array {
		unset( $inventory );

		++$this->insert_count;

		$this->active_reservation = array(
			'reservation_id'      => 1,
			'inventory_id'        => $request->inventory_id(),
			'active_inventory_id' => $request->inventory_id(),
			'source'              => $request->source(),
			'cart_id'             => $request->cart_id(),
			'customer_id'         => $request->customer_id(),
			'owner_token_hash'    => $request->owner_token_hash(),
			'idempotency_key'     => $request->idempotency_key(),
			'status'              => ReservationStatus::ACTIVE,
			'expires_at'          => $request->expires_at(),
			'price_snapshot'      => $request->price_snapshot(),
			'currency'            => $request->currency(),
		);

		return $this->active_reservation;
	}

	public function update_inventory_status( int $inventory_id, string $from_status, string $to_status ): bool {
		++$this->update_count;

		if (
			$inventory_id !== (int) $this->inventory['inventory_id']
			|| $from_status !== (string) $this->inventory['status']
		) {
			return false;
		}

		$this->inventory['status'] = $to_status;

		return true;
	}

	/**
	 * @param array<string, mixed> $updates Reservation field updates.
	 */
	public function update_reservation_status(
		int $reservation_id,
		string $from_status,
		string $to_status,
		array $updates
	): bool {
		++$this->reservation_update_count;

		if (
			null === $this->active_reservation
			|| $reservation_id !== (int) $this->active_reservation['reservation_id']
			|| $from_status !== (string) $this->active_reservation['status']
		) {
			return false;
		}

		foreach ( $updates as $key => $value ) {
			$this->active_reservation[ $key ] = $value;
		}

		$this->active_reservation['status'] = $to_status;

		return true;
	}
}
