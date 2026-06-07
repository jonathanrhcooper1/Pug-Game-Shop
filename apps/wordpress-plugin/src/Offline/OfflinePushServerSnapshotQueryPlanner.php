<?php
/**
 * Plan-only offline push server snapshot lookup contracts.
 *
 * @package TCGStorePlatform
 */

namespace TCGStorePlatform\Offline;

final class OfflinePushServerSnapshotQueryPlanner {
	/**
	 * @var array<string, array<string, mixed>>
	 */
	private const OPERATION_CONTRACTS = array(
		'inventory_reservation' => array(
			'domain'           => 'inventory',
			'entity_type'      => 'inventory',
			'table'            => 'tcg_inventory_items',
			'snapshot_section' => 'inventory',
			'selected_columns' => array(
				'public_id',
				'status',
				'row_version',
				'updated_at',
			),
			'payload_fields'   => array(
				'status',
				'row_version',
			),
		),
		'event_reservation'     => array(
			'domain'           => 'event',
			'entity_type'      => 'event',
			'table'            => 'tcg_events',
			'snapshot_section' => 'event',
			'selected_columns' => array(
				'public_id',
				'player_cap',
				'registered_count',
				'waitlist_enabled',
				'registration_status',
				'registration_mode',
				'topdeck_enabled',
				'row_version',
				'updated_at',
			),
			'payload_fields'   => array(
				'public_id',
				'player_cap',
				'registered_count',
				'waitlist_enabled',
				'registration_status',
				'registration_mode',
				'topdeck_enabled',
				'row_version',
			),
			'derived_fields'   => array(
				'seatsRemaining' => 'player_cap_minus_registered_count',
			),
		),
		'credit_redemption'     => array(
			'domain'           => 'customer_credit',
			'entity_type'      => 'customer_credit',
			'table'            => 'tcg_customers',
			'snapshot_section' => 'customer',
			'selected_columns' => array(
				'public_id',
				'credit_balance',
				'credit_currency',
				'credit_version',
				'status',
				'row_version',
				'updated_at',
			),
			'payload_fields'   => array(
				'public_id',
				'credit_balance',
				'credit_currency',
				'credit_version',
				'status',
				'row_version',
			),
			'derived_fields'   => array(
				'creditBalanceMinorUnits' => 'credit_balance_decimal_to_minor_units',
			),
		),
	);

	/**
	 * @return array<string, array<string, mixed>>
	 */
	public static function operation_contracts(): array {
		return self::OPERATION_CONTRACTS;
	}

	public function plan(
		OfflinePushPayload $payload,
		int $offline_device_id,
		string $table_prefix
	): OfflinePushServerSnapshotQueryPlan {
		$errors       = array();
		$table_prefix = trim( $table_prefix );

		if ( $offline_device_id <= 0 ) {
			$errors[] = 'offline_device_id_invalid';
		}

		if ( '' === $table_prefix || 1 !== preg_match( '/^[A-Za-z0-9_]+$/', $table_prefix ) ) {
			$errors[] = 'table_prefix_invalid';
		}

		if ( '' === $payload->device_id() || ! $this->is_public_id( $payload->device_id() ) ) {
			$errors[] = 'device_id_invalid';
		}

		if ( array() === $payload->operations() ) {
			$errors[] = 'operations_empty';
		}

		$operation_queries = array();
		$operation_ids     = array();

		foreach ( $payload->operations() as $index => $operation ) {
			$operation_errors = $this->validate_operation( $payload, $operation, $index, $operation_ids );

			if ( array() !== $operation_errors ) {
				$errors = array_merge( $errors, $operation_errors );
				continue;
			}

			$operation_ids[] = $operation->client_operation_id();

			if ( array() === $errors ) {
				$operation_queries[ $operation->client_operation_id() ] = $this->operation_query(
					$operation,
					self::OPERATION_CONTRACTS[ $operation->operation_type() ],
					$table_prefix
				);
			}
		}

		if ( array() !== $errors ) {
			return OfflinePushServerSnapshotQueryPlan::rejected(
				$payload->batch_id(),
				$payload->device_id(),
				$offline_device_id,
				$errors
			);
		}

		return OfflinePushServerSnapshotQueryPlan::accepted(
			$payload->batch_id(),
			$payload->device_id(),
			$offline_device_id,
			$table_prefix,
			$operation_queries
		);
	}

	/**
	 * @param list<string> $operation_ids Seen operation IDs.
	 * @return list<string>
	 */
	private function validate_operation(
		OfflinePushPayload $payload,
		OfflineOperationEnvelope $operation,
		int $index,
		array $operation_ids
	): array {
		$errors = array();

		if ( ! $this->is_public_id( $operation->client_operation_id() ) ) {
			$errors[] = "operations_{$index}_client_operation_id_invalid";
		}

		if ( in_array( $operation->client_operation_id(), $operation_ids, true ) ) {
			$errors[] = "operations_{$index}_client_operation_id_duplicate";
		}

		if ( $operation->device_id() !== $payload->device_id() ) {
			$errors[] = "operations_{$index}_device_id_mismatch";
		}

		if ( ! $this->is_lookup_id( $operation->entity_id() ) ) {
			$errors[] = "operations_{$index}_entity_id_invalid";
		}

		$contract = self::OPERATION_CONTRACTS[ $operation->operation_type() ] ?? null;

		if ( null === $contract ) {
			$errors[] = "operations_{$index}_operation_type_unsupported";
		} elseif ( ( $contract['entity_type'] ?? '' ) !== $operation->entity_type() ) {
			$errors[] = "operations_{$index}_entity_type_unsupported";
		}

		return $errors;
	}

	/**
	 * @param array<string, mixed> $contract Operation snapshot contract.
	 * @return array<string, mixed>
	 */
	private function operation_query(
		OfflineOperationEnvelope $operation,
		array $contract,
		string $table_prefix
	): array {
		$entity_key = $operation->entity_type() . ':' . $operation->entity_id();

		return array(
			'client_operation_id'           => $operation->client_operation_id(),
			'operation_type'                => $operation->operation_type(),
			'entity_type'                   => $operation->entity_type(),
			'entity_id'                     => $operation->entity_id(),
			'entity_key'                    => $entity_key,
			'domain'                        => $contract['domain'],
			'table_name'                    => $table_prefix . $contract['table'],
			'snapshot_section'              => $contract['snapshot_section'],
			'selected_columns'              => $contract['selected_columns'],
			'payload_fields'                => $contract['payload_fields'],
			'derived_fields'                => $contract['derived_fields'] ?? array(),
			'where'                         => array(
				'public_id' => $operation->entity_id(),
			),
			'limit'                         => 1,
			'result_keys'                   => array(
				$operation->client_operation_id(),
				$entity_key,
			),
			'query_ready'                    => true,
			'execution_deferred'             => true,
			'snapshot_repository_next'       => true,
			'route_connected_reads_deferred' => true,
			'canonical_mutations_deferred'   => true,
		);
	}

	private function is_public_id( string $value ): bool {
		return 1 === preg_match( '/^[a-zA-Z0-9._:-]{8,128}$/', $value );
	}

	private function is_lookup_id( string $value ): bool {
		return 1 === preg_match( '/^[a-zA-Z0-9._:-]{1,128}$/', $value );
	}
}
