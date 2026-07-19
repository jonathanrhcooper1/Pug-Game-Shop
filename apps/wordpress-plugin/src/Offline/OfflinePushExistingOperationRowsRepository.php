<?php
/**
 * Offline push existing operation rows wpdb repository.
 *
 * @package TCGStorePlatform
 */

namespace TCGStorePlatform\Offline;

final class OfflinePushExistingOperationRowsRepository {
	private \wpdb $database;
	private OfflinePushExistingOperationRowsQueryBuilder $query_builder;

	public function __construct(
		\wpdb $database,
		?OfflinePushExistingOperationRowsQueryBuilder $query_builder = null
	) {
		$this->database      = $database;
		$this->query_builder = $query_builder ?? new OfflinePushExistingOperationRowsQueryBuilder();
	}

	public function fetch(
		OfflinePushExistingOperationRowsQueryPlan $query_plan
	): OfflinePushExistingOperationRowsRepositoryResult {
		$query_build = $this->query_builder->build( $query_plan );

		if ( ! $query_build->is_valid() ) {
			return OfflinePushExistingOperationRowsRepositoryResult::rejected(
				$query_build,
				$query_build->errors()
			);
		}

		$query        = $query_build->query();
		$prepared_sql = $this->database->prepare(
			$query['sql_template'], // phpcs:ignore WordPress.DB.PreparedSQL.NotPrepared
			$query['prepare_args']
		);
		$rows         = $this->get_results( $prepared_sql );

		if ( ! is_array( $rows ) ) {
			return OfflinePushExistingOperationRowsRepositoryResult::rejected(
				$query_build,
				array( 'existing_operation_rows_query_failed' )
			);
		}

		$existing_rows = array();
		$row_results   = array();

		foreach ( array_values( $rows ) as $index => $row ) {
			if ( ! is_array( $row ) ) {
				return OfflinePushExistingOperationRowsRepositoryResult::rejected(
					$query_build,
					array( "row_{$index}_invalid" ),
					$existing_rows,
					$row_results
				);
			}

			$normalized = $this->normalize_row( $query_build, $query, $row, $index, $errors );

			if ( null === $normalized || array() !== $errors ) {
				return OfflinePushExistingOperationRowsRepositoryResult::rejected(
					$query_build,
					array() !== $errors ? $errors : array( "row_{$index}_invalid" ),
					$existing_rows,
					$row_results
				);
			}

			$operation_id = $normalized['client_operation_id'];

			if ( isset( $existing_rows[ $operation_id ] ) ) {
				return OfflinePushExistingOperationRowsRepositoryResult::rejected(
					$query_build,
					array( $operation_id . '_existing_operation_row_duplicate' ),
					$existing_rows,
					$row_results
				);
			}

			$existing_rows[ $operation_id ] = $normalized;
			$row_results[]                  = $this->row_result( $normalized, $index );
		}

		return OfflinePushExistingOperationRowsRepositoryResult::fetched(
			$query_build,
			$existing_rows,
			$row_results
		);
	}

	/**
	 * @return list<array<string, mixed>>|false
	 */
	private function get_results( string $prepared_sql ): array|false {
		if ( method_exists( $this->database, 'get_results' ) ) {
			$rows = $this->database->get_results(
				$prepared_sql, // phpcs:ignore WordPress.DB.PreparedSQL.NotPrepared
				$this->array_a_output_type()
			);

			return is_array( $rows ) ? $rows : false;
		}

		if ( method_exists( $this->database, 'get_row' ) ) {
			$row = $this->database->get_row(
				$prepared_sql, // phpcs:ignore WordPress.DB.PreparedSQL.NotPrepared
				$this->array_a_output_type()
			);

			return is_array( $row ) ? array( $row ) : array();
		}

		return false;
	}

