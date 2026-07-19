<?php
/**
 * Plan-only canonical mutation planner for offline push results.
 *
 * @package TCGStorePlatform
 */

namespace TCGStorePlatform\Offline;

use InvalidArgumentException;

final class OfflinePushCanonicalMutationPlanner {
	/**
	 * Build future canonical mutation descriptors for accepted push operations.
	 *
	 * @param list<string> $replayed_operation_ids Client operation IDs already
	 *                                             represented by persisted rows.
	 */
	public function plan(
		OfflinePushPayload $payload,
		OfflinePushBatchResolutionPlan $resolution,
		array $replayed_operation_ids = array()
	): OfflinePushCanonicalMutationPlan {
		if ( $payload->batch_id() !== $resolution->batch_id() ) {
			throw new InvalidArgumentException( 'Push payload and resolution batch IDs must match.' );
		}

		if ( $payload->device_id() !== $resolution->device_id() ) {
			throw new InvalidArgumentException( 'Push payload and resolution device IDs must match.' );
		}

		$operation_plans       = $this->operation_plans_by_id( $resolution );
		$replayed_ids          = array_fill_keys( $this->string_list( $replayed_operation_ids ), true );
		$mutation_rows         = array();
		$skipped_operation_ids = array();
		$skipped_reasons       = array();

		foreach ( $payload->operations() as $operation ) {
			$operation_id = $operation->client_operation_id();

			if ( ! array_key_exists( $operation_id, $operation_plans ) ) {
				throw new InvalidArgumentException( "Resolution plan is missing offline operation {$operation_id}." );
			}

			$operation_plan = $operation_plans[ $operation_id ];

			if ( isset( $replayed_ids[ $operation_id ] ) ) {
				$skipped_operation_ids[]          = $operation_id;
				$skipped_reasons[ $operation_id ] = 'operation_replayed';
				continue;
			}

			if ( 'accepted' !== $operation_plan->status() ) {
				$skipped_operation_ids[]          = $operation_id;
				$skipped_reasons[ $operation_id ] = 'resolution_status_' . $operation_plan->status();
				continue;
			}

			$mutation_rows[] = $this->mutation_row( $payload, $operation, $operation_plan, $resolution->server_time_utc() );
		}

		if ( count( $operation_plans ) !== count( $payload->operations() ) ) {
			throw new InvalidArgumentException( 'Resolution plan must match the offline push payload operations.' );
		}

		$response_payload = array(
			'batch_id'                        => $payload->batch_id(),
			'device_id'                       => $payload->device_id(),
			'server_time_utc'                 => $resolution->server_time_utc(),
			'mutation_count'                  => count( $mutation_rows ),
			'mutation_operation_ids'          => $this->operation_ids_from_rows( $mutation_rows ),
			'skipped_operation_ids'           => $skipped_operation_ids,
			'skipped_reasons'                 => $skipped_reasons,
			'replayed_operation_ids'          => array_keys( $replayed_ids ),
			'canonical_mutations_deferred'    => true,
			'route_connected_writes_deferred' => true,
			'queue_replay_deferred'           => true,
		);

		$audit_payload = array_merge(
			array(
				'action'          => 'offline_push_canonical_mutations_planned',
				'operation_count' => count( $payload->operations() ),
			),
			$response_payload
		);

		return new OfflinePushCanonicalMutationPlan(
			$payload->batch_id(),
			$payload->device_id(),
			$resolution->server_time_utc(),
			$mutation_rows,
			$skipped_operation_ids,
			$skipped_reasons,
			$response_payload,
			$audit_payload
		);
	}

	/**
	 * @return array<string, OfflinePushOperationResolutionPlan>
	 */
	private function operation_plans_by_id( OfflinePushBatchResolutionPlan $resolution ): array {
		$plans = array();

		foreach ( $resolution->operation_plans() as $operation_plan ) {
			$result_row   = $operation_plan->operation_result_row();
			$operation_id = trim( (string) ( $result_row['client_operation_id'] ?? '' ) );

			if ( '' === $operation_id ) {
				throw new InvalidArgumentException( 'Resolution operation result rows must include client_operation_id.' );
			}

			if ( array_key_exists( $operation_id, $plans ) ) {
				throw new InvalidArgumentException( "Duplicate resolution plan found for offline operation {$operation_id}." );
			}

			$plans[ $operation_id ] = $operation_plan;
		}

		return $plans;
	}

