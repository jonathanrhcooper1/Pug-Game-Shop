<?php
/**
 * Offline push operation resolver tests.
 *
 * @package TCGStorePlatform
 */

namespace TCGStorePlatform\Tests\Unit;

use InvalidArgumentException;
use TCGStorePlatform\Offline\OfflineOperationEnvelope;
use TCGStorePlatform\Offline\OfflinePushOperationResolver;
use TCGStorePlatform\Tests\TestCase;

final class OfflinePushOperationResolverTest extends TestCase {
	public function test_inventory_reservation_accepts_available_item(): void {
		$plan = ( new OfflinePushOperationResolver() )->resolve(
			$this->operation( 'inventory_reservation', 'inventory', 'inv-1001' ),
			array(
				'inventory' => array(
					'status'     => 'available',
					'rowVersion' => 4,
				),
			),
			'2026-06-06T19:00:00Z'
		);

		$this->assert_same( 'accepted', $plan->status() );
		$this->assert_same( 'inventory_reserved', $plan->code() );
		$this->assert_same( 'reserved', $plan->details()['canonicalStatus'] );
		$this->assert_same( 5, $plan->details()['rowVersion'] );
		$this->assert_same( null, $plan->conflict_row() );
		$this->assert_same( 'accepted', $plan->operation_result_row()['status'] );
		$this->assert_same( '2026-06-06T19:00:00Z', $plan->response_payload()['server_time_utc'] );
	}

	public function test_inventory_reservation_creates_manager_conflict_when_item_is_sold(): void {

		$plan = ( new OfflinePushOperationResolver() )->resolve(
			$this->operation(
				'inventory_reservation',
				'inventory',
				'inv-1001',
				array( 'localStatus' => 'offline_pending_sync' ),
				4
			),
			array(
				'inventory' => array(
					'status'     => 'sold',
					'rowVersion' => 8,
				),
			),
			'2026-06-06T19:00:00Z'
		);

		$conflict = $plan->conflict_row();

		$this->assert_true( null !== $conflict );
		$this->assert_same( 'conflict', $plan->status() );
		$this->assert_same( 'inventory_unavailable', $plan->code() );
		$this->assert_same( true, $plan->details()['requiresManagerReview'] );
		$this->assert_same( 'sold', $plan->details()['serverStatus'] );
		$this->assert_same( 'open', $conflict['status'] );
		$this->assert_same( 'inventory', $conflict['entity_type'] );
		$this->assert_same( 8, $conflict['server_row_version'] );
		$this->assert_same( 4, $conflict['device_row_version'] );
		$this->assert_same( array( 'accept_server', 'accept_device', 'manager_adjust' ), $conflict['resolution_options'] );
		$this->assert_same( $conflict['conflict_id'], $plan->details()['conflict_id'] );
	}

	public function test_inventory_update_accepts_matching_row_version_without_canonical_write(): void {

			$plan = ( new OfflinePushOperationResolver() )->resolve(
				$this->operation(
					'inventory_update',
					'inventory',
					'inv-1001',
					array(
						'barcode'           => 'PKM-BASE-004-HOLO',
						'status'            => 'available',
						'location'          => 'Case A3',
						'price_minor_units' => 12500,
					),
					4
				),
				array(
					'inventory' => array(
						'status'     => 'available',
						'location'   => 'Case A2',
						'rowVersion' => 4,
					),
				),
				'2026-06-06T19:00:00Z'
			);

		$this->assert_same( 'accepted', $plan->status() );
		$this->assert_same( 'inventory_update_accepted', $plan->code() );
		$this->assert_true( $plan->details()['canonicalMutationDeferred'] );
			$this->assert_same( 'available', $plan->details()['canonicalStatus'] );
		$this->assert_same( 'Case A3', $plan->details()['canonicalLocation'] );
		$this->assert_same( 12500, $plan->details()['canonicalPriceMinorUnits'] );
		$this->assert_same( 5, $plan->details()['rowVersion'] );
			$this->assert_same( null, $plan->conflict_row() );
	}

	public function test_inventory_update_conflicts_when_server_row_version_changed(): void {

		$plan = ( new OfflinePushOperationResolver() )->resolve(
			$this->operation(
				'inventory_update',
				'inventory',
				'inv-1001',
				array(
					'status'   => 'available',
					'location' => 'Case A3',
				),
				4
			),
			array(
				'inventory' => array(
					'status'     => 'reserved',
					'location'   => 'Online hold',
					'rowVersion' => 6,
				),
			),
			'2026-06-06T19:00:00Z'
		);

		$conflict = $plan->conflict_row();

		$this->assert_true( null !== $conflict );
		$this->assert_same( 'conflict', $plan->status() );
		$this->assert_same( 'inventory_update_stale', $plan->code() );
		$this->assert_same( true, $plan->details()['requiresManagerReview'] );
		$this->assert_same( 'reserved', $plan->details()['serverStatus'] );
		$this->assert_same( 'available', $plan->details()['deviceStatus'] );
			$this->assert_same( 6, $conflict['server_row_version'] );
		$this->assert_same( 4, $conflict['device_row_version'] );
		$this->assert_same( array( 'accept_server', 'accept_device', 'manager_adjust' ), $conflict['resolution_options'] );
	}

	public function test_event_reservation_accepts_local_event_without_provider_queue(): void {

		$plan = ( new OfflinePushOperationResolver() )->resolve(
			$this->operation( 'event_reservation', 'event', 'event-100' ),
			array(
				'event' => array(
					'seatsRemaining' => 3,
					'rowVersion'     => 2,
				),
			),
			'2026-06-06T19:00:00Z'
		);

		$this->assert_same( 'accepted', $plan->status() );
		$this->assert_same( 'event_reserved', $plan->code() );
		$this->assert_false( array_key_exists( 'queueTopDeck', $plan->details() ) );
		$this->assert_same( 3, $plan->details()['rowVersion'] );
	}

