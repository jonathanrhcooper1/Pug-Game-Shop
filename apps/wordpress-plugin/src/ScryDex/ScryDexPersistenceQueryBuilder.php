<?php
/**
 * ScryDex persistence SQL template builder.
 *
 * @package TCGStorePlatform
 */

namespace TCGStorePlatform\ScryDex;

final class ScryDexPersistenceQueryBuilder {
	private const REFERENCE_CARDS_TABLE             = 'tcg_reference_cards';
	private const PROVIDER_PRICE_OBSERVATIONS_TABLE = 'tcg_provider_price_observations';
	private const REFERENCE_INSERT_COLUMNS          = array(
		'public_id',
		'provider_name',
		'provider_card_id',
		'game',
		'name',
		'normalized_name',
		'set_name',
		'set_code',
		'card_number',
		'printed_number',
		'rarity',
		'provider_updated_at',
		'search_text',
		'created_at',
		'updated_at',
		'row_version',
	);
	private const REFERENCE_UPDATABLE_COLUMNS       = array(
		'provider_name',
		'provider_card_id',
		'game',
		'name',
		'normalized_name',
		'set_name',
		'set_code',
		'card_number',
		'printed_number',
		'rarity',
		'provider_updated_at',
		'search_text',
		'updated_at',
		'row_version',
	);
	private const PRICE_OBSERVATION_COLUMNS         = array(
		'public_id',
		'reference_card_id',
		'provider_name',
		'provider_card_id',
		'game',
		'market_price',
		'currency',
		'source_observed_at',
		'provider_updated_at',
		'observed_at',
		'sync_job_id',
		'created_at',
	);

	public function build( ScryDexPersistencePlan $persistence_plan, string $table_prefix ): ScryDexPersistenceQueryBuildPlan {
		$errors       = array();
		$table_prefix = trim( $table_prefix );

		if ( '' === $table_prefix || 1 !== preg_match( '/^[A-Za-z0-9_]+$/', $table_prefix ) ) {
			$errors[] = 'scrydex_persistence_table_prefix_invalid';
		}

		if ( ScryDexPersistencePlan::FAILED === $persistence_plan->status() ) {
			$errors[] = 'scrydex_persistence_source_plan_failed';
		}

		$table_names = $this->table_names( $table_prefix );

		$reference_insert_queries = array();
		foreach ( $persistence_plan->reference_inserts() as $index => $row ) {
			$row_errors = $this->validate_reference_insert( $row, $index );

			if ( array() !== $row_errors ) {
				$errors = array_merge( $errors, $row_errors );
				continue;
			}

			$reference_insert_queries[] = $this->insert_query_for_row(
				$table_names['reference_cards'],
				self::REFERENCE_INSERT_COLUMNS,
				$row,
				array(
					'query_kind'       => 'reference_card_insert',
					'provider_card_id' => (string) $row['provider_card_id'],
				)
			);
		}

		$reference_update_queries = array();
		foreach ( $persistence_plan->reference_updates() as $index => $row ) {
			$row_errors = $this->validate_reference_update( $row, $index );

			if ( array() !== $row_errors ) {
				$errors = array_merge( $errors, $row_errors );
				continue;
			}

			$reference_update_queries[] = $this->reference_update_query_for_row(
				$table_names['reference_cards'],
				$row
			);
		}

		$price_observation_queries = array();
		foreach ( $persistence_plan->price_observations() as $index => $row ) {
			$row_errors = $this->validate_price_observation( $row, $index );

			if ( array() !== $row_errors ) {
				$errors = array_merge( $errors, $row_errors );
				continue;
			}

			$price_observation_queries[] = $this->price_observation_query_for_row(
				$table_names['provider_price_observations'],
				$row
			);
		}

		$checkpoint_upsert_query = null;
		$checkpoint              = $persistence_plan->next_checkpoint();

		if ( null === $checkpoint && ScryDexPersistencePlan::FAILED !== $persistence_plan->status() ) {
			$errors[] = 'scrydex_persistence_checkpoint_missing';
		}

		if ( null !== $checkpoint ) {
			$checkpoint_plan = ( new ScryDexSyncCheckpointRepositoryPlanner( $table_prefix ) )->plan( $checkpoint );
			if ( true !== ( $checkpoint_plan['repository_configured'] ?? false ) ) {
				$checkpoint_errors = $checkpoint_plan['configuration_issues'] ?? array();
				$errors            = array_merge(
					$errors,
					is_array( $checkpoint_errors ) ? $this->string_list( $checkpoint_errors ) : array( 'scrydex_checkpoint_repository_not_configured' )
				);
			} elseif ( is_array( $checkpoint_plan['upsert_query'] ?? null ) ) {
				$checkpoint_upsert_query = array_merge(
					$checkpoint_plan['upsert_query'],
					array(
						'query_kind'   => 'checkpoint_upsert',
						'resource_key' => $checkpoint->resource_key(),
					)
				);
			}
		}

		if ( array() !== $errors ) {
			return ScryDexPersistenceQueryBuildPlan::rejected(
				$persistence_plan,
				$table_names,
				$errors
			);
		}

		return ScryDexPersistenceQueryBuildPlan::accepted(
			$persistence_plan,
			$table_names,
			$reference_insert_queries,
			$reference_update_queries,
			$price_observation_queries,
			$checkpoint_upsert_query
		);
	}

