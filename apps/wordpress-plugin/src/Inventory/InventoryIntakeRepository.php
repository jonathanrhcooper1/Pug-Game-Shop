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

		$prepared_sql = $this->database->prepare(
			$plan->insert_sql_template(), // phpcs:ignore WordPress.DB.PreparedSQL.NotPrepared
			$plan->prepare_args()
		);

		if ( ! is_string( $prepared_sql ) || '' === $prepared_sql ) {
			return InventoryIntakeRepositoryResult::rejected(
				$plan,
				array( 'inventory_intake_prepare_failed' )
			);
		}

		$rows_affected = $this->database->query(
			$prepared_sql // phpcs:ignore WordPress.DB.PreparedSQL.NotPrepared
		);

		if ( false === $rows_affected ) {
			return InventoryIntakeRepositoryResult::rejected(
				$plan,
				array( 'inventory_intake_insert_failed' )
			);
		}

		$rows_affected = (int) $rows_affected;

		if ( 1 === $rows_affected ) {
			return InventoryIntakeRepositoryResult::inserted(
				$plan,
				$rows_affected,
				$this->insert_id()
			);
		}

		if ( 0 === $rows_affected ) {
			return InventoryIntakeRepositoryResult::rejected(
				$plan,
				array( 'inventory_intake_insert_no_rows' ),
				$rows_affected
			);
		}

		return InventoryIntakeRepositoryResult::rejected(
			$plan,
			array( 'inventory_intake_insert_unexpected_rows' ),
			$rows_affected
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
}
