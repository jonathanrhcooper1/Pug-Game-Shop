<?php
/**
 * Offline push persistence planner.
 *
 * @package TCGStorePlatform
 */

namespace TCGStorePlatform\Offline;

use InvalidArgumentException;

final class OfflinePushPersistencePlanner {
	/**
	 * @param array<string, mixed>     $device_row Existing registered device row.
	 * @param array<string|int, mixed> $existing_operation_rows Existing queue rows keyed by operation ID or index.
	 */
	public function plan(
		OfflinePushPayload $payload,
		OfflinePushBatchResolutionPlan $resolution,
		array $device_row,
		string $received_at_utc,
		array $existing_operation_rows = array()
	): OfflinePushPersistencePlan {
		$received_at_utc = trim( $received_at_utc );

		if ( ! $this->is_utc_timestamp( $received_at_utc ) ) {
			throw new InvalidArgumentException( 'received_at_utc must be an ISO-8601 UTC timestamp.' );
		}

		if ( $payload->batch_id() !== $resolution->batch_id() ) {
			throw new InvalidArgumentException( 'Offline push payload and resolution batch IDs must match.' );
		}

		if ( $payload->device_id() !== $resolution->device_id() ) {
			throw new InvalidArgumentException( 'Offline push payload and resolution device IDs must match.' );
		}

		$offline_device_id = $this->offline_device_id( $device_row );
		$device_public_id  = $this->device_public_id( $device_row, $payload->device_id() );
		$result_rows       = $this->result_rows_by_operation( $resolution );
		$conflict_rows     = $this->conflict_rows_by_operation( $resolution );
		$insert_rows       = array();
		$replay_rows       = array();
		$conflict_inserts  = array();

		foreach ( $payload->operations() as $index => $operation ) {
			$result = $this->result_row( $operation, $result_rows );

			$existing = $this->existing_operation_row( $operation, $existing_operation_rows, $index );

			if ( null !== $existing ) {
				$this->assert_existing_result_matches( $operation, $result, $existing );
				$replay_rows[] = $existing;
				continue;
			}

			$insert_rows[] = $this->operation_insert_row(
				$operation,
				$result,
				$offline_device_id,
				$device_public_id,
				$payload->batch_id(),
				$index + 1,
				$received_at_utc
			);

			if ( isset( $conflict_rows[ $operation->client_operation_id() ] ) ) {
				$conflict_inserts[] = $this->conflict_insert_row(
					$conflict_rows[ $operation->client_operation_id() ],
					$offline_device_id,
					$device_public_id,
					$payload->batch_id()
				);
			}
		}

		$audit_payload = array(
			'action'                 => 'offline_push_persistence_planned',
			'batch_id'               => $payload->batch_id(),
			'device_id'              => $payload->device_id(),
			'offline_device_id'      => $offline_device_id,
			'received_at_utc'        => $received_at_utc,
			'operation_insert_count' => count( $insert_rows ),
			'operation_replay_count' => count( $replay_rows ),
			'conflict_insert_count'  => count( $conflict_inserts ),
			'operation_ids'          => $this->operation_ids( $payload ),
		);

		return new OfflinePushPersistencePlan(
			$payload->batch_id(),
			$payload->device_id(),
			$offline_device_id,
			$insert_rows,
			$replay_rows,
			$conflict_inserts,
			$audit_payload
		);
	}

	/**
	 * @return array<string, array<string, mixed>>
	 */
	private function result_rows_by_operation( OfflinePushBatchResolutionPlan $resolution ): array {
		$rows = array();

		foreach ( $resolution->operation_result_rows() as $index => $row ) {
			$operation_id = trim( (string) ( $row['client_operation_id'] ?? '' ) );

			if ( '' === $operation_id ) {
				throw new InvalidArgumentException( "Operation result row {$index} is missing client_operation_id." );
			}

			$rows[ $operation_id ] = $row;
		}

		return $rows;
	}

	/**
	 * @return array<string, array<string, mixed>>
	 */
	private function conflict_rows_by_operation( OfflinePushBatchResolutionPlan $resolution ): array {
		$rows = array();

		foreach ( $resolution->conflict_rows() as $index => $row ) {
			$operation_id = trim( (string) ( $row['client_operation_id'] ?? '' ) );

			if ( '' === $operation_id ) {
				throw new InvalidArgumentException( "Conflict row {$index} is missing client_operation_id." );
			}

			$rows[ $operation_id ] = $row;
		}

		return $rows;
	}

