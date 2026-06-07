<?php
/**
 * Offline push batch resolver tests.
 *
 * @package TCGStorePlatform
 */

namespace TCGStorePlatform\Tests\Unit;

use InvalidArgumentException;
use TCGStorePlatform\Offline\OfflinePushBatchResolver;
use TCGStorePlatform\Offline\OfflinePushPayload;
use TCGStorePlatform\Offline\OfflinePushPayloadParser;
use TCGStorePlatform\Tests\TestCase;

final class OfflinePushBatchResolverTest extends TestCase {
	public function test_batch_resolver_builds_response_rows_and_conflict_rows(): void {
		$payload = $this->push_payload();
		$plan    = ( new OfflinePushBatchResolver() )->resolve(
			$payload,
			array(
				'op-inventory-0001'        => array(
					'inventory' => array(
						'status'     => 'available',
						'rowVersion' => 4,
					),
				),
				'event:event-100'          => array(
					'event' => array(
						'seatsRemaining' => 0,
						'waitlistEnabled' => true,
						'rowVersion'     => 9,
					),
				),
				'op-credit-redemption-01'  => array(
					'customer' => array(
						'creditBalanceMinorUnits' => 1000,
						'rowVersion'              => 6,
					),
				),
			),
			'2026-06-06T20:00:00Z'
		);

		$response  = $plan->response_payload();
		$results   = $plan->operation_result_rows();
		$conflicts = $plan->conflict_rows();
		$audit     = $plan->audit_payload();

		$this->assert_same( 'batch-main-01', $plan->batch_id() );
		$this->assert_same( 'device-main-01', $plan->device_id() );
		$this->assert_same( 3, $response['operation_count'] );
		$this->assert_same( 2, $response['counts']['accepted'] );
		$this->assert_same( 1, $response['counts']['conflict'] );
		$this->assert_same( 0, $response['counts']['rejected'] );
		$this->assert_same( 'inventory_reserved', $response['results'][0]['code'] );
		$this->assert_same( 'event_waitlisted', $response['results'][1]['code'] );
		$this->assert_same( 'credit_overspend_conflict', $response['results'][2]['code'] );
		$this->assert_same( 'batch-main-01', $results[0]['batch_id'] );
		$this->assert_same( 'accepted', $results[0]['status'] );
		$this->assert_same( 'conflict', $results[2]['status'] );
		$this->assert_same( 1, count( $conflicts ) );
		$this->assert_same( 'batch-main-01', $conflicts[0]['batch_id'] );
		$this->assert_same( 'device-main-01', $conflicts[0]['device_id'] );
		$this->assert_same( 'op-credit-redemption-01', $conflicts[0]['client_operation_id'] );
		$this->assert_same( 'customer_credit', $conflicts[0]['entity_type'] );
		$this->assert_same( 'offline_push_batch_resolved', $audit['action'] );
		$this->assert_same( array( 'op-inventory-0001', 'op-event-0001', 'op-credit-redemption-01' ), $audit['operation_ids'] );
	}

	public function test_batch_resolver_accepts_event_without_provider_queue(): void {
		$payload = $this->push_payload(
			array(
				$this->event_operation_payload(),
			)
		);
		$plan    = ( new OfflinePushBatchResolver() )->resolve(
			$payload,
			array(
				0 => array(
					'event' => array(
						'seatsRemaining' => 4,
						'rowVersion'     => 2,
					),
				),
			),
			'2026-06-06T20:00:00Z'
		);

		$this->assert_false( array_key_exists( 'queueTopDeck', $plan->response_payload()['results'][0]['details'] ) );
	}

	public function test_batch_resolver_rejects_missing_snapshots_bad_options_and_bad_time(): void {
		$resolver = new OfflinePushBatchResolver();
		$payload  = $this->push_payload(
			array(
				$this->inventory_operation_payload(),
			)
		);

		$this->assert_throws_invalid_argument(
			static fn () => $resolver->resolve( $payload, array(), '2026-06-06T20:00:00Z' )
		);

		$this->assert_throws_invalid_argument(
			static fn () => $resolver->resolve(
				$payload,
				array(
					'op-inventory-0001' => array(
						'inventory' => array( 'status' => 'available' ),
					),
				),
				'2026-06-06T20:00:00Z',
				array( 'op-inventory-0001' => 'not-options' )
			)
		);

		$this->assert_throws_invalid_argument(
			static fn () => $resolver->resolve(
				$payload,
				array(
					'op-inventory-0001' => array(
						'inventory' => array( 'status' => 'available' ),
					),
				),
				'2026-06-06T20:00:00-04:00'
			)
		);
	}

	/**
	 * @param list<array<string, mixed>>|null $operations Operation payloads.
	 */
	private function push_payload( ?array $operations = null ): OfflinePushPayload {
		$result = ( new OfflinePushPayloadParser() )->parse(
			array(
				'batch_id'   => 'body-batch-ignored',
				'device_id'  => 'device-main-01',
				'operations' => $operations ?? array(
					$this->inventory_operation_payload(),
					$this->event_operation_payload(),
					$this->credit_operation_payload(),
				),
			),
			'batch-main-01'
		);

		$this->assert_true( $result->is_valid() );

		$payload = $result->payload();
		$this->assert_true( null !== $payload );

		return $payload;
	}

	/**
	 * @return array<string, mixed>
	 */
	private function inventory_operation_payload(): array {
		return array(
			'client_operation_id' => 'op-inventory-0001',
			'device_id'           => 'device-main-01',
			'location_id'         => 3,
			'actor_id'            => 22,
			'operation_type'      => 'inventory_reservation',
			'entity_type'         => 'inventory',
			'entity_id'           => 'inv-1001',
			'base_row_version'    => 4,
			'occurred_at_local'   => '2026-06-06T10:15:00-04:00',
			'queued_at_utc'       => '2026-06-06T14:15:05Z',
			'payload'             => array( 'localStatus' => 'offline_pending_sync' ),
			'schema_version'      => 1,
		);
	}

	/**
	 * @return array<string, mixed>
	 */
	private function event_operation_payload(): array {
		return array(
			'client_operation_id' => 'op-event-0001',
			'device_id'           => 'device-main-01',
			'location_id'         => 3,
			'actor_id'            => 22,
			'operation_type'      => 'event_reservation',
			'entity_type'         => 'event',
			'entity_id'           => 'event-100',
			'base_row_version'    => 9,
			'occurred_at_local'   => '2026-06-06T11:15:00-04:00',
			'queued_at_utc'       => '2026-06-06T15:15:05Z',
			'payload'             => array(),
			'schema_version'      => 1,
		);
	}

	/**
	 * @return array<string, mixed>
	 */
	private function credit_operation_payload(): array {
		return array(
			'client_operation_id' => 'op-credit-redemption-01',
			'device_id'           => 'device-main-01',
			'location_id'         => 3,
			'actor_id'            => 22,
			'operation_type'      => 'credit_redemption',
			'entity_type'         => 'customer_credit',
			'entity_id'           => 'customer-100',
			'base_row_version'    => 6,
			'occurred_at_local'   => '2026-06-06T12:15:00-04:00',
			'queued_at_utc'       => '2026-06-06T16:15:05Z',
			'payload'             => array(
				'amountMinorUnits'        => 4500,
				'cachedBalanceMinorUnits' => 5000,
			),
			'schema_version'      => 1,
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
