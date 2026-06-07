<?php
/**
 * Offline pull change-query prepared SQL builder.
 *
 * @package TCGStorePlatform
 */

namespace TCGStorePlatform\Offline;

final class OfflinePullChangeQueryBuilder {
	private const MAX_PAGE_SIZE = 500;

	public function build( OfflinePullChangeQueryPlan $change_query_plan ): OfflinePullChangeQueryBuildPlan {
		$errors = array();

		if ( ! $change_query_plan->is_valid() ) {
			$errors[] = 'change_query_plan_invalid';
			$errors   = array_merge( $errors, $change_query_plan->errors() );
		}

		if ( ! $this->is_public_id( $change_query_plan->device_id() ) ) {
			$errors[] = 'device_id_invalid';
		}

		if ( $change_query_plan->offline_device_id() <= 0 ) {
			$errors[] = 'offline_device_id_invalid';
		}

		if ( ! $this->is_identifier( $change_query_plan->table_prefix() ) ) {
			$errors[] = 'table_prefix_invalid';
		}

		$domain_queries = $change_query_plan->domain_queries();

		foreach ( $domain_queries as $domain => $domain_query ) {
			$this->validate_domain_query(
				(string) $domain,
				is_array( $domain_query ) ? $domain_query : array(),
				$change_query_plan,
				$errors
			);
		}

		if ( array() !== $errors ) {
			return OfflinePullChangeQueryBuildPlan::rejected(
				$change_query_plan->device_id(),
				$change_query_plan->offline_device_id(),
				$errors
			);
		}

		$sql_queries = array();

		foreach ( $domain_queries as $domain => $domain_query ) {
			$domain                      = strtolower( trim( (string) $domain ) );
			$sql_queries[ $domain ] = $this->build_domain_query( $domain, $domain_query );
		}

		return OfflinePullChangeQueryBuildPlan::accepted(
			$change_query_plan->device_id(),
			$change_query_plan->offline_device_id(),
			$sql_queries
		);
	}

	/**
	 * @param array<string, mixed> $domain_query Domain query contract.
	 * @param list<string>         $errors Query planning errors.
	 */
	private function validate_domain_query(
		string $domain_key,
		array $domain_query,
		OfflinePullChangeQueryPlan $change_query_plan,
		array &$errors
	): void {
		$domain    = strtolower( trim( (string) ( $domain_query['domain'] ?? $domain_key ) ) );
		$contracts = OfflinePullChangeQueryPlanner::domain_contracts();

		if ( $domain !== strtolower( trim( $domain_key ) ) ) {
			$errors[] = 'domain_mismatch';
		}

		if ( ! array_key_exists( $domain, $contracts ) ) {
			$errors[] = 'domain_unsupported';

			return;
		}

		$contract       = $contracts[ $domain ];
		$row_id_column  = (string) $contract['row_id_column'];
		$expected_where = $contract['where'];

		if ( 'conflicts' === $domain ) {
			$expected_where['offline_device_id'] = $change_query_plan->offline_device_id();
			$expected_where['device_public_id']  = $change_query_plan->device_id();
		}

		$expected_order_by = array(
			'updated_at'   => 'ASC',
			$row_id_column => 'ASC',
		);
		$expected_table    = $change_query_plan->table_prefix() . (string) $contract['table'];

		if ( $expected_table !== ( $domain_query['table_name'] ?? '' ) ) {
			$errors[] = 'table_unsupported';
		}

		if ( ! $this->is_identifier( (string) ( $domain_query['table_name'] ?? '' ) ) ) {
			$errors[] = 'table_identifier_invalid';
		}

		if ( $row_id_column !== ( $domain_query['row_id_column'] ?? '' ) ) {
			$errors[] = 'row_id_column_unsupported';
		}

		if ( ( $contract['entity_type'] ?? '' ) !== ( $domain_query['entity_type'] ?? '' ) ) {
			$errors[] = 'entity_type_unsupported';
		}

		if ( ( $contract['selected_columns'] ?? array() ) !== ( $domain_query['selected_columns'] ?? array() ) ) {
			$errors[] = 'selected_columns_unsupported';
		}

		if ( ! $this->identifiers_are_safe( $domain_query['selected_columns'] ?? array() ) ) {
			$errors[] = 'selected_columns_invalid';
		}

		if ( ( $contract['payload_fields'] ?? array() ) !== ( $domain_query['payload_fields'] ?? array() ) ) {
			$errors[] = 'payload_fields_unsupported';
		}

		if ( ! $this->identifiers_are_safe( $domain_query['payload_fields'] ?? array() ) ) {
			$errors[] = 'payload_fields_invalid';
		}

		if ( $expected_where !== ( $domain_query['where'] ?? array() ) ) {
			$errors[] = 'where_unsupported';
		}

		if ( ! $this->where_values_are_safe( $domain_query['where'] ?? array() ) ) {
			$errors[] = 'where_invalid';
		}

		if ( $expected_order_by !== ( $domain_query['order_by'] ?? array() ) ) {
			$errors[] = 'order_by_unsupported';
		}

		if ( ! $this->order_by_is_safe( $domain_query['order_by'] ?? array() ) ) {
			$errors[] = 'order_by_invalid';
		}

		if (
			! is_int( $domain_query['limit'] ?? null )
			|| $domain_query['limit'] <= 0
			|| $domain_query['limit'] > self::MAX_PAGE_SIZE
		) {
			$errors[] = 'limit_unsupported';
		}

		if (
			! is_string( $domain_query['cursor_after'] ?? null )
			|| ! $this->is_cursor( (string) $domain_query['cursor_after'] )
		) {
			$errors[] = 'cursor_invalid';
		}

		if ( ! is_bool( $domain_query['include_tombstones'] ?? null ) ) {
			$errors[] = 'include_tombstones_invalid';
		}

		if ( true !== ( $domain_query['query_ready'] ?? null ) ) {
			$errors[] = 'query_ready_unsupported';
		}

		if ( true !== ( $domain_query['execution_deferred'] ?? null ) ) {
			$errors[] = 'execution_deferred_unsupported';
		}

		if ( true !== ( $domain_query['cursor_advance_deferred'] ?? null ) ) {
			$errors[] = 'cursor_advance_deferred_unsupported';
		}

		if ( true !== ( $domain_query['tombstone_read_deferred'] ?? null ) ) {
			$errors[] = 'tombstone_read_deferred_unsupported';
		}

		if ( true !== ( $domain_query['change_set_provider_next'] ?? null ) ) {
			$errors[] = 'change_set_provider_unsupported';
		}
	}

