<?php
/**
 * Kiosk reservation replay tests.
 *
 * @package TCGStorePlatform
 */

namespace TCGStorePlatform\Tests\Unit;

use TCGStorePlatform\Api\V1\KioskReservationReplay;
use TCGStorePlatform\Tests\TestCase;

final class KioskReservationReplayTest extends TestCase {
	public function test_replay_identity_is_scoped_by_order_and_item(): void {
		$this->assert_same( 'order-42:item-a', KioskReservationReplay::idempotency_key( 'order-42', 'item-a' ) );
		$this->assert_false(
			KioskReservationReplay::idempotency_key( 'order-42', 'item-a' )
			=== KioskReservationReplay::idempotency_key( 'order-42', 'item-b' )
		);
		$this->assert_false(
			KioskReservationReplay::idempotency_key( 'order-42', 'item-a' )
			=== KioskReservationReplay::idempotency_key( 'order-43', 'item-a' )
		);
	}

	public function test_existing_reservation_is_returned_as_an_idempotent_replay(): void {
		$item = KioskReservationReplay::response_item(
			array(
				'reservation_id' => 77,
				'status'         => 'active',
				'expires_at'     => '2026-07-18 20:15:00',
			),
			'item-a'
		);

		$this->assert_same( 77, $item['reservation_id'] );
		$this->assert_same( 'item-a', $item['inventory_public_id'] );
		$this->assert_same( 'active', $item['status'] );
		$this->assert_true( $item['idempotent_replay'] );
	}
}
