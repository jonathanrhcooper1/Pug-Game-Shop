<?php
/**
 * Offline pull change wpdb repository adapter.
 *
 * @package TCGStorePlatform
 */

namespace TCGStorePlatform\Offline;

final class OfflinePullChangeRepository {
	private \wpdb $database;
	private OfflinePullChangeQueryBuilder $query_builder;

	public function __construct(
		\wpdb $database,
		?OfflinePullChangeQueryBuilder $query_builder = null
	) {
		$this->database      = $database;
		$this->query_builder = $query_builder ?? new OfflinePullChangeQueryBuilder();
	}

	public function fetch(
		OfflinePullChangeQueryPlan $change_query_plan
	): OfflinePullChangeRepositoryResult {
		$query_plan = $this->query_builder->build( $change_query_plan );

		if ( ! $query_plan->is_valid() ) {
			return OfflinePullChangeRepositoryResult::rejected(
				$query_plan,
				$query_plan->errors()
			);
		}

		$change_sets   = array();
		$domain_audits = array();

		foreach ( $query_plan->domain_queries() as $domain => $domain_query ) {
			$prepared_sql = $this->database->prepare(
				$domain_query['sql_template'], // phpcs:ignore WordPress.DB.PreparedSQL.NotPrepared
				$domain_query['prepare_args']
			);
			$rows         = $this->get_results( $prepared_sql );

			if ( ! is_array( $rows ) ) {
				return OfflinePullChangeRepositoryResult::rejected(
					$query_plan,
					array( $domain . '_query_failed' ),
					$domain_audits
				);
			}

			$records = $this->records( (string) $domain, $domain_query, $rows, $errors );

			if ( array() !== $errors ) {
				return OfflinePullChangeRepositoryResult::rejected(
					$query_plan,
					$errors,
					$domain_audits
				);
			}

			$change_sets[ $domain ]   = array(
				'cursor'     => $domain_query['cursor_after'],
				'has_more'   => (int) $domain_query['limit'] <= count( $records ),
				'data'       => $records,
				'tombstones' => array(),
			);
			$domain_audits[ $domain ] = array(
				'domain'                    => $domain,
				'table_name'                => $domain_query['table_name'],
				'row_count'                 => count( $records ),
				'prepare_arg_count'         => count( $domain_query['prepare_args'] ),
				'cursor_filter_deferred'    => true,
				'cursor_advance_deferred'   => true,
				'tombstone_read_deferred'   => true,
				'route_connection_deferred' => true,
			);
		}

		return OfflinePullChangeRepositoryResult::fetched(
			$query_plan,
			$change_sets,
			$domain_audits
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
	 * @param array<string, mixed>        $domain_query Domain SQL query plan.
	 * @param list<array<string, mixed>> $rows Database rows.
	 * @param list<string>               $errors Row normalization errors.
	 * @return list<array<string, mixed>>
	 */
	private function records( string $domain, array $domain_query, array $rows, ?array &$errors ): array {
		$errors  = array();
		$records = array();

		foreach ( array_values( $rows ) as $index => $row ) {
			if ( ! is_array( $row ) ) {
				$errors[] = $domain . '_row_' . $index . '_invalid';
				continue;
			}

			$record = $this->record( $domain, $domain_query, $row, $index, $errors );

			if ( null !== $record ) {
				$records[] = $record;
			}
		}

		return $records;
	}

	/**
	 * @param array<string, mixed> $domain_query Domain SQL query plan.
	 * @param array<string, mixed> $row Database row.
	 * @param list<string>         $errors Row normalization errors.
	 * @return array<string, mixed>|null
	 */
	private function record(
		string $domain,
		array $domain_query,
		array $row,
		int $index,
		array &$errors
	): ?array {
		$entity_id      = $this->entity_id( $domain_query, $row );
		$row_version    = $this->positive_int( $row['row_version'] ?? ( $row['setting_version'] ?? null ) );
		$updated_at_utc = $this->utc_timestamp( $row['updated_at'] ?? null );
		$payload        = $this->payload( $domain, $domain_query, $row, $index, $errors );

		if ( null === $entity_id ) {
			$errors[] = $domain . '_row_' . $index . '_entity_id_invalid';
		}

		if ( null === $row_version ) {
			$errors[] = $domain . '_row_' . $index . '_row_version_invalid';
		}

		if ( null === $updated_at_utc ) {
			$errors[] = $domain . '_row_' . $index . '_updated_at_invalid';
		}

		if ( null === $entity_id || null === $row_version || null === $updated_at_utc ) {
			return null;
		}

		return array(
			'entity_type'    => $domain_query['entity_type'],
			'entity_id'      => $entity_id,
			'row_version'    => $row_version,
			'updated_at_utc' => $updated_at_utc,
			'payload'        => $payload,
		);
	}

	/**
	 * @param array<string, mixed> $domain_query Domain SQL query plan.
	 * @param array<string, mixed> $row Database row.
	 * @param list<string>         $errors Row normalization errors.
	 * @return array<string, mixed>
	 */
	private function payload(
		string $domain,
		array $domain_query,
		array $row,
		int $index,
		array &$errors
	): array {
		$payload = array();

		foreach ( $domain_query['payload_fields'] as $field ) {
			if ( ! array_key_exists( $field, $row ) ) {
				$errors[] = $domain . '_row_' . $index . '_' . $field . '_missing';
				continue;
			}

			$payload[ $field ] = $row[ $field ];
		}

		return $payload;
	}

	/**
	 * @param array<string, mixed> $domain_query Domain SQL query plan.
	 * @param array<string, mixed> $row Database row.
	 */
	private function entity_id( array $domain_query, array $row ): ?string {
		$candidates = array(
			'public_id',
			'conflict_id',
			'setting_key',
			$domain_query['row_id_column'],
		);

		foreach ( $candidates as $candidate ) {
			if ( ! array_key_exists( $candidate, $row ) ) {
				continue;
			}

			$value = trim( (string) $row[ $candidate ] );

			return '' !== $value && $this->is_entity_id( $value ) ? $value : null;
		}

		return null;
	}

	private function positive_int( mixed $value ): ?int {
		if ( is_int( $value ) && 0 < $value ) {
			return $value;
		}

		if ( is_string( $value ) && 1 === preg_match( '/^\d+$/', $value ) && 0 < (int) $value ) {
			return (int) $value;
		}

		return null;
	}

	private function utc_timestamp( mixed $value ): ?string {
		$value = trim( (string) $value );

		if ( 1 === preg_match( '/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d+)?Z$/', $value ) ) {
			return $value;
		}

		if ( 1 === preg_match( '/^\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}(?:\.\d+)?$/', $value ) ) {
			return str_replace( ' ', 'T', $value ) . 'Z';
		}

		return null;
	}

	private function is_entity_id( string $value ): bool {
		return 1 === preg_match( '/^[a-zA-Z0-9._:-]{1,128}$/', $value );
	}

	private function array_a_output_type(): string {
		if ( defined( 'ARRAY_A' ) ) {
			return ARRAY_A;
		}

		return 'ARRAY_A';
	}
}
