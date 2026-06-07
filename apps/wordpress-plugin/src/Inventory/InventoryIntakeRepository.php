<?php
/**
 * Inventory intake wpdb repository adapter.
 *
 * @package TCGStorePlatform
 */

namespace TCGStorePlatform\Inventory;

final class InventoryIntakeRepository {
	public function __construct(
		private \wpdb $database
	) {
	}

	public function create( InventoryIntakePersistencePlan $plan ): InventoryIntakeRepositoryResult {
		if ( ! $plan->is_valid() ) {
			return InventoryIntakeRepositoryResult::rejected(
				$plan,
				$plan->errors()
			);
		}

		$table_errors = $this->validate_table_name( $plan );
		if ( array() !== $table_errors ) {
			return InventoryIntakeRepositoryResult::rejected(
				$plan,
				$table_errors
			);
		}

		$identity_errors = $this->validate_unique_identity( $plan );
		if ( array() !== $identity_errors ) {
			return InventoryIntakeRepositoryResult::rejected(
				$plan,
				$identity_errors
			);
		}

		$transaction_commands = array();

		if ( false === $this->run_transaction_command( 'START TRANSACTION', $transaction_commands ) ) {
			return InventoryIntakeRepositoryResult::rejected(
				$plan,
				array( 'inventory_intake_transaction_begin_failed' ),
				null,
				$transaction_commands
			);
		}

		$rows_affected = $this->execute_prepared_insert(
			$plan->insert_sql_template(),
			$plan->prepare_args()
		);

		if ( false === $rows_affected ) {
			$errors = array( 'inventory_intake_insert_failed' );
			$this->rollback_transaction( $transaction_commands, $errors );

			return InventoryIntakeRepositoryResult::rejected(
				$plan,
				$errors,
				null,
				$transaction_commands
			);
		}

		$rows_affected = (int) $rows_affected;

		if ( 1 === $rows_affected ) {
			$insert_id = $this->insert_id();
			if ( null === $insert_id ) {
				$errors = array( 'inventory_intake_insert_id_missing' );
				$this->rollback_transaction( $transaction_commands, $errors );

				return InventoryIntakeRepositoryResult::rejected(
					$plan,
					$errors,
					$rows_affected,
					$transaction_commands
				);
			}

			$price_log_rows = $this->insert_initial_price_change_log( $plan, $insert_id );
			if ( false === $price_log_rows ) {
				$errors = array( 'inventory_price_change_log_insert_failed' );
				$this->rollback_transaction( $transaction_commands, $errors );

				return InventoryIntakeRepositoryResult::rejected(
					$plan,
					$errors,
					$rows_affected,
					$transaction_commands
				);
			}

			$price_log_rows = (int) $price_log_rows;
			if ( 1 !== $price_log_rows ) {
				$errors = array(
					0 === $price_log_rows
						? 'inventory_price_change_log_insert_no_rows'
						: 'inventory_price_change_log_insert_unexpected_rows',
				);
				$this->rollback_transaction( $transaction_commands, $errors );

				return InventoryIntakeRepositoryResult::rejected(
					$plan,
					$errors,
					$rows_affected,
					$transaction_commands
				);
			}

			if ( false === $this->run_transaction_command( 'COMMIT', $transaction_commands ) ) {
				$errors = array( 'inventory_intake_transaction_commit_failed' );
				$this->rollback_transaction( $transaction_commands, $errors );

				return InventoryIntakeRepositoryResult::rejected(
					$plan,
					$errors,
					$rows_affected,
					$transaction_commands
				);
			}

			return InventoryIntakeRepositoryResult::inserted(
				$plan,
				$rows_affected,
				$insert_id,
				$price_log_rows,
				$transaction_commands
			);
		}

		if ( 0 === $rows_affected ) {
			$errors = array( 'inventory_intake_insert_no_rows' );
			$this->rollback_transaction( $transaction_commands, $errors );

			return InventoryIntakeRepositoryResult::rejected(
				$plan,
				$errors,
				$rows_affected,
				$transaction_commands
			);
		}

		$errors = array( 'inventory_intake_insert_unexpected_rows' );
		$this->rollback_transaction( $transaction_commands, $errors );

		return InventoryIntakeRepositoryResult::rejected(
			$plan,
			$errors,
			$rows_affected,
			$transaction_commands
		);
	}

