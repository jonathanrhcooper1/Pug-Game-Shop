<?php
/**
 * Offline push persistence SQL builder.
 *
 * @package TCGStorePlatform
 */

namespace TCGStorePlatform\Offline;

use DateTimeImmutable;
use DateTimeZone;
use Exception;

final class OfflinePushPersistenceQueryBuilder {
	private const QUEUE_TABLE          = 'tcg_offline_sync_queue';
	private const CONFLICT_TABLE       = 'tcg_sync_conflicts';
	private const QUEUE_COLUMNS        = array(
		'offline_device_id',
		'device_public_id',
		'batch_id',
		'client_operation_id',
		'sequence_number',
		'operation_type',
		'domain',
		'action_name',
		'entity_type',
		'entity_id',
		'base_row_version',
		'payload_json',
		'status',
		'result_code',
		'result_details_json',
		'conflict_id',
		'received_at',
		'resolved_at',
		'last_attempt_at',
		'next_retry_at',
		'row_version',
	);
	private const CONFLICT_COLUMNS     = array(
		'conflict_id',
		'offline_queue_id',
		'offline_device_id',
		'device_public_id',
		'batch_id',
		'client_operation_id',
		'status',
		'entity_type',
		'entity_id',
		'conflict_type',
		'severity',
		'summary',
		'server_row_version',
		'device_row_version',
		'server_payload_json',
		'device_payload_json',
		'resolution_options_json',
		'resolution_action',
		'resolution_payload_json',
		'manager_user_id',
		'detected_at',
		'resolved_at',
		'updated_at',
		'row_version',
	);
	private const QUEUE_STATUSES       = array( 'accepted', 'conflict', 'rejected', 'queued', 'retry' );
	private const CONFLICT_STATUSES    = array( 'open', 'resolved', 'dismissed', 'retry_requested' );
	private const CONFLICT_SEVERITIES  = array( 'blocking', 'warning', 'info' );
	private const SUPPORTED_DOMAINS    = array( 'inventory', 'event', 'customer_credit' );
	private const SUPPORTED_OPERATIONS = array( 'inventory_reservation', 'event_reservation', 'credit_redemption' );

	public function build(
		OfflinePushPersistencePlan $persistence_plan,
		string $table_prefix
	): OfflinePushPersistenceQueryBuildPlan {
		$errors       = array();
		$table_prefix = trim( $table_prefix );

		if ( '' === $table_prefix || 1 !== preg_match( '/^[A-Za-z0-9_]+$/', $table_prefix ) ) {
			$errors[] = 'table_prefix_invalid';
		}

		$queue_table    = '' === $table_prefix ? '' : $table_prefix . self::QUEUE_TABLE;
		$conflict_table = '' === $table_prefix ? '' : $table_prefix . self::CONFLICT_TABLE;

		$operation_queries = array();
		foreach ( $persistence_plan->operation_insert_rows() as $index => $row ) {
			$row_errors = $this->validate_operation_row( $row, $index );

			if ( array() !== $row_errors ) {
				$errors = array_merge( $errors, $row_errors );
				continue;
			}

			$operation_queries[] = $this->operation_query_for_row( $queue_table, $row );
		}

		$conflict_queries = array();
		foreach ( $persistence_plan->conflict_insert_rows() as $index => $row ) {
			$row_errors = $this->validate_conflict_row( $row, $index );

			if ( array() !== $row_errors ) {
				$errors = array_merge( $errors, $row_errors );
				continue;
			}

			$conflict_queries[] = $this->conflict_query_for_row( $conflict_table, $row );
		}

		if ( array() !== $errors ) {
			return OfflinePushPersistenceQueryBuildPlan::rejected(
				$persistence_plan,
				$queue_table,
				$conflict_table,
				$errors
			);
		}

		return OfflinePushPersistenceQueryBuildPlan::accepted(
			$persistence_plan,
			$queue_table,
			$conflict_table,
			$operation_queries,
			$conflict_queries
		);
	}

