<?php
/**
 * Offline push server snapshot wpdb repository.
 *
 * @package TCGStorePlatform
 */

namespace TCGStorePlatform\Offline;

final class OfflinePushServerSnapshotRepository {
	private \wpdb $database;
	private OfflinePushServerSnapshotQueryBuilder $query_builder;

	public function __construct(
		\wpdb $database,
		?OfflinePushServerSnapshotQueryBuilder $query_builder = null
	) {
		$this->database      = $database;
		$this->query_builder = $query_builder ?? new OfflinePushServerSnapshotQueryBuilder();
	}

	public function fetch(
		OfflinePushServerSnapshotQueryPlan $query_plan
	): OfflinePushServerSnapshotRepositoryResult {
		$query_build = $this->query_builder->build( $query_plan );

		if ( ! $query_build->is_valid() ) {
			return OfflinePushServerSnapshotRepositoryResult::rejected(
				$query_build,
				$query_build->errors()
			);
		}

		$server_snapshots    = array();
		$operation_snapshots = array();
		$fetch_results       = array();
		$query_index         = 0;

		foreach ( $query_build->operation_queries() as $operation_query ) {
			$operation_id = (string) ( $operation_query['client_operation_id'] ?? 'unknown' );
			$entity_key   = (string) ( $operation_query['entity_key'] ?? '' );
			$row          = $this->fetch_row( $operation_query );

			if ( false === $row ) {
				return OfflinePushServerSnapshotRepositoryResult::rejected(
					$query_build,
					array( $operation_id . '_snapshot_query_failed' ),
					$server_snapshots,
					$operation_snapshots,
					$fetch_results
				);
			}

			if ( null === $row ) {
				$fetch_results[] = $this->fetch_result( $operation_query, $query_index, false );

				return OfflinePushServerSnapshotRepositoryResult::rejected(
					$query_build,
					array( $operation_id . '_snapshot_not_found' ),
					$server_snapshots,
					$operation_snapshots,
					$fetch_results
				);
			}

			$snapshot = $this->snapshot( $operation_query, $row, $errors );

			if ( null === $snapshot || array() !== $errors ) {
				$fetch_results[] = $this->fetch_result( $operation_query, $query_index, true );

				return OfflinePushServerSnapshotRepositoryResult::rejected(
					$query_build,
					array() !== $errors ? $errors : array( $operation_id . '_snapshot_invalid' ),
					$server_snapshots,
					$operation_snapshots,
					$fetch_results
				);
			}

			$operation_snapshots[ $operation_id ] = $snapshot;
			$server_snapshots[ $operation_id ]    = $snapshot;

			if ( '' !== $entity_key ) {
				$server_snapshots[ $entity_key ] = $snapshot;
			}

			$fetch_results[] = $this->fetch_result( $operation_query, $query_index, true );
			++$query_index;
		}

		return OfflinePushServerSnapshotRepositoryResult::fetched(
			$query_build,
			$server_snapshots,
			$operation_snapshots,
			$fetch_results
		);
	}

	/**
	 * @param array<string, mixed> $operation_query Prepared operation query.
	 * @return array<string, mixed>|null|false
	 */
	private function fetch_row( array $operation_query ): array|null|false {
		if ( ! method_exists( $this->database, 'get_row' ) ) {
			return false;
		}

		$prepared_sql = $this->database->prepare(
			$operation_query['sql_template'], // phpcs:ignore WordPress.DB.PreparedSQL.NotPrepared
			$operation_query['prepare_args']
		);
		$row          = $this->database->get_row(
			$prepared_sql, // phpcs:ignore WordPress.DB.PreparedSQL.NotPrepared
			$this->array_a_output_type()
		);

		if ( null === $row ) {
			return null;
		}

		return is_array( $row ) ? $row : false;
	}

	/**
	 * @param array<string, mixed> $operation_query Prepared operation query.
	 * @param array<string, mixed> $row Database row.
	 * @param list<string>         $errors Row normalization errors.
	 * @return array<string, mixed>|null
	 */
	private function snapshot( array $operation_query, array $row, ?array &$errors ): ?array {
		$errors       = array();
		$operation_id = (string) ( $operation_query['client_operation_id'] ?? 'unknown' );
		$section      = (string) ( $operation_query['snapshot_section'] ?? '' );
		$entity_id    = (string) ( $operation_query['entity_id'] ?? '' );
		$public_id    = trim( (string) ( $row['public_id'] ?? '' ) );

		if ( '' === $section ) {
			$errors[] = $operation_id . '_snapshot_section_invalid';
		}

		if ( $entity_id !== $public_id ) {
			$errors[] = $operation_id . '_public_id_mismatch';
		}

		$payload = $this->payload( $operation_query, $row, $operation_id, $errors );

		foreach ( $this->derived_fields( $operation_query, $row, $operation_id, $errors ) as $field => $value ) {
			$payload[ $field ] = $value;
		}

		if ( array() !== $errors ) {
			return null;
		}

		return array(
			$section => $payload,
		);
	}

