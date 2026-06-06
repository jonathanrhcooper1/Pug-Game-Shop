<?php
/**
 * Exact inventory reservation storage contract.
 *
 * @package TCGStorePlatform
 */

namespace TCGStorePlatform\Reservations;

interface ReservationStorage {
	public function begin_transaction(): void;

	public function commit(): void;

	public function rollback(): void;

	/**
	 * @return array<string, mixed>|null
	 */
	public function find_by_idempotency_key( string $idempotency_key ): ?array;

	/**
	 * @return array<string, mixed>|null
	 */
	public function get_inventory_for_update( int $inventory_id ): ?array;

	public function has_active_reservation_for_inventory( int $inventory_id ): bool;

	/**
	 * @param array<string, mixed> $inventory Inventory row.
	 * @return array<string, mixed>|null
	 */
	public function insert_reservation( ReservationRequest $request, array $inventory ): ?array;

	public function update_inventory_status( int $inventory_id, string $from_status, string $to_status ): bool;
}