	/**
	 * @param array<string, mixed> $query Existing operation rows query.
	 * @param array<string, mixed> $row Database row.
	 * @param list<string>         $errors Row normalization errors.
	 * @return array<string, mixed>|null
	 */
	private function normalize_row(
		OfflinePushExistingOperationRowsQueryBuildPlan $query_build,
		array $query,
		array $row,
		int $index,
		?array &$errors
	): ?array {
		$errors = array();

		foreach ( $query['selected_columns'] as $column ) {
			if ( ! array_key_exists( $column, $row ) ) {
				$errors[] = "row_{$index}_{$column}_missing";
			}
		}

		if ( array() !== $errors ) {
			return null;
		}

		$operation_id      = $this->required_token( $row, 'client_operation_id', $index, $errors, 128 );
		$offline_queue_id  = $this->positive_int( $row['offline_queue_id'] ?? null );
		$offline_device_id = $this->positive_int( $row['offline_device_id'] ?? null );
		$device_public_id  = $this->required_token( $row, 'device_public_id', $index, $errors, 128 );
		$batch_id          = $this->required_token( $row, 'batch_id', $index, $errors, 128 );
		$sequence_number   = $this->positive_int( $row['sequence_number'] ?? null );
		$operation_type    = $this->required_token( $row, 'operation_type', $index, $errors, 128 );
		$domain            = $this->required_token( $row, 'domain', $index, $errors, 128 );
		$action_name       = $this->required_token( $row, 'action_name', $index, $errors, 128 );
		$entity_type       = $this->required_token( $row, 'entity_type', $index, $errors, 128 );
		$entity_id         = $this->required_token( $row, 'entity_id', $index, $errors, 191 );
		$status            = $this->required_token( $row, 'status', $index, $errors, 64 );
		$result_details    = $this->json_details( $row['result_details_json'] ?? null, $index, $errors );
		$received_at       = $this->required_timestamp( $row, 'received_at', $index, $errors );
		$resolved_at       = $this->nullable_timestamp( $row['resolved_at'] ?? null );
		$row_version       = $this->positive_int( $row['row_version'] ?? null );
		$base_row_version  = $this->nullable_non_negative_int( $row['base_row_version'] ?? null );
		$result_code       = $this->nullable_token( $row['result_code'] ?? null, 128 );
		$conflict_id       = $this->nullable_token( $row['conflict_id'] ?? null, 128 );

		if ( null === $offline_queue_id ) {
			$errors[] = "row_{$index}_offline_queue_id_invalid";
		}

		if ( null === $offline_device_id || $offline_device_id !== $query_build->offline_device_id() ) {
			$errors[] = "row_{$index}_offline_device_id_mismatch";
		}

		if ( $device_public_id !== $query_build->device_id() ) {
			$errors[] = "row_{$index}_device_public_id_mismatch";
		}

		if ( ! in_array( $operation_id, $query['operation_ids'], true ) ) {
			$errors[] = "row_{$index}_client_operation_id_unexpected";
		}

		if ( null === $sequence_number ) {
			$errors[] = "row_{$index}_sequence_number_invalid";
		}

		if ( null === $resolved_at && null !== ( $row['resolved_at'] ?? null ) && '' !== (string) ( $row['resolved_at'] ?? '' ) ) {
			$errors[] = "row_{$index}_resolved_at_invalid";
		}

		if ( null === $row_version ) {
			$errors[] = "row_{$index}_row_version_invalid";
		}

		if ( null === $base_row_version && null !== ( $row['base_row_version'] ?? null ) && '' !== (string) ( $row['base_row_version'] ?? '' ) ) {
			$errors[] = "row_{$index}_base_row_version_invalid";
		}

		if ( null === $result_code && null !== ( $row['result_code'] ?? null ) && '' !== (string) ( $row['result_code'] ?? '' ) ) {
			$errors[] = "row_{$index}_result_code_invalid";
		}

		if ( null === $conflict_id && null !== ( $row['conflict_id'] ?? null ) && '' !== (string) ( $row['conflict_id'] ?? '' ) ) {
			$errors[] = "row_{$index}_conflict_id_invalid";
		}

		if ( array() !== $errors ) {
			return null;
		}

		return array(
			'offline_queue_id'    => $offline_queue_id,
			'offline_device_id'   => $offline_device_id,
			'device_public_id'    => $device_public_id,
			'batch_id'            => $batch_id,
			'client_operation_id' => $operation_id,
			'sequence_number'     => $sequence_number,
			'operation_type'      => $operation_type,
			'domain'              => $domain,
			'action_name'         => $action_name,
			'entity_type'         => $entity_type,
			'entity_id'           => $entity_id,
			'base_row_version'    => $base_row_version,
			'status'              => $status,
			'result_code'         => $result_code,
			'result_details'      => $result_details,
			'conflict_id'         => $conflict_id,
			'received_at'         => $received_at,
			'resolved_at'         => $resolved_at,
			'row_version'         => $row_version,
		);
	}