	public function test_event_reservation_waitlists_full_event_when_allowed(): void {
		$plan = ( new OfflinePushOperationResolver() )->resolve(
			$this->operation( 'event_reservation', 'event', 'event-100' ),
			array(
				'event' => array(
					'seatsRemaining'  => 0,
					'waitlistEnabled' => true,
					'rowVersion'      => 9,
				),
			),
			'2026-06-06T19:00:00Z'
		);

		$this->assert_same( 'accepted', $plan->status() );
		$this->assert_same( 'event_waitlisted', $plan->code() );
		$this->assert_same( 'waitlist', $plan->details()['canonicalStatus'] );
		$this->assert_false( array_key_exists( 'queueTopDeck', $plan->details() ) );
	}

	public function test_credit_redemption_accepts_within_cached_and_server_balance(): void {
		$plan = ( new OfflinePushOperationResolver() )->resolve(
			$this->operation(
				'credit_redemption',
				'customer_credit',
				'customer-100',
				array(
					'amountMinorUnits'        => 2500,
					'cachedBalanceMinorUnits' => 4000,
				)
			),
			array(
				'customer' => array(
					'creditBalanceMinorUnits' => 4000,
					'rowVersion'              => 6,
				),
			),
			'2026-06-06T19:00:00Z'
		);

		$this->assert_same( 'accepted', $plan->status() );
		$this->assert_same( 'credit_redeemed', $plan->code() );
		$this->assert_same( 1500, $plan->details()['balanceAfterMinorUnits'] );
		$this->assert_same( 7, $plan->details()['rowVersion'] );
	}

	public function test_credit_redemption_rejects_beyond_cached_limit(): void {
		$plan = ( new OfflinePushOperationResolver() )->resolve(
			$this->operation(
				'credit_redemption',
				'customer_credit',
				'customer-100',
				array(
					'amountMinorUnits'        => 5000,
					'cachedBalanceMinorUnits' => 4000,
				)
			),
			array(
				'customer' => array(
					'creditBalanceMinorUnits' => 10000,
				),
			),
			'2026-06-06T19:00:00Z'
		);

		$this->assert_same( 'rejected', $plan->status() );
		$this->assert_same( 'offline_credit_limit_exceeded', $plan->code() );
		$this->assert_same( true, $plan->details()['preservesAttempt'] );
		$this->assert_same( null, $plan->conflict_row() );
	}

	public function test_credit_redemption_conflicts_instead_of_creating_negative_balance(): void {
		$plan = ( new OfflinePushOperationResolver() )->resolve(
			$this->operation(
				'credit_redemption',
				'customer_credit',
				'customer-100',
				array(
					'amountMinorUnits'        => 4500,
					'cachedBalanceMinorUnits' => 5000,
				),
				6
			),
			array(
				'customer' => array(
					'creditBalanceMinorUnits' => 1000,
					'rowVersion'              => 6,
				),
			),
			'2026-06-06T19:00:00Z'
		);

		$conflict = $plan->conflict_row();

		$this->assert_true( null !== $conflict );
		$this->assert_same( 'conflict', $plan->status() );
		$this->assert_same( 'credit_overspend_conflict', $plan->code() );
		$this->assert_same( true, $plan->details()['wouldCreateNegativeBalance'] );
		$this->assert_same( 'customer_credit', $conflict['entity_type'] );
		$this->assert_same( array( 'accept_server', 'manager_adjust', 'dismiss' ), $conflict['resolution_options'] );
	}

	public function test_device_revocation_blocks_operation_before_resolution(): void {
		$plan = ( new OfflinePushOperationResolver() )->resolve(
			$this->operation( 'inventory_reservation', 'inventory', 'inv-1001' ),
			array(
				'device'    => array( 'revoked' => true ),
				'inventory' => array( 'status' => 'available' ),
			),
			'2026-06-06T19:00:00Z'
		);

		$this->assert_same( 'rejected', $plan->status() );
		$this->assert_same( 'device_revoked', $plan->code() );
		$this->assert_same( false, $plan->details()['retryable'] );
		$this->assert_same( null, $plan->conflict_row() );
	}

	public function test_invalid_server_time_is_rejected(): void {
		$this->assert_throws_invalid_argument(
			fn () => ( new OfflinePushOperationResolver() )->resolve(
				$this->operation( 'inventory_reservation', 'inventory', 'inv-1001' ),
				array( 'inventory' => array( 'status' => 'available' ) ),
				'2026-06-06T19:00:00-04:00'
			)
		);
	}

		/**
		 * @param array<string, mixed> $payload Operation payload.
		 */
	private function operation(
		string $operation_type,
		string $entity_type,
		string $entity_id,
		array $payload = array(),
		?int $base_row_version = null
	): OfflineOperationEnvelope {
		return new OfflineOperationEnvelope(
			'op-00001',
			'device-main-01',
			3,
			22,
			$operation_type,
			$entity_type,
			$entity_id,
			$base_row_version,
			'2026-06-06T10:15:00-04:00',
			'2026-06-06T14:15:05Z',
			$payload,
			array(),
			1
		);
	}

		/**
		 * @param callable(): void $callback Callback expected to throw.
		 */
	private function assert_throws_invalid_argument( callable $callback ): void {
		try {
			$callback();
		} catch ( InvalidArgumentException ) {
			$this->assert_true( true );

			return;
		}

		$this->assert_true( false, 'Expected InvalidArgumentException.' );
	}
}
