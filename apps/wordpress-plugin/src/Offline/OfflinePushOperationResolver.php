<?php
/**
 * Offline push operation resolver.
 *
 * @package TCGStorePlatform
 */

namespace TCGStorePlatform\Offline;

use InvalidArgumentException;

final class OfflinePushOperationResolver {
	private const STATUS_ACCEPTED             = 'accepted';
	private const STATUS_CONFLICT             = 'conflict';
	private const STATUS_REJECTED             = 'rejected';
	private const CONFLICT_RESOLUTION_OPTIONS = array(
		'inventory_unavailable'     => array( 'accept_server', 'accept_device', 'manager_adjust' ),
		'event_capacity_conflict'   => array( 'accept_server', 'manager_adjust', 'dismiss' ),
		'credit_overspend_conflict' => array( 'accept_server', 'manager_adjust', 'dismiss' ),
	);

	/**
	 * @param array<string, mixed> $server_state Canonical server snapshot for the operation entity.
	 * @param array<string, mixed> $options Runtime options such as payment status.
	 */
	public function resolve(
		OfflineOperationEnvelope $operation,
		array $server_state,
		string $server_time_utc,
		array $options = array()
	): OfflinePushOperationResolutionPlan {
		$server_time_utc = trim( $server_time_utc );

		if ( ! $this->is_utc_timestamp( $server_time_utc ) ) {
			throw new InvalidArgumentException( 'server_time_utc must be an ISO-8601 UTC timestamp.' );
		}

		if ( $this->is_device_revoked( $server_state['device'] ?? array() ) ) {
			return $this->outcome(
				$operation,
				self::STATUS_REJECTED,
				'device_revoked',
				array(
					'requiresManagerReview' => false,
					'retryable'             => false,
				),
				$server_time_utc
			);
		}

		return match ( $operation->operation_type() ) {
			'inventory_reservation' => $this->resolve_inventory_reservation( $operation, $server_state, $server_time_utc ),
			'event_reservation'     => $this->resolve_event_reservation( $operation, $server_state, $server_time_utc, $options ),
			'credit_redemption'     => $this->resolve_credit_redemption( $operation, $server_state, $server_time_utc ),
			default                 => $this->outcome(
				$operation,
				self::STATUS_REJECTED,
				'unsupported_operation',
				array(
					'requiresManagerReview' => true,
					'retryable'             => false,
				),
				$server_time_utc
			),
		};
	}

	/**
	 * @param array<string, mixed> $server_state Canonical server snapshot.
	 */
	private function resolve_inventory_reservation(
		OfflineOperationEnvelope $operation,
		array $server_state,
		string $server_time_utc
	): OfflinePushOperationResolutionPlan {
		$inventory = $this->section( $server_state, 'inventory' );
		$status    = strtolower( trim( (string) ( $inventory['status'] ?? '' ) ) );

		if ( 'available' === $status ) {
			return $this->outcome(
				$operation,
				self::STATUS_ACCEPTED,
				'inventory_reserved',
				array(
					'canonicalStatus' => 'reserved',
					'rowVersion'      => $this->next_version( $this->value( $inventory, 'rowVersion', 'row_version', 0 ) ),
				),
				$server_time_utc
			);
		}

		return $this->conflict_outcome(
			$operation,
			'inventory_unavailable',
			array(
				'requiresManagerReview' => true,
				'localStatus'           => (string) ( $operation->payload()['localStatus'] ?? 'offline_pending_sync' ),
				'serverStatus'          => '' === $status ? 'unknown' : $status,
			),
			'Inventory item is no longer available on the server.',
			$inventory,
			$operation->payload(),
			$this->optional_non_negative_int( $this->value( $inventory, 'rowVersion', 'row_version', null ) ),
			$operation->base_row_version(),
			$server_time_utc
		);
	}

	/**
	 * @param array<string, mixed> $server_state Canonical server snapshot.
	 * @param array<string, mixed> $options Runtime options.
	 */
	private function resolve_event_reservation(
		OfflineOperationEnvelope $operation,
		array $server_state,
		string $server_time_utc,
		array $options
	): OfflinePushOperationResolutionPlan {
		$event           = $this->section( $server_state, 'event' );
		$seats_remaining = $this->minor_units( $this->value( $event, 'seatsRemaining', 'seats_remaining', 0 ) );

		if ( $seats_remaining > 0 ) {
			return $this->outcome(
				$operation,
				self::STATUS_ACCEPTED,
				'event_reserved',
				array(
					'canonicalStatus' => 'reserved',
					'rowVersion'      => $this->next_version( $this->value( $event, 'rowVersion', 'row_version', 0 ) ),
					'queueTopDeck'    => $this->should_queue_topdeck( $event, $options ),
				),
				$server_time_utc
			);
		}

		if ( $this->bool_value( $this->value( $event, 'waitlistEnabled', 'waitlist_enabled', false ) ) ) {
			return $this->outcome(
				$operation,
				self::STATUS_ACCEPTED,
				'event_waitlisted',
				array(
					'canonicalStatus' => 'waitlist',
					'rowVersion'      => $this->next_version( $this->value( $event, 'rowVersion', 'row_version', 0 ) ),
					'queueTopDeck'    => false,
				),
				$server_time_utc
			);
		}

		return $this->conflict_outcome(
			$operation,
			'event_capacity_conflict',
			array(
				'requiresManagerReview' => true,
				'serverStatus'          => (string) ( $event['status'] ?? 'full' ),
			),
			'Event capacity changed before the offline reservation synced.',
			$event,
			$operation->payload(),
			$this->optional_non_negative_int( $this->value( $event, 'rowVersion', 'row_version', null ) ),
			$operation->base_row_version(),
			$server_time_utc
		);
	}