	/**
	 * @return list<string>
	 */
	private function validate_table_name( InventoryIntakePersistencePlan $plan ): array {
		$prefix = (string) ( $this->database->prefix ?? '' );

		if (
			'' === $prefix
			|| 1 !== preg_match( '/^[A-Za-z0-9_]+$/', $prefix )
			|| $plan->table_name() !== $prefix . 'tcg_inventory_items'
		) {
			return array( 'inventory_intake_table_prefix_mismatch' );
		}

		return array();
	}

	/**
	 * @return list<string>
	 */
	private function validate_unique_identity( InventoryIntakePersistencePlan $plan ): array {
		$row     = $plan->insert_row();
		$barcode = trim( (string) ( $row['barcode'] ?? '' ) );
		$sku     = trim( (string) ( $row['sku'] ?? '' ) );

		if ( '' === $barcode && '' === $sku ) {
			return array();
		}

		$query = $this->database->prepare(
			'SELECT barcode, sku FROM `' . $plan->table_name() . '` WHERE barcode = %s OR sku = %s LIMIT 1',
			array(
				$barcode,
				$sku,
			)
		);

		if ( ! is_string( $query ) || '' === $query ) {
			return array( 'inventory_intake_identity_check_failed' );
		}

		$existing = $this->database->get_row(
			$query, // phpcs:ignore WordPress.DB.PreparedSQL.NotPrepared
			$this->array_output_type()
		);

		if ( null === $existing ) {
			return array();
		}

		if ( ! is_array( $existing ) ) {
			return array( 'inventory_intake_identity_check_failed' );
		}

		$errors = array();

		if ( '' !== $barcode && (string) ( $existing['barcode'] ?? '' ) === $barcode ) {
			$errors[] = 'barcode_already_exists';
		}

		if ( '' !== $sku && (string) ( $existing['sku'] ?? '' ) === $sku ) {
			$errors[] = 'sku_already_exists';
		}

		return array() === $errors ? array( 'inventory_identity_already_exists' ) : $errors;
	}

	private function insert_id(): ?int {
		$insert_id = $this->database->insert_id ?? null;

		if ( ! is_numeric( $insert_id ) ) {
			return null;
		}

		$insert_id = (int) $insert_id;

		if ( $insert_id <= 0 ) {
			return null;
		}

		return $insert_id;
	}

	/**
	 * @param list<mixed> $prepare_args Prepared SQL arguments.
	 */
	private function execute_prepared_insert( string $sql_template, array $prepare_args ): int|false {
		$prepared_sql = $this->database->prepare(
			$sql_template, // phpcs:ignore WordPress.DB.PreparedSQL.NotPrepared
			$prepare_args
		);

		if ( ! is_string( $prepared_sql ) || '' === $prepared_sql ) {
			return false;
		}

		return $this->database->query(
			$prepared_sql // phpcs:ignore WordPress.DB.PreparedSQL.NotPrepared
		);
	}

	private function insert_initial_price_change_log(
		InventoryIntakePersistencePlan $plan,
		int $inventory_id
	): int|false {
		$row = $this->initial_price_change_log_row( $plan, $inventory_id );
		$sql = $this->insert_sql(
			(string) ( $this->database->prefix ?? '' ) . 'tcg_price_change_log',
			$row,
			$prepare_args
		);

		return $this->execute_prepared_insert( $sql, $prepare_args );
	}

