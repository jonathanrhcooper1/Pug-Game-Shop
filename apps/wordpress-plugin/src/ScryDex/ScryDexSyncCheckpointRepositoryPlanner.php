<?php
/**
 * ScryDex checkpoint repository planning.
 *
 * @package TCGStorePlatform
 */

namespace TCGStorePlatform\ScryDex;

final class ScryDexSyncCheckpointRepositoryPlanner {
	public function __construct(
		private string $table_prefix = ''
	) {
		$this->table_prefix = trim( $this->table_prefix );
	}

	/**
	 * @param array<string, mixed>|ScryDexSyncCheckpoint $checkpoint Checkpoint row or value object.
	 * @return array<string, mixed>
	 */
	public function plan( array|ScryDexSyncCheckpoint $checkpoint ): array {
		$checkpoint = is_array( $checkpoint ) ? ScryDexSyncCheckpoint::from_row( $checkpoint ) : $checkpoint;
		$table_name = $this->table_name();
		$errors     = $this->validation_errors( $table_name, $checkpoint );
		$configured = array() === $errors;

		return array(
			'status'                            => $configured ? 'ready' : 'blocked',
			'action'                            => 'scrydex_checkpoint_repository_plan',
			'repository_configured'             => $configured,
			'table_name'                        => $table_name,
			'sync_job_id_configured'            => $checkpoint->job_id() > 0,
			'active_sync_job_creation_deferred' => 0 === $checkpoint->job_id(),
			'read_query'                        => $configured ? $this->read_query( $table_name, $checkpoint ) : null,
			'upsert_query'                      => $configured ? $this->upsert_query( $table_name, $checkpoint ) : null,
			'read_execution_deferred'           => true,
			'write_execution_deferred'          => true,
			'database_writes_deferred'          => true,
			'checkpoint_repository_class'       => self::class,
			'configuration_issues'              => $errors,
			'block_reasons'                     => $configured ? array() : array( 'scrydex_checkpoint_repository_not_configured' ),
		);
	}

	private function table_name(): string {
		return '' === $this->table_prefix ? '' : $this->table_prefix . 'tcg_sync_checkpoints';
	}

	/**
	 * @return array<string, mixed>
	 */
	private function read_query( string $table_name, ScryDexSyncCheckpoint $checkpoint ): array {
		return array(
			'sql_template' => "SELECT sync_job_id, provider_name, resource_type, resource_key, page_number, cursor_value, high_water_mark, payload_hash, committed_count FROM `{$table_name}` WHERE sync_job_id = %d AND provider_name = %s AND resource_type = %s AND resource_key = %s LIMIT 1",
			'prepare_args' => array(
				$checkpoint->job_id(),
				ScryDexSyncCheckpoint::PROVIDER,
				$checkpoint->resource_type(),
				$checkpoint->resource_key(),
			),
		);
	}

	/**
	 * @return array<string, mixed>
	 */
	private function upsert_query( string $table_name, ScryDexSyncCheckpoint $checkpoint ): array {
		$row                   = $checkpoint->to_row();
		$now                   = gmdate( 'Y-m-d H:i:s' );
		$nullable_sql          = array();
		$nullable_prepare_args = array();

		foreach ( array( 'cursor_value', 'high_water_mark', 'payload_hash' ) as $field ) {
			$value = $row[ $field ] ?? null;

			if ( null === $value ) {
				$nullable_sql[ $field ] = 'NULL';
				continue;
			}

			$nullable_sql[ $field ]  = '%s';
			$nullable_prepare_args[] = (string) $value;
		}

		$sql_template = "INSERT INTO `{$table_name}` "
			. '(sync_job_id, provider_name, resource_type, resource_key, page_number, cursor_value, '
			. 'high_water_mark, payload_hash, committed_count, created_at, updated_at) '
			. 'VALUES (%d, %s, %s, %s, %d, '
			. $nullable_sql['cursor_value'] . ', '
			. $nullable_sql['high_water_mark'] . ', '
			. $nullable_sql['payload_hash'] . ', '
			. '%d, %s, %s) '
			. 'ON DUPLICATE KEY UPDATE '
			. 'page_number = VALUES(page_number), '
			. 'cursor_value = VALUES(cursor_value), '
			. 'high_water_mark = VALUES(high_water_mark), '
			. 'payload_hash = VALUES(payload_hash), '
			. 'committed_count = VALUES(committed_count), '
			. 'updated_at = VALUES(updated_at)';
		$prepare_args = array_merge(
			array(
				$checkpoint->job_id(),
				ScryDexSyncCheckpoint::PROVIDER,
				$checkpoint->resource_type(),
				$checkpoint->resource_key(),
				$checkpoint->page_number(),
			),
			$nullable_prepare_args,
			array(
				$checkpoint->committed_count(),
				$now,
				$now,
			)
		);

		return array(
			'sql_template'              => $sql_template,
			'prepare_args'              => $prepare_args,
			'cursor_value_is_null'      => null === ( $row['cursor_value'] ?? null ),
			'high_water_mark_is_null'   => null === ( $row['high_water_mark'] ?? null ),
			'payload_hash_is_null'      => null === ( $row['payload_hash'] ?? null ),
			'prepare_arg_count'         => count( $prepare_args ),
			'checkpoint_write_deferred' => true,
		);
	}

	/**
	 * @return list<string>
	 */
	private function validation_errors( string $table_name, ScryDexSyncCheckpoint $checkpoint ): array {
		$errors = array();

		if ( '' === $this->table_prefix || 1 !== preg_match( '/^[A-Za-z0-9_]+$/', $this->table_prefix ) ) {
			$errors[] = 'scrydex_checkpoint_table_prefix_invalid';
		}

		if ( '' === $table_name || 1 !== preg_match( '/^[A-Za-z0-9_]*tcg_sync_checkpoints$/', $table_name ) ) {
			$errors[] = 'scrydex_checkpoint_table_name_invalid';
		}

		if ( ! $this->is_identifier( $checkpoint->resource_type(), 2, 64 ) ) {
			$errors[] = 'scrydex_checkpoint_resource_type_invalid';
		}

		if ( ! $this->is_resource_key( $checkpoint->resource_key(), 2, 191 ) ) {
			$errors[] = 'scrydex_checkpoint_resource_key_invalid';
		}

		if ( '' !== $checkpoint->payload_hash() && 1 !== preg_match( '/^[a-f0-9]{64}$/', $checkpoint->payload_hash() ) ) {
			$errors[] = 'scrydex_checkpoint_payload_hash_invalid';
		}

		return array_values( array_unique( $errors ) );
	}

	private function is_identifier( string $value, int $minimum, int $maximum ): bool {
		return 1 === preg_match( '/^[a-zA-Z0-9_-]{' . $minimum . ',' . $maximum . '}$/', trim( $value ) );
	}

	private function is_resource_key( string $value, int $minimum, int $maximum ): bool {
		return 1 === preg_match( '/^[a-zA-Z0-9_:-]{' . $minimum . ',' . $maximum . '}$/', trim( $value ) );
	}
}