	/**
	 * @param array<string, mixed> $domain_query Domain query contract.
	 * @return array<string, mixed>
	 */
	private function build_domain_query( string $domain, array $domain_query ): array {
		$selected_columns = array_values( $domain_query['selected_columns'] );
		$where            = $domain_query['where'];
		$where_clauses    = array();
		$prepare_args     = array();

		foreach ( $where as $column => $value ) {
			$where_clauses[] = sprintf(
				'%s = %s',
				$this->quote_identifier( (string) $column ),
				$this->placeholder_for( $value )
			);
			$prepare_args[]  = is_bool( $value ) ? (int) $value : $value;
		}

		$sql_template = sprintf(
			'SELECT %s FROM %s',
			implode( ', ', array_map( array( $this, 'quote_identifier' ), $selected_columns ) ),
			$this->quote_identifier( (string) $domain_query['table_name'] )
		);

		if ( array() !== $where_clauses ) {
			$sql_template .= ' WHERE ' . implode( ' AND ', $where_clauses );
		}

		$sql_template .= sprintf(
			' ORDER BY `updated_at` ASC, %s ASC LIMIT %%d',
			$this->quote_identifier( (string) $domain_query['row_id_column'] )
		);
		$prepare_args[] = (int) $domain_query['limit'];

		return array(
			'domain'                      => $domain,
			'table_name'                  => $domain_query['table_name'],
			'row_id_column'               => $domain_query['row_id_column'],
			'entity_type'                 => $domain_query['entity_type'],
			'selected_columns'            => $selected_columns,
			'payload_fields'              => array_values( $domain_query['payload_fields'] ),
			'where'                       => $where,
			'sql_template'                => $sql_template,
			'prepare_args'                => $prepare_args,
			'cursor_after'                => $domain_query['cursor_after'],
			'limit'                       => $domain_query['limit'],
			'order_by'                    => $domain_query['order_by'],
			'include_tombstones'          => $domain_query['include_tombstones'],
			'cursor_filter_deferred'      => true,
			'execution_deferred'          => true,
			'cursor_advance_deferred'     => true,
			'tombstone_read_deferred'     => true,
			'change_set_provider_pending' => true,
		);
	}

	private function quote_identifier( string $identifier ): string {
		return '`' . $identifier . '`';
	}

	private function placeholder_for( mixed $value ): string {
		if ( is_int( $value ) || is_bool( $value ) ) {
			return '%d';
		}

		return '%s';
	}

	private function is_identifier( string $value ): bool {
		return '' !== $value && 1 === preg_match( '/^[A-Za-z0-9_]+$/', $value );
	}

	private function is_public_id( string $value ): bool {
		return 1 === preg_match( '/^[a-zA-Z0-9._:-]{8,128}$/', $value );
	}

	private function is_cursor( string $value ): bool {
		return '' === $value || 1 === preg_match( '/^[a-zA-Z0-9._:-]{1,256}$/', $value );
	}

	private function identifiers_are_safe( mixed $values ): bool {
		if ( ! is_array( $values ) || array() === $values ) {
			return false;
		}

		foreach ( $values as $value ) {
			if ( ! is_string( $value ) || ! $this->is_identifier( $value ) ) {
				return false;
			}
		}

		return true;
	}

	private function where_values_are_safe( mixed $where ): bool {
		if ( ! is_array( $where ) ) {
			return false;
		}

		foreach ( $where as $column => $value ) {
			if ( ! is_string( $column ) || ! $this->is_identifier( $column ) ) {
				return false;
			}

			if ( ! is_string( $value ) && ! is_int( $value ) && ! is_bool( $value ) ) {
				return false;
			}
		}

		return true;
	}

	private function order_by_is_safe( mixed $order_by ): bool {
		if ( ! is_array( $order_by ) || array() === $order_by ) {
			return false;
		}

		foreach ( $order_by as $column => $direction ) {
			if ( ! is_string( $column ) || ! $this->is_identifier( $column ) ) {
				return false;
			}

			if ( 'ASC' !== $direction ) {
				return false;
			}
		}

		return true;
	}
}