	/**
	 * @return array<string, mixed>
	 */
	private function initial_price_change_log_row(
		InventoryIntakePersistencePlan $plan,
		int $inventory_id
	): array {
		$row        = $plan->insert_row();
		$created_at = trim( (string) ( $row['created_at'] ?? '' ) );

		if ( '' === $created_at ) {
			$created_at = gmdate( 'Y-m-d H:i:s.u' );
		}

		return array(
			'public_id'           => $this->stable_uuid( 'price-change:' . (string) ( $row['public_id'] ?? '' ) . ':initial' ),
			'inventory_id'        => $inventory_id,
			'old_market_price'    => null,
			'new_market_price'    => $this->nullable_money( $row['market_price'] ?? null ),
			'old_suggested_price' => null,
			'new_suggested_price' => $this->nullable_money( $row['suggested_price'] ?? null ),
			'old_sale_price'      => null,
			'new_sale_price'      => $this->money_or_zero( $row['sale_price'] ?? null ),
			'minimum_sale_price'  => $this->money_or_zero( $row['minimum_sale_price'] ?? null ),
			'currency'            => $this->currency_or_usd( $row['sale_currency'] ?? null ),
			'floor_hit'           => true === (bool) ( $row['price_floor_hit'] ?? false ) ? 1 : 0,
			'change_source'       => $this->string_or_default( $row['pricing_source'] ?? null, 'inventory_intake' ),
			'formula'             => $this->nullable_string( $row['pricing_formula'] ?? null ),
			'reason'              => 'initial_inventory_intake',
			'actor_user_id'       => $this->nullable_positive_int( $row['created_by'] ?? null ),
			'job_id'              => null,
			'created_at'          => $created_at,
		);
	}

	/**
	 * @param array<string, mixed> $row Insert row.
	 * @param list<mixed>         $prepare_args Prepared arguments.
	 */
	private function insert_sql( string $table_name, array $row, ?array &$prepare_args ): string {
		$prepare_args = array();
		$columns      = array();
		$values       = array();

		foreach ( $row as $column => $value ) {
			$columns[] = '`' . $column . '`';

			if ( null === $value ) {
				$values[] = 'NULL';
				continue;
			}

			if ( is_int( $value ) ) {
				$values[]       = '%d';
				$prepare_args[] = $value;
				continue;
			}

			$values[]       = '%s';
			$prepare_args[] = (string) $value;
		}

		return 'INSERT INTO `' . $table_name . '` (' . implode( ', ', $columns ) . ') VALUES (' . implode( ', ', $values ) . ')';
	}

	/**
	 * @param list<string> $transaction_commands Transaction commands.
	 */
	private function run_transaction_command( string $command, array &$transaction_commands ): int|false {
		$transaction_commands[] = $command;

		return $this->database->query( $command );
	}

	/**
	 * @param list<string> $transaction_commands Transaction commands.
	 * @param list<string> $errors Error codes.
	 */
	private function rollback_transaction( array &$transaction_commands, array &$errors ): void {
		if ( false === $this->run_transaction_command( 'ROLLBACK', $transaction_commands ) ) {
			$errors[] = 'inventory_intake_transaction_rollback_failed';
		}
	}

	private function stable_uuid( string $seed ): string {
		$hex = hash( 'sha256', $seed );

		return substr( $hex, 0, 8 )
			. '-' . substr( $hex, 8, 4 )
			. '-' . substr( $hex, 12, 4 )
			. '-' . substr( $hex, 16, 4 )
			. '-' . substr( $hex, 20, 12 );
	}

	private function nullable_money( mixed $value ): ?string {
		$value = trim( (string) $value );

		return 1 === preg_match( '/^\d+(?:\.\d{1,4})?$/', $value ) ? $value : null;
	}

	private function money_or_zero( mixed $value ): string {
		return $this->nullable_money( $value ) ?? '0.00';
	}

	private function currency_or_usd( mixed $value ): string {
		$value = strtoupper( trim( (string) $value ) );

		return 1 === preg_match( '/^[A-Z]{3}$/', $value ) ? $value : 'USD';
	}

	private function string_or_default( mixed $value, string $fallback ): string {
		$value = $this->nullable_string( $value );

		return null === $value ? $fallback : $value;
	}

	private function nullable_string( mixed $value ): ?string {
		$value = trim( (string) $value );

		return '' === $value ? null : $value;
	}

	private function nullable_positive_int( mixed $value ): ?int {
		if ( null === $value || '' === trim( (string) $value ) ) {
			return null;
		}

		if ( is_int( $value ) && $value > 0 ) {
			return $value;
		}

		if ( is_string( $value ) && 1 === preg_match( '/^\d+$/', $value ) && (int) $value > 0 ) {
			return (int) $value;
		}

		return null;
	}

	private function array_output_type(): string {
		return defined( 'ARRAY_A' ) ? (string) constant( 'ARRAY_A' ) : 'ARRAY_A';
	}
}