	/**
	 * @param array<string, mixed> $operation_query Prepared operation query.
	 * @param array<string, mixed> $row Database row.
	 * @param list<string>         $errors Row normalization errors.
	 * @return array<string, mixed>
	 */
	private function payload(
		array $operation_query,
		array $row,
		string $operation_id,
		array &$errors
	): array {
		$payload = array();

		foreach ( $operation_query['payload_fields'] as $field ) {
			if ( ! array_key_exists( $field, $row ) ) {
				$errors[] = $operation_id . '_' . $field . '_missing';
				continue;
			}

			$value = $this->normalized_value( (string) $field, $row[ $field ] );

			if ( null === $value && $this->requires_non_negative_int( (string) $field ) ) {
				$errors[] = $operation_id . '_' . $field . '_invalid';
				continue;
			}

			$payload[ $field ] = $value;
		}

		return $payload;
	}

	/**
	 * @param array<string, mixed> $operation_query Prepared operation query.
	 * @param array<string, mixed> $row Database row.
	 * @param list<string>         $errors Row normalization errors.
	 * @return array<string, mixed>
	 */
	private function derived_fields(
		array $operation_query,
		array $row,
		string $operation_id,
		array &$errors
	): array {
		$derived = array();

		foreach ( $operation_query['derived_fields'] as $field => $rule ) {
			if ( 'player_cap_minus_registered_count' === $rule ) {
				$player_cap       = $this->non_negative_int( $row['player_cap'] ?? null );
				$registered_count = $this->non_negative_int( $row['registered_count'] ?? null );

				if ( null === $player_cap || null === $registered_count ) {
					$errors[] = $operation_id . '_event_capacity_invalid';
					continue;
				}

				$derived[ $field ] = max( 0, $player_cap - $registered_count );
				continue;
			}

			if ( 'credit_balance_decimal_to_minor_units' === $rule ) {
				$minor_units = $this->decimal_to_minor_units( $row['credit_balance'] ?? null );

				if ( null === $minor_units ) {
					$errors[] = $operation_id . '_credit_balance_invalid';
					continue;
				}

				$derived[ $field ] = $minor_units;
				continue;
			}

			$errors[] = $operation_id . '_derived_field_unsupported';
		}

		return $derived;
	}

	/**
	 * @param array<string, mixed> $operation_query Prepared operation query.
	 * @return array<string, mixed>
	 */
	private function fetch_result( array $operation_query, int $index, bool $row_found ): array {
		return array(
			'client_operation_id'            => (string) ( $operation_query['client_operation_id'] ?? '' ),
			'operation_query_index'          => $index,
			'entity_key'                     => (string) ( $operation_query['entity_key'] ?? '' ),
			'domain'                         => (string) ( $operation_query['domain'] ?? '' ),
			'table_name'                     => (string) ( $operation_query['table_name'] ?? '' ),
			'snapshot_section'               => (string) ( $operation_query['snapshot_section'] ?? '' ),
			'row_found'                      => $row_found,
			'prepare_arg_count'              => count( $operation_query['prepare_args'] ?? array() ),
			'payload_field_count'            => count( $operation_query['payload_fields'] ?? array() ),
			'derived_field_count'            => count( $operation_query['derived_fields'] ?? array() ),
			'route_connected_reads_deferred' => true,
			'canonical_mutations_deferred'   => true,
		);
	}

	private function normalized_value( string $field, mixed $value ): mixed {
		if ( $this->requires_non_negative_int( $field ) ) {
			return $this->non_negative_int( $value );
		}

		if ( in_array( $field, array( 'waitlist_enabled', 'topdeck_enabled' ), true ) ) {
			return $this->bool_value( $value );
		}

		return $value;
	}

	private function requires_non_negative_int( string $field ): bool {
		return in_array( $field, array( 'row_version', 'credit_version', 'player_cap', 'registered_count' ), true );
	}

	private function non_negative_int( mixed $value ): ?int {
		if ( is_int( $value ) && 0 <= $value ) {
			return $value;
		}

		if ( is_string( $value ) && 1 === preg_match( '/^\d+$/', $value ) ) {
			return (int) $value;
		}

		return null;
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

	private function decimal_to_minor_units( mixed $value ): ?int {
		$value = trim( (string) $value );

		if ( 1 !== preg_match( '/^\d+(?:\.\d{1,2})?$/', $value ) ) {
			return null;
		}

		$parts   = explode( '.', $value, 2 );
		$dollars = (int) $parts[0];
		$cents   = str_pad( $parts[1] ?? '0', 2, '0' );

		return $dollars * 100 + (int) $cents;
	}

	private function array_a_output_type(): string {
		if ( defined( 'ARRAY_A' ) ) {
			return ARRAY_A;
		}

		return 'ARRAY_A';
	}
}
