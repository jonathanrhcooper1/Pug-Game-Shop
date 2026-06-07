<?php
/**
 * Offline push existing operation row prepared SQL builder.
 *
 * @package TCGStorePlatform
 */

namespace TCGStorePlatform\Offline;

final class OfflinePushExistingOperationRowsQueryBuilder {
	private const QUEUE_TABLE = 'tcg_offline_sync_queue';

	public function build(
		OfflinePushExistingOperationRowsQueryPlan $query_plan
	): OfflinePushExistingOperationRowsQueryBuildPlan {
		$errors = array();
		$query  = $query_plan->query();

		if ( ! $query_plan->is_valid() ) {
			$errors[] = 'existing_operation_rows_query_plan_invalid';
			$errors   = array_merge( $errors, $query_plan->errors() );
		}

		if ( ! $this->is_public_id( $query_plan->device_id() ) ) {
			$errors[] = 'device_id_invalid';
		}

		if ( $query_plan->offline_device_id() <= 0 ) {
			$errors[] = 'offline_device_id_invalid';
		}

		if ( ! $this->is_identifier( $query_plan->table_prefix() ) ) {
			$errors[] = 'table_prefix_invalid';
		}

		$this->validate_query( $query, $query_plan, $errors );

		if ( array() !== $errors ) {
			return OfflinePushExistingOperationRowsQueryBuildPlan::rejected( $query_plan, $errors );
		}

		return OfflinePushExistingOperationRowsQueryBuildPlan::accepted(
			$query_plan,
			$this->build_query( $query, $query_plan )
		);
	}

	/**
	 * @param array<string, mixed> $query  Existing operation rows query contract.
	 * @param list<string>         $errors Query build errors.
	 */
	private function validate_query(
		array $query,
		OfflinePushExistingOperationRowsQueryPlan $query_plan,
		array &$errors
	): void {
		$operation_ids = $query_plan->operation_ids();

		if ( ( $query_plan->table_prefix() . self::QUEUE_TABLE ) !== ( $query['table_name'] ?? '' ) ) {
			$errors[] = 'table_unsupported';
		}

		if ( ! $this->is_identifier( (string) ( $query['table_name'] ?? '' ) ) ) {
			$errors[] = 'table_identifier_invalid';
		}

		if ( OfflinePushExistingOperationRowsQueryPlanner::selected_columns() !== ( $query['selected_columns'] ?? array() ) ) {
			$errors[] = 'selected_columns_unsupported';
		}

		if ( ! $this->identifiers_are_safe( $query['selected_columns'] ?? array() ) ) {
			$errors[] = 'selected_columns_invalid';
		}

		if (
			array(
				'offline_device_id'      => $query_plan->offline_device_id(),
				'client_operation_id_in' => $operation_ids,
			) !== ( $query['where'] ?? array() )
		) {
			$errors[] = 'where_unsupported';
		}

		if ( ( $query['operation_ids'] ?? array() ) !== $operation_ids ) {
			$errors[] = 'operation_ids_unsupported';
		}

		foreach ( $operation_ids as $operation_id ) {
			if ( ! $this->is_public_id( $operation_id ) ) {
				$errors[] = 'operation_ids_invalid';
				break;
			}
		}

		if ( ( $query['limit'] ?? null ) !== count( $operation_ids ) ) {
			$errors[] = 'limit_unsupported';
		}

		if ( ( $query['result_keys'] ?? array() ) !== $operation_ids ) {
			$errors[] = 'result_keys_unsupported';
		}

		if ( true !== ( $query['query_ready'] ?? null ) ) {
			$errors[] = 'query_ready_unsupported';
		}

		if ( true !== ( $query['execution_deferred'] ?? null ) ) {
			$errors[] = 'execution_deferred_unsupported';
		}

		if ( true !== ( $query['existing_operation_rows_repository_next'] ?? null ) ) {
			$errors[] = 'existing_operation_rows_repository_unsupported';
		}

		if ( true !== ( $query['route_connected_reads_deferred'] ?? null ) ) {
			$errors[] = 'route_connected_reads_deferred_unsupported';
		}

		if ( true !== ( $query['queue_replay_deferred'] ?? null ) ) {
			$errors[] = 'queue_replay_deferred_unsupported';
		}

		if ( true !== ( $query['canonical_mutations_deferred'] ?? null ) ) {
			$errors[] = 'canonical_mutations_deferred_unsupported';
		}
	}

	/**
	 * @param array<string, mixed> $query Existing operation rows query contract.
	 * @return array<string, mixed>
	 */
	private function build_query(
		array $query,
		OfflinePushExistingOperationRowsQueryPlan $query_plan
	): array {
		$operation_ids     = $query_plan->operation_ids();
		$selected_columns  = array_values( $query['selected_columns'] );
		$operation_markers = implode( ', ', array_fill( 0, count( $operation_ids ), '%s' ) );
		$sql_template      = sprintf(
			'SELECT %s FROM %s WHERE `offline_device_id` = %%d AND `client_operation_id` IN (%s) LIMIT %d',
			implode( ', ', array_map( array( $this, 'quote_identifier' ), $selected_columns ) ),
			$this->quote_identifier( (string) $query['table_name'] ),
			$operation_markers,
			count( $operation_ids )
		);

		return array(
			'table_name'                              => $query['table_name'],
			'selected_columns'                        => $selected_columns,
			'where'                                   => $query['where'],
			'operation_ids'                           => $operation_ids,
			'sql_template'                            => $sql_template,
			'prepare_args'                            => array_merge(
				array( $query_plan->offline_device_id() ),
				$operation_ids
			),
			'limit'                                   => count( $operation_ids ),
			'result_keys'                             => $operation_ids,
			'execution_deferred'                      => true,
			'existing_operation_rows_repository_next' => true,
			'route_connected_reads_deferred'          => true,
			'queue_replay_deferred'                   => true,
			'canonical_mutations_deferred'            => true,
		);
	}

	private function quote_identifier( string $identifier ): string {
		return '`' . $identifier . '`';
	}

	private function is_identifier( string $value ): bool {
		return '' !== $value && 1 === preg_match( '/^[A-Za-z0-9_]+$/', $value );
	}

	private function is_public_id( string $value ): bool {
		return 1 === preg_match( '/^[a-zA-Z0-9._:-]{8,128}$/', $value );
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
}
