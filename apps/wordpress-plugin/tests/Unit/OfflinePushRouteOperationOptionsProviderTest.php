<?php
/**
 * Route-aware offline push operation options provider tests.
 *
 * @package TCGStorePlatform
 */

namespace TCGStorePlatform\Tests\Unit;

use InvalidArgumentException;
use RuntimeException;
use TCGStorePlatform\Api\V1\OfflinePushRouteOperationOptionsProvider;
use TCGStorePlatform\Api\V1\OfflineRestRequestData;
use TCGStorePlatform\Offline\OfflineOperationEnvelope;
use TCGStorePlatform\Offline\OfflinePushPayload;
use TCGStorePlatform\Tests\TestCase;

final class OfflinePushRouteOperationOptionsProviderTest extends TestCase {
	public function test_provider_normalizes_event_payment_status_options(): void {
		$provider = new OfflinePushRouteOperationOptionsProvider();
		$summary  = $provider->readiness_summary();
		$options  = $provider(
			$this->payload(
				$this->operation(
					'op-event-0001',
					'event_reservation',
					'event',
					'event-100',
					array(
						'paymentStatus' => 'pay_at_store',
					)
				)
			),
			new OfflineRestRequestData( array(), array(), array(), array() )
		);

		$this->assert_same( 'offline_push_route_operation_options_provider_ready', $summary['action'] );
		$this->assert_true( $summary['provider_ready'] );
		$this->assert_true( $summary['explicit_execution_required'] );
		$this->assert_true( $summary['route_connected_reads_deferred'] );
		$this->assert_same( 'pay_at_store', $options['op-event-0001']['paymentStatus'] );
		$this->assert_same( 'pay_at_store', $options['event:event-100']['payment_status'] );
		$this->assert_same( 'pay_at_store', $options[0]['paymentStatus'] );
	}

	public function test_provider_defaults_event_payment_status_to_not_required(): void {
		$options = ( new OfflinePushRouteOperationOptionsProvider() )(
			$this->payload(
				$this->operation( 'op-event-0001', 'event_reservation', 'event', 'event-100' )
			),
			new OfflineRestRequestData( array(), array(), array(), array() )
		);

		$this->assert_same( 'not_required', $options['op-event-0001']['paymentStatus'] );
	}

	public function test_provider_skips_non_event_operations(): void {
		$options = ( new OfflinePushRouteOperationOptionsProvider() )(
			$this->payload(
				$this->operation( 'op-inventory-0001', 'inventory_reservation', 'inventory', 'inv-1001' )
			),
			new OfflineRestRequestData( array(), array(), array(), array() )
		);

		$this->assert_same( array(), $options );
	}

	public function test_provider_rejects_unsupported_payment_status(): void {
		try {
			( new OfflinePushRouteOperationOptionsProvider() )(
				$this->payload(
					$this->operation(
						'op-event-0001',
						'event_reservation',
						'event',
						'event-100',
						array(
							'payment_status' => 'captured_elsewhere',
						)
					)
				),
				new OfflineRestRequestData( array(), array(), array(), array() )
			);
		} catch ( InvalidArgumentException $exception ) {
			$this->assert_same( 'operations_0_payment_status_unsupported', $exception->getMessage() );

			return;
		}

		throw new RuntimeException( 'Expected unsupported payment status to reject operation options.' );
	}

	public function test_provider_rejects_non_scalar_payment_status(): void {
		try {
			( new OfflinePushRouteOperationOptionsProvider() )(
				$this->payload(
					$this->operation(
						'op-event-0001',
						'event_reservation',
						'event',
						'event-100',
						array(
							'paymentStatus' => array( 'pay_at_store' ),
						)
					)
				),
				new OfflineRestRequestData( array(), array(), array(), array() )
			);
		} catch ( InvalidArgumentException $exception ) {
			$this->assert_same( 'operations_0_payment_status_invalid', $exception->getMessage() );

			return;
		}

		throw new RuntimeException( 'Expected non-scalar payment status to reject operation options.' );
	}

	private function payload( OfflineOperationEnvelope $operation ): OfflinePushPayload {
		return new OfflinePushPayload(
			'batch-route-options-01',
			'device-main-01',
			array( $operation )
		);
	}

	/**
	 * @param array<string, mixed> $payload Operation payload.
	 */
	private function operation(
		string $operation_id,
		string $operation_type,
		string $entity_type,
		string $entity_id,
		array $payload = array()
	): OfflineOperationEnvelope {
		return new OfflineOperationEnvelope(
			$operation_id,
			'device-main-01',
			3,
			22,
			$operation_type,
			$entity_type,
			$entity_id,
			4,
			'2026-06-06T10:15:00-04:00',
			'2026-06-06T14:15:05Z',
			$payload,
			array(),
			1
		);
	}
}