	private function mutation_row(
		OfflinePushPayload $payload,
		OfflineOperationEnvelope $operation,
		OfflinePushOperationResolutionPlan $operation_plan,
		string $server_time_utc
	): array {
		return match ( $operation->operation_type() ) {
			'inventory_reservation' => $this->inventory_reservation_row(
				$payload,
				$operation,
				$operation_plan,
				$server_time_utc
			),
			'event_reservation'     => $this->event_registration_row(
				$payload,
				$operation,
				$operation_plan,
				$server_time_utc
			),
			'event_checkin'         => $this->event_checkin_row(
				$payload,
				$operation,
				$operation_plan,
				$server_time_utc
			),
			'credit_redemption'     => $this->customer_credit_redemption_row(
				$payload,
				$operation,
				$operation_plan,
				$server_time_utc
			),
			default                 => throw new InvalidArgumentException(
				"Accepted offline operation {$operation->client_operation_id()} has no canonical mutation planner."
			),
		};
	}

	private function inventory_reservation_row(
		OfflinePushPayload $payload,
		OfflineOperationEnvelope $operation,
		OfflinePushOperationResolutionPlan $operation_plan,
		string $server_time_utc
	): array {
		$this->assert_code( $operation, $operation_plan, array( 'inventory_reserved' ) );

		$details       = $operation_plan->details();
		$target_status = $this->required_status( $operation, $details, 'canonicalStatus', array( 'reserved' ) );
		$row_version   = $this->required_non_negative_int( $operation, $details, 'rowVersion' );

		return array_merge(
			$this->base_row( $payload, $operation, $operation_plan, $server_time_utc ),
			array(
				'mutation_type'             => 'inventory_reservation',
				'table_contract'            => 'tcg_inventory_items',
				'target_status'             => $target_status,
				'target_row_version'        => $row_version,
				'prevent_double_sell_guard' => true,
			)
		);
	}

	private function event_registration_row(
		OfflinePushPayload $payload,
		OfflineOperationEnvelope $operation,
		OfflinePushOperationResolutionPlan $operation_plan,
		string $server_time_utc
	): array {
		$this->assert_code( $operation, $operation_plan, array( 'event_reserved', 'event_waitlisted' ) );

		$details             = $operation_plan->details();
		$registration_status = $this->required_status( $operation, $details, 'canonicalStatus', array( 'reserved', 'waitlist' ) );
		$row_version         = $this->required_non_negative_int( $operation, $details, 'rowVersion' );

		return array_merge(
			$this->base_row( $payload, $operation, $operation_plan, $server_time_utc ),
			array(
				'mutation_type'           => 'event_registration',
				'table_contract'          => 'tcg_event_registrations',
				'registration_status'     => $registration_status,
				'target_row_version'      => $row_version,
				'capacity_guard_deferred' => true,
			)
		);
	}

	private function customer_credit_redemption_row(
		OfflinePushPayload $payload,
		OfflineOperationEnvelope $operation,
		OfflinePushOperationResolutionPlan $operation_plan,
		string $server_time_utc
	): array {
		$this->assert_code( $operation, $operation_plan, array( 'credit_redeemed' ) );

		$details       = $operation_plan->details();
		$amount        = $this->required_positive_int( $operation, $operation->payload(), 'amountMinorUnits' );
		$balance_after = $this->required_non_negative_int( $operation, $details, 'balanceAfterMinorUnits' );
		$row_version   = $this->required_non_negative_int( $operation, $details, 'rowVersion' );

		return array_merge(
			$this->base_row( $payload, $operation, $operation_plan, $server_time_utc ),
			array(
				'mutation_type'             => 'customer_credit_redemption',
				'table_contract'            => 'tcg_customer_credit_ledger',
				'amount_minor_units'        => $amount,
				'balance_after_minor_units' => $balance_after,
				'target_row_version'        => $row_version,
				'ledger_write_deferred'     => true,
				'negative_balance_guard'    => true,
			)
		);
	}

	private function event_checkin_row(
		OfflinePushPayload $payload,
		OfflineOperationEnvelope $operation,
		OfflinePushOperationResolutionPlan $operation_plan,
		string $server_time_utc
	): array {
		$this->assert_code( $operation, $operation_plan, array( 'event_checked_in' ) );

		$details                = $operation_plan->details();
		$operation_payload      = $operation->payload();
		$registration_public_id = trim( (string) ( $operation_payload['registrationPublicId'] ?? ( $operation_payload['registration_public_id'] ?? '' ) ) );
		$checkin_status         = $this->required_status( $operation, $details, 'checkinStatus', array( 'checked_in' ) );
		$row_version            = $this->required_non_negative_int( $operation, $details, 'rowVersion' );
		$checkin_method         = trim( (string) ( $operation_payload['checkinMethod'] ?? ( $operation_payload['checkin_method'] ?? 'offline_app' ) ) );

		if ( '' === $registration_public_id ) {
			throw new InvalidArgumentException(
				"Accepted offline operation {$operation->client_operation_id()} must include registration public ID."
			);
		}

		if ( '' === $checkin_method ) {
			$checkin_method = 'offline_app';
		}

		return array_merge(
			$this->base_row( $payload, $operation, $operation_plan, $server_time_utc ),
			array(
				'mutation_type'                => 'event_checkin',
				'table_contract'               => 'tcg_event_checkins',
				'registration_table_contract'  => 'tcg_event_registrations',
				'registration_public_id'       => $registration_public_id,
				'checkin_status'               => $checkin_status,
				'checkin_method'               => $checkin_method,
				'target_row_version'           => $row_version,
				'event_checkin_write_deferred' => true,
			)
		);
	}

