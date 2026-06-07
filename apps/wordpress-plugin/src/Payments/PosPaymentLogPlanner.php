<?php
/**
 * POS reconciliation and payment-provider log payload planner.
 *
 * @package TCGStorePlatform
 */

namespace TCGStorePlatform\Payments;

use TCGStorePlatform\Logging\Redactor;

final class PosPaymentLogPlanner {
	/**
	 * @param array<string, mixed> $transaction_plan Normalized POS transaction ingestion plan.
	 * @param array<string, mixed> $context Optional WordPress/order/provider context.
	 */
	public function plan_transaction( array $transaction_plan, array $context = array() ): PosPaymentLogPlan {
		$details     = $this->array_value( $transaction_plan['details'] ?? array() );
		$ingestion   = $this->array_value( $details['ingestion'] ?? array() );
		$payment     = $this->array_value( $ingestion['payment'] ?? $details['payment'] ?? array() );
		$outcome     = $this->slug( $transaction_plan['status'] ?? '' );
		$result_code = $this->slug( $transaction_plan['code'] ?? 'pos_transaction_unclassified' );
		$provider    = $this->slug( $ingestion['provider'] ?? $context['provider'] ?? '' );
		$event_id    = $this->trimmed_string( $ingestion['eventId'] ?? $ingestion['event_id'] ?? '' );
		$event_type  = $this->slug( $ingestion['eventType'] ?? $ingestion['event_type'] ?? '' );
		$event_key   = $this->event_key( $provider, $ingestion, $event_id );
		$currency    = $this->currency( $payment['currency'] ?? $context['currency'] ?? '' );
		$received_at = $this->safe_timestamp( $context['received_at'] ?? null );
		$occurred_at = $this->optional_timestamp( $context['occurred_at'] ?? $ingestion['occurredAt'] ?? $ingestion['occurred_at'] ?? null );
		$operation   = $this->operation_for_event_type( $event_type );
		$errors      = $this->planning_errors( $provider, $event_key, $outcome, $currency, $operation );

		if ( array() !== $errors ) {
			return PosPaymentLogPlan::failed( 'pos_payment_log_plan_invalid', $errors );
		}

		$payment_row = $this->payment_provider_row(
			$provider,
			$event_key,
			$operation,
			$payment,
			$ingestion,
			$transaction_plan,
			$context,
			$currency,
			$received_at,
			$occurred_at
		);
		$pos_rows    = $this->pos_sync_rows(
			$provider,
			$event_key,
			$transaction_plan,
			$details,
			$ingestion,
			$payment,
			$context,
			$received_at,
			$occurred_at
		);

		$audit_events = array(
			array(
				'action'                           => 'pos_payment.log_plan_created',
				'provider'                         => $provider,
				'event_id_hash'                    => hash( 'sha256', $event_id ),
				'event_type'                       => $event_type,
				'operation'                        => $operation,
				'outcome_status'                   => $outcome,
				'result_code'                      => $result_code,
				'pos_sync_row_count'               => count( $pos_rows ),
				'payment_provider_row_count'       => 1,
				'provider_inventory_write_blocked' => true === ( $details['providerInventoryWriteBlocked'] ?? false ),
				'route_connected_writes_deferred'  => true === ( $details['routeConnectedWritesDeferred'] ?? true ),
				'production_capture_deferred'      => true === ( $details['productionCaptureDeferred'] ?? true ),
			),
		);

		return PosPaymentLogPlan::ready(
			'pos_payment_log_plan_ready',
			$pos_rows,
			array( $payment_row ),
			$audit_events
		);
	}

	/**
	 * @param array<string, mixed> $payment Normalized payment payload.
	 * @param array<string, mixed> $ingestion Normalized POS ingestion payload.
	 * @param array<string, mixed> $transaction_plan Normalized transaction outcome.
	 * @param array<string, mixed> $context Optional WordPress/order/provider context.
	 * @return array<string, mixed>
	 */
	private function payment_provider_row(
		string $provider,
		string $event_key,
		string $operation,
		array $payment,
		array $ingestion,
		array $transaction_plan,
		array $context,
		string $currency,
		string $received_at,
		?string $occurred_at
	): array {
		$idempotency_key = $this->bounded_key( $event_key . ':payment:' . $operation );

		return array(
			'public_id'               => $this->public_id_for_key( 'payment-provider-log:' . $idempotency_key ),
			'provider'                => $provider,
			'channel'                 => $this->defaulted_slug( $context['channel'] ?? '', 'card_present' ),
			'operation'               => $operation,
			'woo_order_id'            => $this->optional_positive_int( $context['woo_order_id'] ?? $context['order_id'] ?? null ),
			'external_transaction_id' => $this->nullable_string( $payment['transactionId'] ?? $payment['transaction_id'] ?? null ),
			'external_payment_id'     => $this->nullable_string( $payment['paymentId'] ?? $payment['payment_id'] ?? null ),
			'external_refund_id'      => $this->nullable_string( $payment['refundId'] ?? $payment['refund_id'] ?? null ),
			'amount_minor_units'      => $this->non_negative_int( $payment['amountMinorUnits'] ?? $payment['amount_minor_units'] ?? null ),
			'currency'                => $currency,
			'status'                  => $this->defaulted_slug( $payment['status'] ?? $transaction_plan['status'] ?? '', 'unknown' ),
			'masked_request_json'     => $this->json( Redactor::redact( $context['raw_request'] ?? $ingestion ) ),
			'masked_response_json'    => $this->json( Redactor::redact( $context['raw_response'] ?? $transaction_plan ) ),
			'idempotency_key'         => $idempotency_key,
			'occurred_at'             => $occurred_at,
			'received_at'             => $received_at,
			'created_at'              => $received_at,
			'updated_at'              => $received_at,
			'row_version'             => 1,
		);
	}