	/**
	 * @return array<string, string>
	 */
	private function table_names( string $table_prefix ): array {
		return array(
			'reference_cards'             => $table_prefix . self::REFERENCE_CARDS_TABLE,
			'provider_price_observations' => $table_prefix . self::PROVIDER_PRICE_OBSERVATIONS_TABLE,
			'sync_checkpoints'            => $table_prefix . 'tcg_sync_checkpoints',
		);
	}

	/**
	 * @param array<string, mixed> $row Reference-card insert row.
	 * @return list<string>
	 */
	private function validate_reference_insert( array $row, int $index ): array {
		$errors = $this->validate_reference_identity( $row, 'reference_insert_row_' . $index );

		if ( ! $this->is_uuid( (string) ( $row['public_id'] ?? '' ) ) ) {
			$errors[] = 'reference_insert_row_' . $index . '_public_id_invalid';
		}

		foreach ( array( 'game', 'name', 'normalized_name' ) as $field ) {
			if ( '' === trim( (string) ( $row[ $field ] ?? '' ) ) ) {
				$errors[] = 'reference_insert_row_' . $index . '_' . $field . '_invalid';
			}
		}

		foreach ( array( 'created_at', 'updated_at' ) as $field ) {
			if ( ! $this->is_mysql_datetime( $row[ $field ] ?? null ) ) {
				$errors[] = 'reference_insert_row_' . $index . '_' . $field . '_invalid';
			}
		}

		if ( null === $this->positive_int( $row['row_version'] ?? null ) ) {
			$errors[] = 'reference_insert_row_' . $index . '_row_version_invalid';
		}

		return $errors;
	}

	/**
	 * @param array<string, mixed> $row Reference-card update row.
	 * @return list<string>
	 */
	private function validate_reference_update( array $row, int $index ): array {
		$errors = $this->validate_reference_identity( $row, 'reference_update_row_' . $index );

		if ( null === $this->positive_int( $row['reference_card_id'] ?? null ) ) {
			$errors[] = 'reference_update_row_' . $index . '_reference_card_id_invalid';
		}

		if ( ! $this->is_mysql_datetime( $row['updated_at'] ?? null ) ) {
			$errors[] = 'reference_update_row_' . $index . '_updated_at_invalid';
		}

		if ( null === $this->positive_int( $row['row_version'] ?? null ) ) {
			$errors[] = 'reference_update_row_' . $index . '_row_version_invalid';
		}

		return $errors;
	}