	/**
	 * @param array<string, mixed> $row Queue row.
	 * @return list<string>
	 */
	private function validate_operation_row( array $row, int $index ): array {
		$errors = array();

		if ( null === $this->positive_int( $row['offline_device_id'] ?? null ) ) {
			$errors[] = 'operation_row_' . $index . '_offline_device_id_invalid';
		}

		foreach ( array( 'device_public_id', 'batch_id', 'client_operation_id' ) as $field ) {
			if ( ! $this->is_identifier( (string) ( $row[ $field ] ?? '' ), 8, 128 ) ) {
				$errors[] = 'operation_row_' . $index . '_' . $field . '_invalid';
			}
		}

		if ( null === $this->positive_int( $row['sequence_number'] ?? null ) ) {
			$errors[] = 'operation_row_' . $index . '_sequence_number_invalid';
		}

		if ( ! in_array( (string) ( $row['operation_type'] ?? '' ), self::SUPPORTED_OPERATIONS, true ) ) {
			$errors[] = 'operation_row_' . $index . '_operation_type_invalid';
		}

		if ( ! in_array( (string) ( $row['domain'] ?? '' ), self::SUPPORTED_DOMAINS, true ) ) {
			$errors[] = 'operation_row_' . $index . '_domain_invalid';
		}

		if ( ! $this->is_slug( (string) ( $row['action_name'] ?? '' ), 1, 64 ) ) {
			$errors[] = 'operation_row_' . $index . '_action_name_invalid';
		}

		if ( ! $this->is_slug( (string) ( $row['entity_type'] ?? '' ), 1, 64 ) ) {
			$errors[] = 'operation_row_' . $index . '_entity_type_invalid';
		}

		if ( ! $this->is_identifier( (string) ( $row['entity_id'] ?? '' ), 1, 191 ) ) {
			$errors[] = 'operation_row_' . $index . '_entity_id_invalid';
		}

		if ( null !== ( $row['base_row_version'] ?? null ) && null === $this->non_negative_int( $row['base_row_version'] ) ) {
			$errors[] = 'operation_row_' . $index . '_base_row_version_invalid';
		}

		if ( ! $this->is_json_string( $row['payload_json'] ?? null ) ) {
			$errors[] = 'operation_row_' . $index . '_payload_json_invalid';
		}

		if ( ! in_array( (string) ( $row['status'] ?? '' ), self::QUEUE_STATUSES, true ) ) {
			$errors[] = 'operation_row_' . $index . '_status_invalid';
		}

		if ( null !== ( $row['result_code'] ?? null ) && ! $this->is_slug( (string) $row['result_code'], 1, 100 ) ) {
			$errors[] = 'operation_row_' . $index . '_result_code_invalid';
		}

		if ( null !== ( $row['result_details_json'] ?? null ) && ! $this->is_json_string( $row['result_details_json'] ) ) {
			$errors[] = 'operation_row_' . $index . '_result_details_json_invalid';
		}

		if ( null !== ( $row['conflict_id'] ?? null ) && ! $this->is_identifier( (string) $row['conflict_id'], 8, 64 ) ) {
			$errors[] = 'operation_row_' . $index . '_conflict_id_invalid';
		}

		foreach ( array( 'received_at', 'resolved_at', 'last_attempt_at', 'next_retry_at' ) as $field ) {
			if ( null !== ( $row[ $field ] ?? null ) && null === $this->mysql_datetime_utc( (string) $row[ $field ] ) ) {
				$errors[] = 'operation_row_' . $index . '_' . $field . '_invalid';
			}
		}

		if ( null === ( $row['received_at'] ?? null ) ) {
			$errors[] = 'operation_row_' . $index . '_received_at_invalid';
		}

		if ( null === $this->positive_int( $row['row_version'] ?? null ) ) {
			$errors[] = 'operation_row_' . $index . '_row_version_invalid';
		}

		return $errors;
	}

