<?php
/**
 * WordPress reservation storage adapter contract tests.
 *
 * @package TCGStorePlatform
 */

namespace TCGStorePlatform\Tests\Unit;

use RuntimeException;
use TCGStorePlatform\Tests\TestCase;

final class WpdbReservationStorageTest extends TestCase {
	public function test_storage_adapter_maps_reservation_service_to_wordpress_tables(): void {
		$source = $this->source();

		foreach (
			array(
				'implements ReservationStorage',
				'tcg_inventory_items',
				'tcg_reservations',
				'find_by_idempotency_key',
				'get_inventory_for_update',
				'has_active_reservation_for_inventory',
				'insert_reservation',
				'update_inventory_status',
				'update_reservation_status',
				'active_inventory_id',
				'price_snapshot',
			) as $marker
		) {
			$this->assert_contains( $marker, $source );
		}
	}

	private function source(): string {
		$path     = dirname( __DIR__, 2 ) . '/src/Reservations/WpdbReservationStorage.php';
		$contents = file_get_contents( $path );

		if ( false === $contents ) {
			throw new RuntimeException( 'Unable to read WpdbReservationStorage.php.' );
		}

		return $contents;
	}
}