	/**
	 * @param array<string, mixed> $row Provider price observation row.
	 * @return list<string>
	 */
	private function validate_price_observation( array $row, int $index ): array {
		$errors = $this->validate_reference_identity( $row, 'price_observation_row_' . $index );

		if ( ! $this->is_uuid( (string) ( $row['public_id'] ?? '' ) ) ) {
			$errors[] = 'price_observation_row_' . $index . '_public_id_invalid';
		}

		if ( null !== ( $row['reference_card_id'] ?? null ) && null === $this->positive_int( $row['reference_card_id'] ) ) {
			$errors[] = 'price_observation_row_' . $index . '_reference_card_id_invalid';
		}

		if ( null !== ( $row['game'] ?? null ) && ! $this->is_slugish( (string) $row['game'], 1, 64 ) ) {
			$errors[] = 'price_observation_row_' . $index . '_game_invalid';
		}

		if ( ! $this->is_money( $row['market_price'] ?? null ) ) {
			$errors[] = 'price_observation_row_' . $index . '_market_price_invalid';
		}

		if ( ! $this->is_currency( (string) ( $row['currency'] ?? '' ) ) ) {
			$errors[] = 'price_observation_row_' . $index . '_currency_invalid';
		}

		foreach ( array( 'source_observed_at', 'provider_updated_at' ) as $field ) {
			if ( null !== ( $row[ $field ] ?? null ) && ! $this->is_mysql_datetime( $row[ $field ] ) ) {
				$errors[] = 'price_observation_row_' . $index . '_' . $field . '_invalid';
			}
		}

		if ( ! $this->is_mysql_datetime( $row['observed_at'] ?? null ) ) {
			$errors[] = 'price_observation_row_' . $index . '_observed_at_invalid';
		}

		if ( null !== ( $row['sync_job_id'] ?? null ) && null === $this->positive_int( $row['sync_job_id'] ) ) {
			$errors[] = 'price_observation_row_' . $index . '_sync_job_id_invalid';
		}

		return $errors;
	}

	/**
	 * @param array<string, mixed> $row Row with provider identity.
	 * @return list<string>
	 */
	private function validate_reference_identity( array $row, string $prefix ): array {
		$errors = array();

		if ( ! $this->is_slugish( (string) ( $row['provider_name'] ?? '' ), 1, 64 ) ) {
			$errors[] = $prefix . '_provider_name_invalid';
		}

		if ( ! $this->is_identifier( (string) ( $row['provider_card_id'] ?? '' ), 1, 191 ) ) {
			$errors[] = $prefix . '_provider_card_id_invalid';
		}

		return $errors;
	}

	/**
	 * @param list<string>         $columns Insert columns.
	 * @param array<string, mixed> $row Insert row.
	 * @param array<string, mixed> $metadata Query metadata.
	 * @return array<string, mixed>
	 */
	private function insert_query_for_row( string $table_name, array $columns, array $row, array $metadata ): array {
		$prepare_args = array();
		$placeholders = array();

		foreach ( $columns as $column ) {
			$placeholders[] = $this->placeholder_for_value( $row[ $column ] ?? null, $prepare_args );
		}

		return array_merge(
			$metadata,
			array(
				'sql_template'                         => sprintf(
					'INSERT INTO `%s` (%s) VALUES (%s)',
					$table_name,
					implode( ', ', array_map( array( $this, 'quote_identifier' ), $columns ) ),
					implode( ', ', $placeholders )
				),
				'prepare_args'                         => $prepare_args,
				'persistence_query_execution_deferred' => true,
			)
		);
	}