	/**
	 * @param array<string, mixed> $row Existing operation row.
	 * @return array<string, mixed>
	 */
	private function row_result( array $row, int $index ): array {
		return array(
			'client_operation_id'            => $row['client_operation_id'],
			'row_index'                      => $index,
			'offline_queue_id'               => $row['offline_queue_id'],
			'status'                         => $row['status'],
			'has_result_code'                => null !== $row['result_code'],
			'has_conflict_id'                => null !== $row['conflict_id'],
			'row_version'                    => $row['row_version'],
			'route_connected_reads_deferred' => true,
			'queue_replay_deferred'          => true,
			'canonical_mutations_deferred'   => true,
		);
	}

	/**
	 * @param array<string, mixed> $row Row data.
	 * @param list<string>         $errors Row normalization errors.
	 */
	private function required_token(
		array $row,
		string $field,
		int $index,
		array &$errors,
		int $max_length
	): string {
		$value = trim( (string) ( $row[ $field ] ?? '' ) );

		if ( ! $this->is_token( $value, $max_length ) ) {
			$errors[] = "row_{$index}_{$field}_invalid";
		}

		return $value;
	}

	private function nullable_token( mixed $value, int $max_length ): ?string {
		if ( null === $value || '' === $value ) {
			return null;
		}

		$value = trim( (string) $value );

		return $this->is_token( $value, $max_length ) ? $value : null;
	}

	/**
	 * @param list<string> $errors Row normalization errors.
	 * @return array<string, mixed>
	 */
	private function json_details( mixed $value, int $index, array &$errors ): array {
		if ( null === $value || '' === $value ) {
			return array();
		}

		if ( is_array( $value ) ) {
			return $value;
		}

		$decoded = json_decode( (string) $value, true );

		if ( ! is_array( $decoded ) ) {
			$errors[] = "row_{$index}_result_details_json_invalid";

			return array();
		}

		return $decoded;
	}

	/**
	 * @param array<string, mixed> $row Row data.
	 * @param list<string>         $errors Row normalization errors.
	 */
	private function required_timestamp(
		array $row,
		string $field,
		int $index,
		array &$errors
	): string {
		$value = $this->nullable_timestamp( $row[ $field ] ?? null );

		if ( null === $value ) {
			$errors[] = "row_{$index}_{$field}_invalid";

			return '';
		}

		return $value;
	}

	private function nullable_timestamp( mixed $value ): ?string {
		$value = trim( (string) ( $value ?? '' ) );

		if ( '' === $value ) {
			return null;
		}

		if ( 1 === preg_match( '/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d+)?Z$/', $value ) ) {
			return $value;
		}

		if ( 1 === preg_match( '/^\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}(?:\.\d+)?$/', $value ) ) {
			return str_replace( ' ', 'T', $value ) . 'Z';
		}

		return null;
	}

	private function positive_int( mixed $value ): ?int {
		$integer = $this->nullable_non_negative_int( $value );

		return null !== $integer && 0 < $integer ? $integer : null;
	}

	private function nullable_non_negative_int( mixed $value ): ?int {
		if ( null === $value || '' === $value ) {
			return null;
		}

		if ( is_int( $value ) && 0 <= $value ) {
			return $value;
		}

		if ( is_string( $value ) && 1 === preg_match( '/^\d+$/', $value ) && 0 <= (int) $value ) {
			return (int) $value;
		}

		return null;
	}

	private function is_token( string $value, int $max_length ): bool {
		return '' !== $value
			&& strlen( $value ) <= $max_length
			&& 1 === preg_match( '/^[a-zA-Z0-9._:-]+$/', $value );
	}

	private function array_a_output_type(): string {
		if ( defined( 'ARRAY_A' ) ) {
			return ARRAY_A;
		}

		return 'ARRAY_A';
	}
}
