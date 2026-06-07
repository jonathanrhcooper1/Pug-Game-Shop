<?php
/**
 * Reservation schema tests.
 *
 * @package TCGStorePlatform
 */

namespace TCGStorePlatform\Tests\Unit;

use TCGStorePlatform\Migrations\ReservationSchema;
use TCGStorePlatform\Tests\TestCase;

final class ReservationSchemaTest extends TestCase {
	public function test_reservation_table_is_present(): void {
		$tables = ReservationSchema::tables( 'wp_', 'DEFAULT CHARACTER SET utf8mb4' );

		$this->assert_same( 1, count( $tables ) );
		$this->assert_true( array_key_exists( 'wp_tcg_reservations', $tables ) );
	}

	public function test_reservation_table_enforces_active_inventory_claims(): void {
		$reservations = ReservationSchema::tables(
			'wp_',
			'DEFAULT CHARACTER SET utf8mb4'
		)['wp_tcg_reservations'];

		$this->assert_contains( 'inventory_id bigint(20) unsigned NOT NULL', $reservations );
		$this->assert_contains( 'active_inventory_id bigint(20) unsigned NULL', $reservations );
		$this->assert_contains( 'status varchar(32) NOT NULL DEFAULT \'active\'', $reservations );
		$this->assert_contains( 'UNIQUE KEY active_inventory (active_inventory_id)', $reservations );
		$this->assert_contains( 'UNIQUE KEY idempotency_key (idempotency_key)', $reservations );
		$this->assert_contains( 'KEY expiry_status (status, expires_at)', $reservations );
	}

	public function test_drop_order_reverses_reservation_dependencies(): void {
		$this->assert_same(
			array(
				'wp_tcg_reservations',
			),
			ReservationSchema::drop_order( 'wp_' )
		);
	}
}