	/**
	 * @param array<string, mixed> $row Reference-card update row.
	 * @return array<string, mixed>
	 */
	private function reference_update_query_for_row( string $table_name, array $row ): array {
		$prepare_args = array();
		$assignments  = array();

		foreach ( self::REFERENCE_UPDATABLE_COLUMNS as $column ) {
			if ( ! array_key_exists( $column, $row ) ) {
				continue;
			}

			$assignments[] = $this->quote_identifier( $column ) . ' = ' . $this->placeholder_for_value( $row[ $column ], $prepare_args );
		}

		$prepare_args[] = (int) $row['reference_card_id'];
		$prepare_args[] = (string) $row['provider_name'];
		$prepare_args[] = (string) $row['provider_card_id'];

		return array(
			'query_kind'                               => 'reference_card_update',
			'provider_card_id'                         => (string) $row['provider_card_id'],
			'reference_card_id'                        => (int) $row['reference_card_id'],
			'sql_template'                             => sprintf(
				'UPDATE `%s` SET %s WHERE reference_card_id = %%d AND provider_name = %%s AND provider_card_id = %%s LIMIT 1',
				$table_name,
				implode( ', ', $assignments )
			),
			'prepare_args'                             => $prepare_args,
			'persistence_query_execution_deferred'     => true,
			'reference_card_update_execution_deferred' => true,
		);
	}

	/**
	 * @param array<string, mixed> $row Provider price observation row.
	 * @return array<string, mixed>
	 */
	private function price_observation_query_for_row( string $table_name, array $row ): array {
		$row = array_merge(
			$row,
			array(
				'created_at' => $row['planned_at'] ?? $row['observed_at'],
			)
		);

		$query = $this->insert_query_for_row(
			$table_name,
			self::PRICE_OBSERVATION_COLUMNS,
			$row,
			array(
				'query_kind'       => 'provider_price_observation_insert',
				'provider_card_id' => (string) $row['provider_card_id'],
				'public_id'        => (string) $row['public_id'],
			)
		);

		$query['sql_template']                                       .= ' ON DUPLICATE KEY UPDATE provider_price_observation_id = provider_price_observation_id';
		$query['provider_price_observation_write_execution_deferred'] = true;

		return $query;
	}

	/**
	 * @param list<mixed> $prepare_args Prepared SQL args.
	 */
	private function placeholder_for_value( mixed $value, array &$prepare_args ): string {
		if ( null === $value || '' === $value ) {
			return 'NULL';
		}

		if ( is_int( $value ) ) {
			$prepare_args[] = $value;

			return '%d';
		}

		$prepare_args[] = (string) $value;

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

	private function is_uuid( string $value ): bool {
		return 1 === preg_match( '/^[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$/', trim( $value ) );
	}

	private function is_identifier( string $value, int $minimum, int $maximum ): bool {
		$value = trim( $value );

		return 1 === preg_match( '/^[a-zA-Z0-9._:-]{' . $minimum . ',' . $maximum . '}$/', $value );
	}

	private function is_slugish( string $value, int $minimum, int $maximum ): bool {
		$value = trim( $value );

		return 1 === preg_match( '/^[a-z0-9_-]{' . $minimum . ',' . $maximum . '}$/', $value );
	}

	private function is_money( mixed $value ): bool {
		$value = trim( (string) $value );

		return 1 === preg_match( '/^\d+(?:\.\d{1,4})?$/', $value );
	}

	private function is_currency( string $value ): bool {
		return 1 === preg_match( '/^[A-Z]{3}$/', trim( $value ) );
	}

	private function is_mysql_datetime( mixed $value ): bool {
		$value = trim( (string) $value );

		return 1 === preg_match( '/^\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}(?:\.\d{1,6})?$/', $value );
	}

	private function quote_identifier( string $identifier ): string {
		return '`' . $identifier . '`';
	}

	/**
	 * @param list<mixed> $values Values to coerce into strings.
	 * @return list<string>
	 */
	private function string_list( array $values ): array {
		$strings = array();

		foreach ( $values as $value ) {
			$value = trim( (string) $value );

			if ( '' !== $value ) {
				$strings[] = $value;
			}
		}

		return array_values( array_unique( $strings ) );
	}
}