	/**
	 * @param array<string, mixed> $row Conflict row.
	 * @return list<string>
	 */
	private function validate_conflict_row( array $row, int $index ): array {
		$errors = array();

		foreach ( array( 'conflict_id', 'device_public_id', 'batch_id', 'client_operation_id' ) as $field ) {
			if ( ! $this->is_identifier( (string) ( $row[ $field ] ?? '' ), 8, 128 ) ) {
				$errors[] = 'conflict_row_' . $index . '_' . $field . '_invalid';
			}
		}

		if ( null !== ( $row['offline_queue_id'] ?? null ) && null === $this->positive_int( $row['offline_queue_id'] ) ) {
			$errors[] = 'conflict_row_' . $index . '_offline_queue_id_invalid';
		}

		if ( null !== ( $row['offline_device_id'] ?? null ) && null === $this->positive_int( $row['offline_device_id'] ) ) {
			$errors[] = 'conflict_row_' . $index . '_offline_device_id_invalid';
		}

		if ( ! in_array( (string) ( $row['status'] ?? '' ), self::CONFLICT_STATUSES, true ) ) {
			$errors[] = 'conflict_row_' . $index . '_status_invalid';
		}

		if ( ! $this->is_slug( (string) ( $row['entity_type'] ?? '' ), 1, 64 ) ) {
			$errors[] = 'conflict_row_' . $index . '_entity_type_invalid';
		}

		if ( ! $this->is_identifier( (string) ( $row['entity_id'] ?? '' ), 1, 191 ) ) {
			$errors[] = 'conflict_row_' . $index . '_entity_id_invalid';
		}

		if ( ! $this->is_slug( (string) ( $row['conflict_type'] ?? '' ), 1, 100 ) ) {
			$errors[] = 'conflict_row_' . $index . '_conflict_type_invalid';
		}

		if ( ! in_array( (string) ( $row['severity'] ?? '' ), self::CONFLICT_SEVERITIES, true ) ) {
			$errors[] = 'conflict_row_' . $index . '_severity_invalid';
		}

		if ( ! is_string( $row['summary'] ?? null ) || '' === trim( (string) $row['summary'] ) || strlen( trim( (string) $row['summary'] ) ) > 255 ) {
			$errors[] = 'conflict_row_' . $index . '_summary_invalid';
		}

		foreach ( array( 'server_row_version', 'device_row_version' ) as $field ) {
			if ( null !== ( $row[ $field ] ?? null ) && null === $this->non_negative_int( $row[ $field ] ) ) {
				$errors[] = 'conflict_row_' . $index . '_' . $field . '_invalid';
			}
		}

		foreach ( array( 'server_payload_json', 'device_payload_json', 'resolution_options_json' ) as $field ) {
			if ( ! $this->is_json_string( $row[ $field ] ?? null ) ) {
				$errors[] = 'conflict_row_' . $index . '_' . $field . '_invalid';
			}
		}

		if ( null !== ( $row['resolution_action'] ?? null ) && ! $this->is_slug( (string) $row['resolution_action'], 1, 64 ) ) {
			$errors[] = 'conflict_row_' . $index . '_resolution_action_invalid';
		}

		if ( null !== ( $row['resolution_payload_json'] ?? null ) && ! $this->is_json_string( $row['resolution_payload_json'] ) ) {
			$errors[] = 'conflict_row_' . $index . '_resolution_payload_json_invalid';
		}

		if ( null !== ( $row['manager_user_id'] ?? null ) && null === $this->positive_int( $row['manager_user_id'] ) ) {
			$errors[] = 'conflict_row_' . $index . '_manager_user_id_invalid';
		}

		foreach ( array( 'detected_at', 'resolved_at', 'updated_at' ) as $field ) {
			if ( null !== ( $row[ $field ] ?? null ) && null === $this->mysql_datetime_utc( (string) $row[ $field ] ) ) {
				$errors[] = 'conflict_row_' . $index . '_' . $field . '_invalid';
			}
		}

		if ( null === ( $row['detected_at'] ?? null ) ) {
			$errors[] = 'conflict_row_' . $index . '_detected_at_invalid';
		}

		if ( null === ( $row['updated_at'] ?? null ) ) {
			$errors[] = 'conflict_row_' . $index . '_updated_at_invalid';
		}

		if ( null === $this->positive_int( $row['row_version'] ?? null ) ) {
			$errors[] = 'conflict_row_' . $index . '_row_version_invalid';
		}

		return $errors;
	}