	/**
	 * @param array<string, mixed> $server_state Canonical server snapshot.
	 */
	private function resolve_credit_redemption(
		OfflineOperationEnvelope $operation,
		array $server_state,
		string $server_time_utc
	): OfflinePushOperationResolutionPlan {
		$customer       = $this->section( $server_state, 'customer' );
		$payload        = $operation->payload();
		$amount         = $this->minor_units( $this->value( $payload, 'amountMinorUnits', 'amount_minor_units', 0 ) );
		$cached_balance = $this->minor_units( $this->value( $payload, 'cachedBalanceMinorUnits', 'cached_balance_minor_units', 0 ) );
		$server_balance = $this->minor_units( $this->value( $customer, 'creditBalanceMinorUnits', 'credit_balance_minor_units', 0 ) );

		if ( $amount <= 0 ) {
			return $this->outcome(
				$operation,
				self::STATUS_REJECTED,
				'invalid_credit_amount',
				array(
					'requiresManagerReview' => false,
				),
				$server_time_utc
			);
		}

		if ( $amount > $cached_balance ) {
			return $this->outcome(
				$operation,
				self::STATUS_REJECTED,
				'offline_credit_limit_exceeded',
				array(
					'requiresManagerReview' => true,
					'preservesAttempt'      => true,
				),
				$server_time_utc
			);
		}

		if ( $amount > $server_balance ) {
			return $this->conflict_outcome(
				$operation,
				'credit_overspend_conflict',
				array(
					'requiresManagerReview'      => true,
					'preservesAttempt'           => true,
					'wouldCreateNegativeBalance' => true,
				),
				'Customer credit balance changed before the offline redemption synced.',
				$customer,
				$payload,
				$this->optional_non_negative_int( $this->value( $customer, 'rowVersion', 'row_version', null ) ),
				$operation->base_row_version(),
				$server_time_utc
			);
		}

		return $this->outcome(
			$operation,
			self::STATUS_ACCEPTED,
			'credit_redeemed',
			array(
				'balanceAfterMinorUnits' => $server_balance - $amount,
				'rowVersion'             => $this->next_version( $this->value( $customer, 'rowVersion', 'row_version', 0 ) ),
			),
			$server_time_utc
		);
	}

	/**
	 * @param array<string, mixed> $details Resolution details.
	 * @param array<string, mixed> $server_payload Server snapshot payload.
	 * @param array<string, mixed> $device_payload Device operation payload.
	 */
	private function conflict_outcome(
		OfflineOperationEnvelope $operation,
		string $code,
		array $details,
		string $summary,
		array $server_payload,
		array $device_payload,
		?int $server_row_version,
		?int $device_row_version,
		string $server_time_utc
	): OfflinePushOperationResolutionPlan {
		$conflict_id = $this->conflict_id( $operation, $code );
		$details     = array_merge( $details, array( 'conflict_id' => $conflict_id ) );
		$conflict    = array(
			'conflict_id'        => $conflict_id,
			'status'             => 'open',
			'entity_type'        => $operation->entity_type(),
			'entity_id'          => $operation->entity_id(),
			'conflict_type'      => $code,
			'severity'           => 'blocking',
			'summary'            => $summary,
			'row_version'        => 1,
			'server_row_version' => $server_row_version,
			'device_row_version' => $device_row_version,
			'detected_at_utc'    => $server_time_utc,
			'updated_at_utc'     => $server_time_utc,
			'server_payload'     => $server_payload,
			'device_payload'     => $device_payload,
			'resolution_options' => self::CONFLICT_RESOLUTION_OPTIONS[ $code ],
		);

		return $this->outcome(
			$operation,
			self::STATUS_CONFLICT,
			$code,
			$details,
			$server_time_utc,
			$conflict
		);
	}

