<?php
/**
 * Offline pull cursor advancement SQL builder.
 *
 * @package TCGStorePlatform
 */

namespace TCGStorePlatform\Offline;

final class OfflinePullCursorAdvanceQueryBuilder {
	public function build(
		OfflinePullCursorAdvancePlan $advance_plan
	): OfflinePullCursorAdvanceQueryBuildPlan {
		$errors = array();

		if ( ! $advance_plan->is_valid() ) {
			$errors[] = 'cursor_advance_plan_invalid';
			$errors   = array_merge( $errors, $advance_plan->errors() );
		}

		$table_name = $advance_plan->table_name();

		if ( '' === $table_name || 1 !== preg_match( '/^[A-Za-z0-9_]+$/', $table_name ) ) {
			$errors[] = 'cursor_table_name_invalid';
		}

		$cursor_queries = array();

		foreach ( $advance_plan->cursor_rows() as $index => $row ) {
			$row_errors = $this->validate_row( $row, $index );

			if ( array() !== $row_errors ) {
				$errors = array_merge( $errors, $row_errors );
				continue;
			}

			$cursor_queries[] = $this->query_for_row( $table_name, $row );
		}

		if ( array() !== $errors ) {
			return OfflinePullCursorAdvanceQueryBuildPlan::rejected(
				$advance_plan,
				$errors
			);
		}

		return OfflinePullCursorAdvanceQueryBuildPlan::accepted(
			$advance_plan,
			$cursor_queries
		);
	}

	/**
	 * @param array<string, mixed> $row Cursor row.
	 * @return list<string>
	 */
	private function validate_row( array $row, int $index ): array {
		$errors = array();

		if ( null === $this->positive_int( $row['offline_device_id'] ?? null ) ) {
			$errors[] = 'cursor_row_' . $index . '_offline_device_id_invalid';
		}

		if ( ! $this->is_identifier( (string) ( $row['device_public_id'] ?? '' ), 8, 128 ) ) {
			$errors[] = 'cursor_row_' . $index . '_device_public_id_invalid';
		}

		$domain = strtolower( trim( (string) ( $row['domain'] ?? '' ) ) );

		if ( ! in_array( $domain, OfflinePullChangeQueryPlanner::supported_domains(), true ) ) {
			$errors[] = 'cursor_row_' . $index . '_domain_invalid';
		}

		$cursor = $row['cursor_value'] ?? null;

		if ( null !== $cursor && ! $this->is_identifier( (string) $cursor, 1, 256 ) ) {
			$errors[] = 'cursor_row_' . $index . '_cursor_value_invalid';
		}

		if ( ! $this->is_mysql_datetime( (string) ( $row['last_server_time_utc'] ?? '' ) ) ) {
			$errors[] = 'cursor_row_' . $index . '_last_server_time_invalid';
		}

		if ( ! $this->is_mysql_datetime( (string) ( $row['last_pulled_at'] ?? '' ) ) ) {
			$errors[] = 'cursor_row_' . $index . '_last_pulled_at_invalid';
		}

		if ( null === $this->non_negative_int( $row['row_count'] ?? null ) ) {
			$errors[] = 'cursor_row_' . $index . '_row_count_invalid';
		}

		if ( null === $this->positive_int( $row['row_version_next'] ?? null ) ) {
			$errors[] = 'cursor_row_' . $index . '_row_version_next_invalid';
		}

		return $errors;
	}

	/**
	 * @param array<string, mixed> $row Cursor row.
	 * @return array<string, mixed>
	 */
	private function query_for_row( string $table_name, array $row ): array {
		$cursor_value       = $row['cursor_value'] ?? null;
		$cursor_placeholder = null === $cursor_value ? 'NULL' : '%s';
		$prepare_args       = array(
			(int) $row['offline_device_id'],
			(string) $row['device_public_id'],
			(string) $row['domain'],
		);

		if ( null !== $cursor_value ) {
			$prepare_args[] = (string) $cursor_value;
		}

		$prepare_args = array_merge(
			$prepare_args,
			array(
				(string) $row['last_server_time_utc'],
				(string) $row['last_pulled_at'],
				(int) $row['row_count'],
				(string) $row['last_pulled_at'],
				(string) $row['last_pulled_at'],
				(int) $row['row_version_next'],
			)
		);
		$sql_template = "INSERT INTO `{$table_name}` "
			. '(offline_device_id, device_public_id, domain, cursor_value, '
			. 'last_server_time_utc, last_pulled_at, row_count, created_at, '
			. 'updated_at, row_version) '
			. "VALUES (%d, %s, %s, {$cursor_placeholder}, %s, %s, %d, %s, %s, %d) "
			. 'ON DUPLICATE KEY UPDATE '
			. 'device_public_id = VALUES(device_public_id), '
			. 'cursor_value = VALUES(cursor_value), '
			. 'last_server_time_utc = VALUES(last_server_time_utc), '
			. 'last_pulled_at = VALUES(last_pulled_at), '
			. 'row_count = VALUES(row_count), '
			. 'updated_at = VALUES(updated_at), '
			. 'row_version = row_version + 1';

		return array(
			'domain'                          => (string) $row['domain'],
			'sql_template'                    => $sql_template,
			'prepare_args'                    => $prepare_args,
			'cursor_value_is_null'            => null === $cursor_value,
			'row_count'                       => (int) $row['row_count'],
			'cursor_write_execution_deferred' => true,
		);
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

	private function is_mysql_datetime( string $value ): bool {
		return 1 === preg_match( '/^\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}(?:\.\d+)?$/', trim( $value ) );
	}
}