	/**
	 * @param array<string, mixed> $transaction_plan Normalized transaction outcome.
	 * @param array<string, mixed> $details Outcome details.
	 * @param array<string, mixed> $ingestion Normalized POS ingestion payload.
	 * @param array<string, mixed> $payment Normalized payment payload.
	 * @param array<string, mixed> $context Optional WordPress/order/provider context.
	 * @return list<array<string, mixed>>
	 */
	private function pos_sync_rows(
		string $provider,
		string $event_key,
		array $transaction_plan,
		array $details,
		array $ingestion,
		array $payment,
		array $context,
		string $received_at,
		?string $occurred_at
	): array {
		$transitions = $this->list_value( $details['inventoryTransitions'] ?? $details['inventory_transitions'] ?? array() );

		if ( array() === $transitions ) {
			return array(
				$this->pos_sync_row(
					$provider,
					$event_key,
					'summary',
					$transaction_plan,
					$details,
					$ingestion,
					$payment,
					$context,
					array(),
					$received_at,
					$occurred_at
				),
			);
		}

		$rows = array();

		foreach ( $transitions as $index => $transition ) {
			$rows[] = $this->pos_sync_row(
				$provider,
				$event_key,
				'line-' . (string) $index,
				$transaction_plan,
				$details,
				$ingestion,
				$payment,
				$context,
				$this->array_value( $transition ),
				$received_at,
				$occurred_at
			);
		}

		return $rows;
	}

	/**
	 * @param array<string, mixed> $transaction_plan Normalized transaction outcome.
	 * @param array<string, mixed> $details Outcome details.
	 * @param array<string, mixed> $ingestion Normalized POS ingestion payload.
	 * @param array<string, mixed> $payment Normalized payment payload.
	 * @param array<string, mixed> $context Optional WordPress/order/provider context.
	 * @param array<string, mixed> $transition Planned inventory transition.
	 * @return array<string, mixed>
	 */
	private function pos_sync_row(
		string $provider,
		string $event_key,
		string $suffix,
		array $transaction_plan,
		array $details,
		array $ingestion,
		array $payment,
		array $context,
		array $transition,
		string $received_at,
		?string $occurred_at
	): array {
		$idempotency_key = $this->bounded_key( $event_key . ':pos:' . $suffix );
		$status          = true === ( $details['replayed'] ?? false )
			? 'replayed'
			: $this->reconciliation_status( $transaction_plan['status'] ?? '' );

		return array(
			'public_id'               => $this->public_id_for_key( 'pos-sync-log:' . $idempotency_key ),
			'provider'                => $provider,
			'provider_location_id'    => $this->nullable_string( $context['provider_location_id'] ?? $ingestion['providerLocationId'] ?? $ingestion['provider_location_id'] ?? null ),
			'external_transaction_id' => $this->nullable_string( $payment['transactionId'] ?? $payment['transaction_id'] ?? $transition['transactionId'] ?? null ),
			'external_order_id'       => $this->nullable_string( $ingestion['externalOrderId'] ?? $ingestion['external_order_id'] ?? $context['external_order_id'] ?? null ),
			'external_line_item_id'   => $this->nullable_string( $transition['externalLineItemId'] ?? $transition['external_line_item_id'] ?? null ),
			'inventory_item_id'       => $this->optional_positive_int( $transition['inventoryId'] ?? $transition['inventory_item_id'] ?? null ),
			'barcode'                 => $this->nullable_string( $transition['barcode'] ?? null ),
			'reconciliation_status'   => $status,
			'result_code'             => $this->slug( $transaction_plan['code'] ?? 'pos_transaction_unclassified' ),
			'result_details_json'     => $this->json(
				Redactor::redact(
					array(
						'outcome_status'                   => $this->slug( $transaction_plan['status'] ?? '' ),
						'transition'                       => $transition,
						'provider_inventory_write_blocked' => true === ( $details['providerInventoryWriteBlocked'] ?? false ),
						'route_connected_writes_deferred'  => true === ( $details['routeConnectedWritesDeferred'] ?? true ),
						'production_capture_deferred'      => true === ( $details['productionCaptureDeferred'] ?? true ),
					)
				)
			),
			'idempotency_key'         => $idempotency_key,
			'occurred_at'             => $occurred_at,
			'received_at'             => $received_at,
			'reconciled_at'           => 'reconciled' === $status ? $received_at : null,
			'created_at'              => $received_at,
			'updated_at'              => $received_at,
			'row_version'             => 1,
		);
	}