	/**
	 * @param array<string, mixed>      $details Resolution details.
	 * @param array<string, mixed>|null $conflict_row Future conflict row.
	 */
	private function outcome(
		OfflineOperationEnvelope $operation,
		string $status,
		string $code,
		array $details,
		string $server_time_utc,
		?array $conflict_row = null
	): OfflinePushOperationResolutionPlan {
		$operation_result_row = array(
			'client_operation_id' => $operation->client_operation_id(),
			'idempotency_key'     => $operation->idempotency_key(),
			'device_id'           => $operation->device_id(),
			'operation_type'      => $operation->operation_type(),
			'entity_type'         => $operation->entity_type(),
			'entity_id'           => $operation->entity_id(),
			'base_row_version'    => $operation->base_row_version(),
			'status'              => $status,
			'code'                => $code,
			'details'             => $details,
			'occurred_at_local'   => $operation->occurred_at_local(),
			'queued_at_utc'       => $operation->queued_at_utc(),
			'processed_at_utc'    => $server_time_utc,
		);

		$response_payload = array(
			'client_operation_id' => $operation->client_operation_id(),
			'status'              => $status,
			'code'                => $code,
			'details'             => $details,
			'server_time_utc'     => $server_time_utc,
		);

		$audit_payload = array(
			'action'                 => 'offline_push_operation_resolved',
			'client_operation_id'    => $operation->client_operation_id(),
			'device_id'              => $operation->device_id(),
			'operation_type'         => $operation->operation_type(),
			'entity_type'            => $operation->entity_type(),
			'entity_id'              => $operation->entity_id(),
			'status'                 => $status,
			'code'                   => $code,
			'processed_at_utc'       => $server_time_utc,
			'operation_payload_hash' => $this->payload_hash( $operation->payload() ),
		);

		if ( null !== $conflict_row ) {
			$audit_payload['conflict_id'] = $conflict_row['conflict_id'];
		}

		return new OfflinePushOperationResolutionPlan(
			$status,
			$code,
			$details,
			$operation_result_row,
			$response_payload,
			$conflict_row,
			$audit_payload
		);
	}

	/**
	 * @param array<string, mixed> $state Server state.
	 * @return array<string, mixed>
	 */
	private function section( array $state, string $key ): array {
		$value = $state[ $key ] ?? array();

		return is_array( $value ) ? $value : array();
	}

	/**
	 * @param array<string, mixed> $data Source data.
	 */
	private function value( array $data, string $camel_key, string $snake_key, mixed $fallback ): mixed {
		if ( array_key_exists( $camel_key, $data ) ) {
			return $data[ $camel_key ];
		}

		if ( array_key_exists( $snake_key, $data ) ) {
			return $data[ $snake_key ];
		}

		return $fallback;
	}

	/**
	 * @param mixed $device Device snapshot.
	 */
	private function is_device_revoked( mixed $device ): bool {
		if ( ! is_array( $device ) ) {
			return false;
		}

		$status = strtolower( trim( (string) ( $device['status'] ?? '' ) ) );

		return true === ( $device['revoked'] ?? false ) || 'revoked' === $status;
	}

	/**
	 * @param array<string, mixed> $event Event snapshot.
	 * @param array<string, mixed> $options Runtime options.
	 */
	private function should_queue_topdeck( array $event, array $options ): bool {
		$registration_mode = (string) $this->value( $event, 'registrationMode', 'registration_mode', '' );
		$payment_status    = (string) $this->value( $options, 'paymentStatus', 'payment_status', '' );

		return 'website_push_topdeck' === $registration_mode
			&& $this->bool_value( $this->value( $event, 'topDeckEnabled', 'topdeck_enabled', false ) )
			&& 'pay_at_store' !== $payment_status;
	}

	private function bool_value( mixed $value ): bool {
		if ( is_bool( $value ) ) {
			return $value;
		}

		if ( is_int( $value ) ) {
			return 1 === $value;
		}

		$value = strtolower( trim( (string) $value ) );

		return '1' === $value || 'true' === $value || 'yes' === $value;
	}

	private function minor_units( mixed $value ): int {
		if ( is_int( $value ) ) {
			return $value;
		}

		if ( is_float( $value ) ) {
			return (int) $value;
		}

		if ( is_string( $value ) && is_numeric( $value ) ) {
			return (int) $value;
		}

		return 0;
	}

	private function optional_non_negative_int( mixed $value ): ?int {
		if ( null === $value || '' === $value ) {
			return null;
		}

		$parsed = $this->minor_units( $value );

		return $parsed >= 0 ? $parsed : null;
	}

	private function next_version( mixed $value ): int {
		return max( 0, $this->minor_units( $value ) ) + 1;
	}

	private function conflict_id( OfflineOperationEnvelope $operation, string $code ): string {
		return 'conflict-' . substr(
			hash(
				'sha256',
				implode(
					'|',
					array(
						$operation->device_id(),
						$operation->client_operation_id(),
						$operation->entity_type(),
						$operation->entity_id(),
						$code,
					)
				)
			),
			0,
			24
		);
	}

	/**
	 * @param array<string, mixed> $payload Payload to hash.
	 */
	private function payload_hash( array $payload ): string {
		$normalized = $this->sort_recursive( $payload );
		$json       = (string) json_encode( $normalized );

		return hash( 'sha256', $json );
	}

	/**
	 * @param array<string, mixed> $payload Payload to sort.
	 * @return array<string, mixed>
	 */
	private function sort_recursive( array $payload ): array {
		ksort( $payload );

		foreach ( $payload as $key => $value ) {
			if ( is_array( $value ) ) {
				$payload[ $key ] = $this->sort_recursive( $value );
			}
		}

		return $payload;
	}

	private function is_utc_timestamp( string $value ): bool {
		return 1 === preg_match( '/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d+)?Z$/', $value );
	}
}