	/**
	 * @param array<string, mixed> $row Queue row.
	 * @return array<string, mixed>
	 */
	private function operation_query_for_row( string $table_name, array $row ): array {
		$prepare_args = array();
		$placeholders = array(
			$this->value_placeholder( $row['offline_device_id'], '%d', $prepare_args ),
			$this->value_placeholder( $row['device_public_id'], '%s', $prepare_args ),
			$this->value_placeholder( $row['batch_id'], '%s', $prepare_args ),
			$this->value_placeholder( $row['client_operation_id'], '%s', $prepare_args ),
			$this->value_placeholder( $row['sequence_number'], '%d', $prepare_args ),
			$this->value_placeholder( $row['operation_type'], '%s', $prepare_args ),
			$this->value_placeholder( $row['domain'], '%s', $prepare_args ),
			$this->value_placeholder( $row['action_name'], '%s', $prepare_args ),
			$this->value_placeholder( $row['entity_type'], '%s', $prepare_args ),
			$this->value_placeholder( $row['entity_id'], '%s', $prepare_args ),
			$this->nullable_int_placeholder( $row['base_row_version'] ?? null, $prepare_args ),
			$this->value_placeholder( $row['payload_json'], '%s', $prepare_args ),
			$this->value_placeholder( $row['status'], '%s', $prepare_args ),
			$this->nullable_string_placeholder( $row['result_code'] ?? null, $prepare_args ),
			$this->nullable_string_placeholder( $row['result_details_json'] ?? null, $prepare_args ),
			$this->nullable_string_placeholder( $row['conflict_id'] ?? null, $prepare_args ),
			$this->value_placeholder( $this->mysql_datetime_utc( (string) $row['received_at'] ), '%s', $prepare_args ),
			$this->nullable_datetime_placeholder( $row['resolved_at'] ?? null, $prepare_args ),
			$this->nullable_datetime_placeholder( $row['last_attempt_at'] ?? null, $prepare_args ),
			$this->nullable_datetime_placeholder( $row['next_retry_at'] ?? null, $prepare_args ),
			$this->value_placeholder( $row['row_version'], '%d', $prepare_args ),
		);
		$sql_template = sprintf(
			'INSERT INTO `%s` (%s) VALUES (%s)',
			$table_name,
			implode( ', ', array_map( array( $this, 'quote_identifier' ), self::QUEUE_COLUMNS ) ),
			implode( ', ', $placeholders )
		);

		return array(
			'client_operation_id'                => (string) $row['client_operation_id'],
			'status'                             => (string) $row['status'],
			'has_conflict_id'                    => null !== ( $row['conflict_id'] ?? null ),
			'sql_template'                       => $sql_template,
			'prepare_args'                       => $prepare_args,
			'operation_write_execution_deferred' => true,
		);
	}

	/**
	 * @param array<string, mixed> $row Conflict row.
	 * @return array<string, mixed>
	 */
	private function conflict_query_for_row( string $table_name, array $row ): array {
		$prepare_args = array();
		$placeholders = array(
			$this->value_placeholder( $row['conflict_id'], '%s', $prepare_args ),
			$this->nullable_int_placeholder( $row['offline_queue_id'] ?? null, $prepare_args ),
			$this->nullable_int_placeholder( $row['offline_device_id'] ?? null, $prepare_args ),
			$this->value_placeholder( $row['device_public_id'], '%s', $prepare_args ),
			$this->value_placeholder( $row['batch_id'], '%s', $prepare_args ),
			$this->value_placeholder( $row['client_operation_id'], '%s', $prepare_args ),
			$this->value_placeholder( $row['status'], '%s', $prepare_args ),
			$this->value_placeholder( $row['entity_type'], '%s', $prepare_args ),
			$this->value_placeholder( $row['entity_id'], '%s', $prepare_args ),
			$this->value_placeholder( $row['conflict_type'], '%s', $prepare_args ),
			$this->value_placeholder( $row['severity'], '%s', $prepare_args ),
			$this->value_placeholder( $row['summary'], '%s', $prepare_args ),
			$this->nullable_int_placeholder( $row['server_row_version'] ?? null, $prepare_args ),
			$this->nullable_int_placeholder( $row['device_row_version'] ?? null, $prepare_args ),
			$this->value_placeholder( $row['server_payload_json'], '%s', $prepare_args ),
			$this->value_placeholder( $row['device_payload_json'], '%s', $prepare_args ),
			$this->value_placeholder( $row['resolution_options_json'], '%s', $prepare_args ),
			$this->nullable_string_placeholder( $row['resolution_action'] ?? null, $prepare_args ),
			$this->nullable_string_placeholder( $row['resolution_payload_json'] ?? null, $prepare_args ),
			$this->nullable_int_placeholder( $row['manager_user_id'] ?? null, $prepare_args ),
			$this->value_placeholder( $this->mysql_datetime_utc( (string) $row['detected_at'] ), '%s', $prepare_args ),
			$this->nullable_datetime_placeholder( $row['resolved_at'] ?? null, $prepare_args ),
			$this->value_placeholder( $this->mysql_datetime_utc( (string) $row['updated_at'] ), '%s', $prepare_args ),
			$this->value_placeholder( $row['row_version'], '%d', $prepare_args ),
		);
		$sql_template = sprintf(
			'INSERT INTO `%s` (%s) VALUES (%s)',
			$table_name,
			implode( ', ', array_map( array( $this, 'quote_identifier' ), self::CONFLICT_COLUMNS ) ),
			implode( ', ', $placeholders )
		);

		return array(
			'conflict_id'                       => (string) $row['conflict_id'],
			'client_operation_id'               => (string) $row['client_operation_id'],
			'status'                            => (string) $row['status'],
			'sql_template'                      => $sql_template,
			'prepare_args'                      => $prepare_args,
			'conflict_write_execution_deferred' => true,
		);
	}