	/**
	 * @param array<string, array<string, mixed>> $result_rows Result rows.
	 * @return array<string, mixed>
	 */
	private function result_row( OfflineOperationEnvelope $operation, array $result_rows ): array {
		if ( ! isset( $result_rows[ $operation->client_operation_id() ] ) ) {
			throw new InvalidArgumentException(
				"Operation result row is missing for {$operation->client_operation_id()}."
			);
		}

		return $result_rows[ $operation->client_operation_id() ];
	}

	/**
	 * @return array<string, mixed>
	 */
	private function operation_insert_row(
		OfflineOperationEnvelope $operation,
		array $result,
		int $offline_device_id,
		string $device_public_id,
		string $batch_id,
		int $sequence_number,
		string $received_at_utc
	): array {
		$details = $this->array_value( $result, 'details' );
		$status  = $this->required_string( $result, 'status' );
		$code    = $this->required_string( $result, 'code' );

		return array(
			'offline_device_id'   => $offline_device_id,
			'device_public_id'    => $device_public_id,
			'batch_id'            => $batch_id,
			'client_operation_id' => $operation->client_operation_id(),
			'sequence_number'     => $sequence_number,
			'operation_type'      => $operation->operation_type(),
			'domain'              => $operation->entity_type(),
			'action_name'         => $operation->operation_type(),
			'entity_type'         => $operation->entity_type(),
			'entity_id'           => $operation->entity_id(),
			'base_row_version'    => $operation->base_row_version(),
			'payload_json'        => $this->json( $operation->payload() ),
			'status'              => $status,
			'result_code'         => $code,
			'result_details_json' => $this->json( $details ),
			'conflict_id'         => $this->nullable_string( $details['conflict_id'] ?? null ),
			'received_at'         => $received_at_utc,
			'resolved_at'         => $this->required_utc_value( $result, 'processed_at_utc' ),
			'last_attempt_at'     => null,
			'next_retry_at'       => null,
			'row_version'         => 1,
		);
	}

	/**
	 * @param array<string, mixed> $conflict Conflict row.
	 * @return array<string, mixed>
	 */
	private function conflict_insert_row(
		array $conflict,
		int $offline_device_id,
		string $device_public_id,
		string $batch_id
	): array {
		return array(
			'conflict_id'             => $this->required_string( $conflict, 'conflict_id' ),
			'offline_queue_id'        => null,
			'offline_device_id'       => $offline_device_id,
			'device_public_id'        => $device_public_id,
			'batch_id'                => $batch_id,
			'client_operation_id'     => $this->required_string( $conflict, 'client_operation_id' ),
			'status'                  => $this->required_string( $conflict, 'status' ),
			'entity_type'             => $this->required_string( $conflict, 'entity_type' ),
			'entity_id'               => $this->required_string( $conflict, 'entity_id' ),
			'conflict_type'           => $this->required_string( $conflict, 'conflict_type' ),
			'severity'                => $this->required_string( $conflict, 'severity' ),
			'summary'                 => $this->required_string( $conflict, 'summary' ),
			'server_row_version'      => $conflict['server_row_version'] ?? null,
			'device_row_version'      => $conflict['device_row_version'] ?? null,
			'server_payload_json'     => $this->json( $this->array_value( $conflict, 'server_payload' ) ),
			'device_payload_json'     => $this->json( $this->array_value( $conflict, 'device_payload' ) ),
			'resolution_options_json' => $this->json( $this->list_value( $conflict, 'resolution_options' ) ),
			'resolution_action'       => null,
			'resolution_payload_json' => null,
			'manager_user_id'         => null,
			'detected_at'             => $this->required_utc_value( $conflict, 'detected_at_utc' ),
			'resolved_at'             => null,
			'updated_at'              => $this->required_utc_value( $conflict, 'updated_at_utc' ),
			'row_version'             => $this->positive_int_value( $conflict, 'row_version' ),
		);
	}

	/**
	 * @param array<string|int, mixed> $existing_rows Existing rows.
	 * @return array<string, mixed>|null
	 */
	private function existing_operation_row(
		OfflineOperationEnvelope $operation,
		array $existing_rows,
		int $index
	): ?array {
		$operation_id = $operation->client_operation_id();

		if ( array_key_exists( $operation_id, $existing_rows ) ) {
			$row = $existing_rows[ $operation_id ];
		} elseif ( array_key_exists( $index, $existing_rows ) ) {
			$row = $existing_rows[ $index ];
		} else {
			return null;
		}

		if ( ! is_array( $row ) ) {
			throw new InvalidArgumentException( "Existing operation row for {$operation_id} must be an object." );
		}

		return $row;
	}