	/**
	 * @return list<string>
	 */
	private function planning_errors( string $provider, string $event_key, string $outcome, string $currency, string $operation ): array {
		$errors = array();

		if ( '' === $provider ) {
			$errors[] = 'pos_provider_missing';
		}

		if ( '' === $event_key ) {
			$errors[] = 'pos_event_key_missing';
		}

		if ( '' === $outcome ) {
			$errors[] = 'pos_outcome_status_missing';
		}

		if ( '' === $currency ) {
			$errors[] = 'payment_currency_missing';
		}

		if ( '' === $operation ) {
			$errors[] = 'payment_operation_missing';
		}

		return $errors;
	}

	/**
	 * @param array<string, mixed> $ingestion Normalized POS ingestion payload.
	 */
	private function event_key( string $provider, array $ingestion, string $event_id ): string {
		$provided = $this->trimmed_string( $ingestion['idempotencyKey'] ?? $ingestion['idempotency_key'] ?? '' );

		if ( '' !== $provided ) {
			return $this->bounded_key( $provided );
		}

		if ( '' === $provider || '' === $event_id ) {
			return '';
		}

		return $this->bounded_key( $provider . ':' . $event_id );
	}

	private function operation_for_event_type( string $event_type ): string {
		if ( 'refund' === $event_type ) {
			return 'refund';
		}

		if ( in_array( $event_type, array( 'sale', 'payment', 'order_paid' ), true ) ) {
			return 'capture';
		}

		return '';
	}

	private function reconciliation_status( mixed $status ): string {
		return match ( $this->slug( $status ) ) {
			'accepted' => 'reconciled',
			'conflict' => 'conflict',
			'rejected' => 'rejected',
			default => 'pending',
		};
	}

	/**
	 * @param mixed $value Input value.
	 * @return array<string, mixed>
	 */
	private function array_value( mixed $value ): array {
		return is_array( $value ) ? $value : array();
	}

	/**
	 * @param mixed $value Input value.
	 * @return list<mixed>
	 */
	private function list_value( mixed $value ): array {
		if ( ! is_array( $value ) ) {
			return array();
		}

		return array_values( $value );
	}

	private function nullable_string( mixed $value ): ?string {
		$value = $this->trimmed_string( $value );

		return '' === $value ? null : $value;
	}

	private function trimmed_string( mixed $value ): string {
		return trim( (string) $value );
	}

	private function slug( mixed $value ): string {
		$value = strtolower( $this->trimmed_string( $value ) );
		$value = preg_replace( '/[^a-z0-9_-]+/', '_', $value ) ?? $value;
		$value = trim( $value, '_' );

		return $value;
	}

	private function defaulted_slug( mixed $value, string $fallback ): string {
		$value = $this->slug( $value );

		return '' === $value ? $fallback : $value;
	}

	private function currency( mixed $value ): string {
		$value = strtoupper( $this->trimmed_string( $value ) );

		return 1 === preg_match( '/^[A-Z]{3}$/', $value ) ? $value : '';
	}

	private function optional_positive_int( mixed $value ): ?int {
		if ( is_int( $value ) && $value > 0 ) {
			return $value;
		}

		if ( is_string( $value ) && 1 === preg_match( '/^\d+$/', $value ) && (int) $value > 0 ) {
			return (int) $value;
		}

		return null;
	}

	private function non_negative_int( mixed $value ): int {
		if ( is_int( $value ) && $value >= 0 ) {
			return $value;
		}

		if ( is_string( $value ) && 1 === preg_match( '/^\d+$/', $value ) ) {
			return (int) $value;
		}

		if ( is_float( $value ) && $value >= 0 && floor( $value ) === $value ) {
			return (int) $value;
		}

		return 0;
	}

	private function safe_timestamp( mixed $value ): string {
		$value = $this->trimmed_string( $value );

		return '' === $value ? gmdate( 'Y-m-d H:i:s' ) : $value;
	}

	private function optional_timestamp( mixed $value ): ?string {
		$value = $this->trimmed_string( $value );

		return '' === $value ? null : $value;
	}

	private function bounded_key( string $value ): string {
		if ( strlen( $value ) <= 191 ) {
			return $value;
		}

		return substr( $value, 0, 150 ) . ':' . substr( hash( 'sha256', $value ), 0, 40 );
	}

	private function json( mixed $value ): string {
		$json = function_exists( 'wp_json_encode' )
			? wp_json_encode( $value, JSON_UNESCAPED_SLASHES )
			: json_encode( $value, JSON_UNESCAPED_SLASHES );

		return false === $json ? '{}' : (string) $json;
	}

	private function public_id_for_key( string $key ): string {
		$hash = hash( 'sha256', $key );

		return sprintf(
			'%s-%s-%s-%s-%s',
			substr( $hash, 0, 8 ),
			substr( $hash, 8, 4 ),
			substr( $hash, 12, 4 ),
			substr( $hash, 16, 4 ),
			substr( $hash, 20, 12 )
		);
	}
}