	/**
	 * @param list<mixed> $prepare_args Prepared SQL args.
	 */
	private function value_placeholder( mixed $value, string $placeholder, array &$prepare_args ): string {
		$prepare_args[] = '%d' === $placeholder ? (int) $value : (string) $value;

		return $placeholder;
	}

	/**
	 * @param list<mixed> $prepare_args Prepared SQL args.
	 */
	private function nullable_string_placeholder( mixed $value, array &$prepare_args ): string {
		if ( null === $value || '' === $value ) {
			return 'NULL';
		}

		$prepare_args[] = (string) $value;

		return '%s';
	}

	/**
	 * @param list<mixed> $prepare_args Prepared SQL args.
	 */
	private function nullable_int_placeholder( mixed $value, array &$prepare_args ): string {
		if ( null === $value || '' === $value ) {
			return 'NULL';
		}

		$prepare_args[] = (int) $value;

		return '%d';
	}

	/**
	 * @param list<mixed> $prepare_args Prepared SQL args.
	 */
	private function nullable_datetime_placeholder( mixed $value, array &$prepare_args ): string {
		if ( null === $value || '' === $value ) {
			return 'NULL';
		}

		$prepare_args[] = (string) $this->mysql_datetime_utc( (string) $value );

		return '%s';
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

	private function non_negative_int( mixed $value ): ?int {
		if ( is_int( $value ) && 0 <= $value ) {
			return $value;
		}

		if ( is_string( $value ) && 1 === preg_match( '/^\d+$/', $value ) ) {
			return (int) $value;
		}

		return null;
	}

	private function is_identifier( string $value, int $minimum, int $maximum ): bool {
		$value = trim( $value );

		return 1 === preg_match( '/^[a-zA-Z0-9._:-]{' . $minimum . ',' . $maximum . '}$/', $value );
	}

	private function is_slug( string $value, int $minimum, int $maximum ): bool {
		$value = trim( $value );

		return 1 === preg_match( '/^[a-z0-9_]{' . $minimum . ',' . $maximum . '}$/', $value );
	}

	private function is_json_string( mixed $value ): bool {
		if ( ! is_string( $value ) || '' === trim( $value ) ) {
			return false;
		}

		json_decode( $value, true );

		return JSON_ERROR_NONE === json_last_error();
	}

	private function quote_identifier( string $identifier ): string {
		return '`' . $identifier . '`';
	}

	private function mysql_datetime_utc( string $value ): ?string {
		try {
			$date = new DateTimeImmutable( $value, new DateTimeZone( 'UTC' ) );
		} catch ( Exception ) {
			return null;
		}

		return $date->setTimezone( new DateTimeZone( 'UTC' ) )->format( 'Y-m-d H:i:s.u' );
	}
}
