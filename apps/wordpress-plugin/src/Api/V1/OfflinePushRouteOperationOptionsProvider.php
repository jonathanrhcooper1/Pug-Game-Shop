<?php
/**
 * Route-aware offline push operation options provider.
 *
 * @package TCGStorePlatform
 */

namespace TCGStorePlatform\Api\V1;

use InvalidArgumentException;
use TCGStorePlatform\Events\EventPaymentStatus;
use TCGStorePlatform\Offline\OfflineOperationEnvelope;
use TCGStorePlatform\Offline\OfflinePushPayload;

final class OfflinePushRouteOperationOptionsProvider {
	private const SUPPORTED_OPERATION_TYPES = array(
		'event_reservation',
	);

	private const EVENT_PAYMENT_STATUSES = array(
		EventPaymentStatus::NOT_REQUIRED,
		EventPaymentStatus::PAY_AT_STORE,
		EventPaymentStatus::PENDING_ONLINE,
		EventPaymentStatus::PAID,
		EventPaymentStatus::REFUNDED,
	);

	/**
	 * @param array<string, mixed> $context Route processing context.
	 * @return array<string|int, array<string, mixed>>
	 */
	public function __invoke(
		OfflinePushPayload $payload,
		OfflineRestRequestData $data,
		array $context = array()
	): array {
		unset( $data, $context );

		$options = array();

		foreach ( $payload->operations() as $index => $operation ) {
			$operation_options = $this->operation_options( $operation, $index );

			if ( array() === $operation_options ) {
				continue;
			}

			$options[ $operation->client_operation_id() ] = $operation_options;
			$options[ $operation->entity_type() . ':' . $operation->entity_id() ] = $operation_options;
			$options[ $index ] = $operation_options;
		}

		return $options;
	}

	/**
	 * @return array<string, mixed>
	 */
	public function readiness_summary(): array {
		return array(
			'action'                              => 'offline_push_route_operation_options_provider_ready',
			'provider_ready'                      => true,
			'supported_operation_types'           => self::SUPPORTED_OPERATION_TYPES,
			'allowed_event_payment_statuses'      => self::EVENT_PAYMENT_STATUSES,
			'explicit_execution_required'         => true,
			'default_route_execution_deferred'    => true,
			'default_route_registration_deferred' => true,
			'route_connected_reads_deferred'      => true,
			'canonical_mutations_deferred'        => true,
		);
	}

	/**
	 * @return array<string, mixed>
	 */
	private function operation_options( OfflineOperationEnvelope $operation, int $index ): array {
		if ( 'event_reservation' !== $operation->operation_type() ) {
			return array();
		}

		$payment_status = $this->payment_status( $operation->payload(), $index );

		return array(
			'paymentStatus'  => $payment_status,
			'payment_status' => $payment_status,
		);
	}

	/**
	 * @param array<string, mixed> $payload Operation payload.
	 */
	private function payment_status( array $payload, int $index ): string {
		$value = $payload['paymentStatus'] ?? $payload['payment_status'] ?? EventPaymentStatus::NOT_REQUIRED;

		if ( is_array( $value ) || is_object( $value ) ) {
			throw new InvalidArgumentException( "operations_{$index}_payment_status_invalid" );
		}

		$value = strtolower( trim( (string) $value ) );

		if ( ! in_array( $value, self::EVENT_PAYMENT_STATUSES, true ) ) {
			throw new InvalidArgumentException( "operations_{$index}_payment_status_unsupported" );
		}

		return $value;
	}
}
