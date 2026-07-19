<?php
/**
 * Kiosk order REST route contract tests.
 *
 * @package TCGStorePlatform
 */

namespace TCGStorePlatform\Tests\Unit;

use TCGStorePlatform\Api\V1\KioskOrderController;
use TCGStorePlatform\Tests\TestCase;

final class KioskOrderRouteContractTest extends TestCase {
	public function test_kiosk_order_route_reserves_exact_inventory(): void {
		$contracts = KioskOrderController::route_contracts();

		$this->assert_same( 1, count( $contracts ) );
		$this->assert_same( 'tcg-store/v1', $contracts[0]['namespace'] );
		$this->assert_same( '/kiosk/orders', $contracts[0]['path'] );
		$this->assert_same( 'POST', $contracts[0]['method'] );
		$this->assert_same( 'create_kiosk_order', $contracts[0]['callback'] );
		$this->assert_same( 'create_inventory', $contracts[0]['permission'] );
	}

	public function test_kiosk_order_controller_does_not_expose_payment_or_checkout_capture(): void {
		$controller = new KioskOrderController();
		$source     = (string) file_get_contents( dirname( __DIR__, 2 ) . '/src/Api/V1/KioskOrderController.php' );

		$this->assert_true( method_exists( $controller, 'create_kiosk_order' ) );
		$this->assert_true( method_exists( $controller, 'can_create_kiosk_order' ) );
		$this->assert_false( method_exists( $controller, 'capture_payment' ) );
		$this->assert_false( method_exists( $controller, 'create_woocommerce_order' ) );
		$this->assert_contains( 'KIOSK_HOLD_SECONDS = 900', $source );
	}

	public function test_kiosk_order_replays_reservations_before_inventory_availability_rejection(): void {
		$source        = (string) file_get_contents( dirname( __DIR__, 2 ) . '/src/Api/V1/KioskOrderController.php' );
		$replay_offset = strpos( $source, '$this->find_reservation_replay(' );
		$status_offset = strpos( $source, 'InventoryStatus::AVAILABLE !==' );

		$this->assert_true( false !== $replay_offset );
		$this->assert_true( false !== $status_offset );
		$this->assert_true( $replay_offset < $status_offset );
		$this->assert_contains( 'KioskReservationReplay::idempotency_key( $order_id, $public_id )', $source );
	}
}
