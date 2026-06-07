<?php
/**
 * Offline push server snapshot prepared SQL builder.
 *
 * @package TCGStorePlatform
 */

namespace TCGStorePlatform\Offline;

final class OfflinePushServerSnapshotQueryBuilder {
	public function build(
		OfflinePushServerSnapshotQueryPlan $query_plan
	): OfflinePushServerSnapshotQueryBuildPlan {
		$errors = array();

		if ( ! $query_plan->is_valid() ) {
			$errors[] = 'snapshot_query_plan_invalid';
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

		foreach ( $query_plan->operation_queries() as $operation_id => $operation_query ) {
			$this->validate_operation_query(
				(string) $operation_id,
				is_array( $operation_query ) ? $operation_query : array(),
				$query_plan,
				$errors
			);
		}

		if ( array() !== $errors ) {
			return OfflinePushServerSnapshotQueryBuildPlan::rejected( $query_plan, $errors );
		}

		$operation_queries = array();

		foreach ( $query_plan->operation_queries() as $operation_id => $operation_query ) {
			$operation_queries[ (string) $operation_id ] = $this->build_operation_query( $operation_query );
		}

		return OfflinePushServerSnapshotQueryBuildPlan::accepted( $query_plan, $operation_queries );
	}

	/**
	 * @param array<string, mixed> $operation_query Operation snapshot query contract.
	 * @param list<string>         $errors Query build errors.
	 */
	private function validate_operation_query(
		string $operation_id,
		array $operation_query,
		OfflinePushServerSnapshotQueryPlan $query_plan,
		array &$errors
	): void {
		$contracts      = OfflinePushServerSnapshotQueryPlanner::operation_contracts();
		$operation_type = (string) ( $operation_query['operation_type'] ?? '' );
		$contract       = $contracts[ $operation_type ] ?? null;

		if ( null === $contract ) {
			$errors[] = 'operation_type_unsupported';

			return;
		}

		$entity_id  = (string) ( $operation_query['entity_id'] ?? '' );
		$entity_key = ( $operation_query['entity_type'] ?? '' ) . ':' . $entity_id;

		if ( ( $operation_query['client_operation_id'] ?? '' ) !== $operation_id ) {
			$errors[] = 'client_operation_id_mismatch';
		}

		if ( ! $this->is_public_id( (string) ( $operation_query['client_operation_id'] ?? '' ) ) ) {
			$errors[] = 'client_operation_id_invalid';
		}

		if ( ! $this->is_lookup_id( $entity_id ) ) {
			$errors[] = 'entity_id_invalid';
		}

		if ( ( $contract['entity_type'] ?? '' ) !== ( $operation_query['entity_type'] ?? '' ) ) {
			$errors[] = 'entity_type_unsupported';
		}

		if ( ( $contract['domain'] ?? '' ) !== ( $operation_query['domain'] ?? '' ) ) {
			$errors[] = 'domain_unsupported';
		}

		if ( ( $query_plan->table_prefix() . (string) $contract['table'] ) !== ( $operation_query['table_name'] ?? '' ) ) {
			$errors[] = 'table_unsupported';
		}

		if ( ! $this->is_identifier( (string) ( $operation_query['table_name'] ?? '' ) ) ) {
			$errors[] = 'table_identifier_invalid';
		}

		if ( ( $contract['snapshot_section'] ?? '' ) !== ( $operation_query['snapshot_section'] ?? '' ) ) {
			$errors[] = 'snapshot_section_unsupported';
		}

		if ( ( $contract['selected_columns'] ?? array() ) !== ( $operation_query['selected_columns'] ?? array() ) ) {
			$errors[] = 'selected_columns_unsupported';
		}

		if ( ! $this->identifiers_are_safe( $operation_query['selected_columns'] ?? array() ) ) {
			$errors[] = 'selected_columns_invalid';
		}

		if ( ( $contract['payload_fields'] ?? array() ) !== ( $operation_query['payload_fields'] ?? array() ) ) {
			$errors[] = 'payload_fields_unsupported';
		}

		if ( ! $this->identifiers_are_safe( $operation_query['payload_fields'] ?? array() ) ) {
			$errors[] = 'payload_fields_invalid';
		}

		if ( ( $contract['derived_fields'] ?? array() ) !== ( $operation_query['derived_fields'] ?? array() ) ) {
			$errors[] = 'derived_fields_unsupported';
		}

		if ( array( 'public_id' => $entity_id ) !== ( $operation_query['where'] ?? array() ) ) {
			$errors[] = 'where_unsupported';
		}

		if ( 1 !== ( $operation_query['limit'] ?? null ) ) {
			$errors[] = 'limit_unsupported';
		}

		if ( array( $operation_id, $entity_key ) !== ( $operation_query['result_keys'] ?? array() ) ) {
			$errors[] = 'result_keys_unsupported';
		}

		if ( true !== ( $operation_query['query_ready'] ?? null ) ) {
			$errors[] = 'query_ready_unsupported';
		}

		if ( true !== ( $operation_query['execution_deferred'] ?? null ) ) {
			$errors[] = 'execution_deferred_unsupported';
		}

		if ( true !== ( $operation_query['snapshot_repository_next'] ?? null ) ) {
			$errors[] = 'snapshot_repository_unsupported';
		}

		if ( true !== ( $operation_query['route_connected_reads_deferred'] ?? null ) ) {
			$errors[] = 'route_connected_reads_deferred_unsupported';
		}

		if ( true !== ( $operation_query['canonical_mutations_deferred'] ?? null ) ) {
			$errors[] = 'canonical_mutations_deferred_unsupported';
		}
	}

	/**
	 * @param array<string, mixed> $operation_query Operation snapshot query contract.
	 * @return array<string, mixed>
	 */
	private function build_operation_query( array $operation_query ): array {
		$selected_columns = array_values( $operation_query['selected_columns'] );
		$sql_template     = sprintf(
			'SELECT %s FROM %s WHERE `public_id` = %%s LIMIT 1',
			implode( ', ', array_map( array( $this, 'quote_identifier' ), $selected_columns ) ),
			$this->quote_identifier( (string) $operation_query['table_name'] )
		);

		return array(
			'client_operation_id'            => $operation_query['client_operation_id'],
			'operation_type'                 => $operation_query['operation_type'],
			'entity_type'                    => $operation_query['entity_type'],
			'entity_id'                      => $operation_query['entity_id'],
			'entity_key'                     => $operation_query['entity_key'],
			'domain'                         => $operation_query['domain'],
			'table_name'                     => $operation_query['table_name'],
			'snapshot_section'               => $operation_query['snapshot_section'],
			'selected_columns'               => $selected_columns,
			'payload_fields'                 => array_values( $operation_query['payload_fields'] ),
			'derived_fields'                 => $operation_query['derived_fields'],
			'where'                          => $operation_query['where'],
			'sql_template'                   => $sql_template,
			'prepare_args'                   => array( $operation_query['entity_id'] ),
			'limit'                          => 1,
			'result_keys'                    => $operation_query['result_keys'],
			'execution_deferred'             => true,
			'snapshot_repository_deferred'   => true,
			'route_connected_reads_deferred' => true,
			'canonical_mutations_deferred'   => true,
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

	private function is_lookup_id( string $value ): bool {
		return 1 === preg_match( '/^[a-zA-Z0-9._:-]{1,128}$/', $value );
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