	/**
	 * @return array<string, mixed>
	 */
	private function base_row(
		OfflinePushPayload $payload,
		OfflineOperationEnvelope $operation,
		OfflinePushOperationResolutionPlan $operation_plan,
		string $server_time_utc
	): array {
		$result_row = $operation_plan->operation_result_row();

		if ( $operation->operation_type() !== (string) ( $result_row['operation_type'] ?? '' ) ) {
			throw new InvalidArgumentException(
				"Resolution operation type does not match offline operation {$operation->client_operation_id()}."
			);
		}

		if ( $operation->entity_type() !== (string) ( $result_row['entity_type'] ?? '' ) ) {
			throw new InvalidArgumentException(
				"Resolution entity type does not match offline operation {$operation->client_operation_id()}."
			);
		}

		if ( $operation->entity_id() !== (string) ( $result_row['entity_id'] ?? '' ) ) {
			throw new InvalidArgumentException(
				"Resolution entity ID does not match offline operation {$operation->client_operation_id()}."
			);
		}

		return array(
			'batch_id'                       => $payload->batch_id(),
			'device_id'                      => $payload->device_id(),
			'client_operation_id'            => $operation->client_operation_id(),
			'operation_type'                 => $operation->operation_type(),
			'entity_type'                    => $operation->entity_type(),
			'entity_id'                      => $operation->entity_id(),
			'resolution_code'                => $operation_plan->code(),
			'expected_base_row_version'      => $operation->base_row_version(),
			'planned_at_utc'                 => $server_time_utc,
			'canonical_mutation_deferred'    => true,
			'route_connected_write_deferred' => true,
		);
	}

	/**
	 * @param list<string> $allowed_codes
	 */
	private function assert_code(
		OfflineOperationEnvelope $operation,
		OfflinePushOperationResolutionPlan $operation_plan,
		array $allowed_codes
	): void {
		if ( in_array( $operation_plan->code(), $allowed_codes, true ) ) {
			return;
		}

		throw new InvalidArgumentException(
			"Accepted offline operation {$operation->client_operation_id()} has unsupported resolution code {$operation_plan->code()}."
		);
	}

	/**
	 * @param array<string, mixed> $details
	 * @param list<string>        $allowed_statuses
	 */
	private function required_status(
		OfflineOperationEnvelope $operation,
		array $details,
		string $key,
		array $allowed_statuses
	): string {
		$status = trim( (string) ( $details[ $key ] ?? '' ) );

		if ( in_array( $status, $allowed_statuses, true ) ) {
			return $status;
		}

		throw new InvalidArgumentException(
			"Accepted offline operation {$operation->client_operation_id()} has unsupported {$key}."
		);
	}

	/**
	 * @param array<string, mixed> $data
	 */
	private function required_non_negative_int(
		OfflineOperationEnvelope $operation,
		array $data,
		string $key
	): int {
		if ( ! array_key_exists( $key, $data ) || ! is_int( $data[ $key ] ) || $data[ $key ] < 0 ) {
			throw new InvalidArgumentException(
				"Accepted offline operation {$operation->client_operation_id()} must include non-negative integer {$key}."
			);
		}

		return $data[ $key ];
	}

	/**
	 * @param array<string, mixed> $data
	 */
	private function required_positive_int(
		OfflineOperationEnvelope $operation,
		array $data,
		string $key
	): int {
		if ( ! array_key_exists( $key, $data ) || ! is_int( $data[ $key ] ) || $data[ $key ] <= 0 ) {
			throw new InvalidArgumentException(
				"Accepted offline operation {$operation->client_operation_id()} must include positive integer {$key}."
			);
		}

		return $data[ $key ];
	}

	/**
	 * @param list<array<string, mixed>> $rows
	 * @return list<string>
	 */
	private function operation_ids_from_rows( array $rows ): array {
		return array_map(
			static fn ( array $row ): string => (string) $row['client_operation_id'],
			$rows
		);
	}

	/**
	 * @param list<string> $values Candidate string values.
	 * @return list<string>
	 */
	private function string_list( array $values ): array {
		$strings = array();

		foreach ( $values as $value ) {
			$value = trim( (string) $value );

			if ( '' !== $value ) {
				$strings[] = $value;
			}
		}

		return array_values( array_unique( $strings ) );
	}
}