	/**
	 * @param array<string, mixed> $result Result row.
	 * @param array<string, mixed> $existing Existing row.
	 */
	private function assert_existing_result_matches(
		OfflineOperationEnvelope $operation,
		array $result,
		array $existing
	): void {
		$operation_id = $operation->client_operation_id();

		if ( $operation_id !== (string) ( $existing['client_operation_id'] ?? '' ) ) {
			throw new InvalidArgumentException( "Existing operation row for {$operation_id} has the wrong ID." );
		}

		if ( (string) ( $existing['status'] ?? '' ) !== $this->required_string( $result, 'status' ) ) {
			throw new InvalidArgumentException( "Existing operation row for {$operation_id} has a different status." );
		}

		if ( (string) ( $existing['result_code'] ?? '' ) !== $this->required_string( $result, 'code' ) ) {
			throw new InvalidArgumentException( "Existing operation row for {$operation_id} has a different result code." );
		}
	}

	/**
	 * @param array<string, mixed> $device_row Device row.
	 */
	private function offline_device_id( array $device_row ): int {
		return $this->positive_int_value( $device_row, 'offline_device_id' );
	}

	/**
	 * @param array<string, mixed> $device_row Device row.
	 */
	private function device_public_id( array $device_row, string $expected_device_id ): string {
		$public_id = $this->required_string( $device_row, 'public_id' );

		if ( $public_id !== $expected_device_id ) {
			throw new InvalidArgumentException( 'Registered device public_id does not match push device_id.' );
		}

		return $public_id;
	}

	/**
	 * @param array<string, mixed> $row Row data.
	 */
	private function required_string( array $row, string $field ): string {
		$value = trim( (string) ( $row[ $field ] ?? '' ) );

		if ( '' === $value ) {
			throw new InvalidArgumentException( "{$field} is required." );
		}

		return $value;
	}

	/**
	 * @param array<string, mixed> $row Row data.
	 */
	private function required_utc_value( array $row, string $field ): string {
		$value = $this->required_string( $row, $field );

		if ( ! $this->is_utc_timestamp( $value ) ) {
			throw new InvalidArgumentException( "{$field} must be an ISO-8601 UTC timestamp." );
		}

		return $value;
	}

	/**
	 * @param array<string, mixed> $row Row data.
	 * @return array<string, mixed>
	 */
	private function array_value( array $row, string $field ): array {
		$value = $row[ $field ] ?? null;

		if ( ! is_array( $value ) ) {
			throw new InvalidArgumentException( "{$field} must be an object." );
		}

		return $value;
	}

	/**
	 * @param array<string, mixed> $row Row data.
	 * @return list<mixed>
	 */
	private function list_value( array $row, string $field ): array {
		$value = $row[ $field ] ?? null;

		if ( ! is_array( $value ) || array_values( $value ) !== $value ) {
			throw new InvalidArgumentException( "{$field} must be a list." );
		}

		return $value;
	}

	/**
	 * @param array<string, mixed> $row Row data.
	 */
	private function positive_int_value( array $row, string $field ): int {
		$value = $row[ $field ] ?? null;

		if ( is_int( $value ) && $value > 0 ) {
			return $value;
		}

		if ( is_string( $value ) && 1 === preg_match( '/^\d+$/', $value ) && (int) $value > 0 ) {
			return (int) $value;
		}

		throw new InvalidArgumentException( "{$field} must be a positive integer." );
	}

	private function nullable_string( mixed $value ): ?string {
		if ( null === $value || '' === $value ) {
			return null;
		}

		return trim( (string) $value );
	}

	/**
	 * @return list<string>
	 */
	private function operation_ids( OfflinePushPayload $payload ): array {
		return array_map(
			static fn ( OfflineOperationEnvelope $operation ): string => $operation->client_operation_id(),
			$payload->operations()
		);
	}

	/**
	 * @param mixed $value Value to encode.
	 */
	private function json( mixed $value ): string {
		if ( function_exists( 'wp_json_encode' ) ) {
			$json = wp_json_encode( $value, JSON_UNESCAPED_SLASHES );
		} else {
			$json = json_encode( $value, JSON_UNESCAPED_SLASHES );
		}

		if ( ! is_string( $json ) ) {
			throw new InvalidArgumentException( 'Unable to encode offline push persistence JSON.' );
		}

		return $json;
	}

	private function is_utc_timestamp( string $value ): bool {
		return 1 === preg_match( '/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d+)?Z$/', $value );
	}
}
