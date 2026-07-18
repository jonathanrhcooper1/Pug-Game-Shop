<?php
/**
 * Reservation expiry planner tests.
 *
 * @package TCGStorePlatform
 */

namespace TCGStorePlatform\Tests\Unit;

use TCGStorePlatform\Inventory\InventoryStatus;
use TCGStorePlatform\Reservations\ReservationExpiryPlanner;
use TCGStorePlatform\Reservations\ReservationStatus;
use TCGStorePlatform\Tests\TestCase;

final class ReservationExpiryPlannerTest extends TestCase {
	public function test_planner_prepares_expired_active_release_payload(): void {
		$plan    = ( new ReservationExpiryPlanner() )->plan(
			array(
				$this->reservation_row(
					55,
					42,
					ReservationStatus::ACTIVE,
					'2026-06-06 11:59:59'
				),
			),
			'2026-06-06 12:00:00'
		);
		$release = $plan->expired_releases()[0];

		$this->assert_true( $plan->has_work() );
		$this->assert_same( 1, $plan->release_count() );
		$this->assert_same( 55, $release['reservation_id'] );
		$this->assert_same( 42, $release['inventory_id'] );
		$this->assert_same( 'expired', $release['release_reason'] );
		$this->assert_same( ReservationStatus::EXPIRED, $release['target_reservation_status'] );
		$this->assert_same( InventoryStatus::AVAILABLE, $release['target_inventory_status'] );
		$this->assert_contains( 'reservation-expiry-55-', $release['idempotency_key'] );
		$this->assert_same( array(), $plan->errors() );
	}

	public function test_planner_treats_equal_expiry_as_expired(): void {
		$plan = ( new ReservationExpiryPlanner() )->plan(
			array(
				$this->reservation_row(
					56,
					43,
					ReservationStatus::ACTIVE,
					'2026-06-06 12:00:00'
				),
			),
			'2026-06-06 12:00:00'
		);

		$this->assert_same( 1, $plan->release_count() );
		$this->assert_same( 56, $plan->expired_releases()[0]['reservation_id'] );
	}

	public function test_planner_skips_future_and_inactive_rows(): void {
		$plan = ( new ReservationExpiryPlanner() )->plan(
			array(
				$this->reservation_row(
					55,
					42,
					ReservationStatus::ACTIVE,
					'2026-06-06 12:15:00'
				),
				$this->reservation_row(
					56,
					43,
					ReservationStatus::RELEASED,
					'2026-06-06 11:00:00'
				),
			),
			'2026-06-06 12:00:00'
		);

		$this->assert_false( $plan->has_work() );
		$this->assert_same( 0, $plan->release_count() );
		$this->assert_same( 'not_expired', $plan->skipped_rows()[0]['reason'] );
		$this->assert_same( 'not_active', $plan->skipped_rows()[1]['reason'] );
	}

	public function test_planner_reports_invalid_rows_without_releases(): void {
		$plan = ( new ReservationExpiryPlanner() )->plan(
			array(
				array(
					'reservation_id' => 0,
					'inventory_id'   => 42,
					'status'         => ReservationStatus::ACTIVE,
					'expires_at'     => '2026-06-06 11:00:00',
				),
				$this->reservation_row(
					56,
					43,
					ReservationStatus::ACTIVE,
					'not-a-date'
				),
			),
			'2026-06-06 12:00:00'
		);

		$this->assert_same( 0, $plan->release_count() );
		$this->assert_same( 'invalid_reservation_identity', $plan->errors()[0]['errors'][0] );
		$this->assert_same( 'invalid_expiry', $plan->errors()[1]['errors'][0] );
	}

	/**
	 * @return array<string, mixed>
	 */
	private function reservation_row(
		int $reservation_id,
		int $inventory_id,
		string $status,
		string $expires_at
	): array {
		return array(
			'reservation_id'      => $reservation_id,
			'inventory_id'        => $inventory_id,
			'active_inventory_id' => ReservationStatus::ACTIVE === $status ? $inventory_id : null,
			'status'              => $status,
			'source'              => 'online',
			'cart_id'             => 'cart-abc',
			'expires_at'          => $expires_at,
		);
	}
}
