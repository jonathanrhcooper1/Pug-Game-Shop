<?php
/**
 * Plan-only offline push existing operation row lookup contracts.
 *
 * @package TCGStorePlatform
 */

namespace TCGStorePlatform\Offline;

final class OfflinePushExistingOperationRowsQueryPlanner {
	private const QUEUE_TABLE      = 'tcg_offline_sync_queue';
	private const SELECTED_COLUMNS = array(
		'offline_queue_id',
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
		'status',
		'result_code',
		'result_details_json',
		'conflict_id',
		'received_at',
		'resolved_at',
		'row_version',
	);

	/**
	 * @return list<string>
	 */
	public static function selected_columns(): array {
		return self::SELECTED_COLUMNS;
	}

	public function plan(
		OfflinePushPayload $payload,
		int $offline_device_id,
		string $table_prefix
	): OfflinePushExistingOperationRowsQueryPlan {
		$errors        = array();
		$table_prefix  = trim( $table_prefix );
		$operation_ids = array();

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

		foreach ( $payload->operations() as $index => $operation ) {
			$operation_id = $operation->client_operation_id();

			if ( ! $this->is_public_id( $operation_id ) ) {
				$errors[] = "operations_{$index}_client_operation_id_invalid";
			}

			if ( in_array( $operation_id, $operation_ids, true ) ) {
				$errors[] = "operations_{$index}_client_operation_id_duplicate";
			}

			if ( $operation->device_id() !== $payload->device_id() ) {
				$errors[] = "operations_{$index}_device_id_mismatch";
			}

			$operation_ids[] = $operation_id;
		}

		if ( array() !== $errors ) {
			return OfflinePushExistingOperationRowsQueryPlan::rejected(
				$payload->batch_id(),
				$payload->device_id(),
				$offline_device_id,
				$errors
			);
		}

		return OfflinePushExistingOperationRowsQueryPlan::accepted(
			$payload->batch_id(),
			$payload->device_id(),
			$offline_device_id,
			$table_prefix,
			array(
				'table_name'                              => $table_prefix . self::QUEUE_TABLE,
				'selected_columns'                        => self::SELECTED_COLUMNS,
				'where'                                   => array(
					'offline_device_id'      => $offline_device_id,
					'client_operation_id_in' => $operation_ids,
				),
				'operation_ids'                           => $operation_ids,
				'limit'                                   => count( $operation_ids ),
				'result_keys'                             => $operation_ids,
				'query_ready'                             => true,
				'execution_deferred'                      => true,
				'existing_operation_rows_repository_next' => true,
				'route_connected_reads_deferred'          => true,
				'queue_replay_deferred'                   => true,
				'canonical_mutations_deferred'            => true,
			)
		);
	}

	private function is_public_id( string $value ): bool {
		return 1 === preg_match( '/^[a-zA-Z0-9._:-]{8,128}$/', $value );
	}
}
