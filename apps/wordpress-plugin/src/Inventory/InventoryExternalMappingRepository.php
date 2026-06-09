<?php
/**
 * Persist external WooCommerce/Square identifiers on inventory rows.
 *
 * @package TCGStorePlatform
 */

namespace TCGStorePlatform\Inventory;

final class InventoryExternalMappingRepository {
	public function __construct(
		private \wpdb $database
	) {
	}

	/**
	 * @return array<string, mixed>
	 */
	public function mark_woocommerce_product_synced( int $inventory_id, int $product_id ): array {
		if ( $inventory_id <= 0 || $product_id <= 0 ) {
			return $this->result( 'rejected', array( 'inventory_external_mapping_ids_invalid' ), 0, null );
		}

		$table_name = (string) ( $this->database->prefix ?? '' ) . 'tcg_inventory_items';
		if ( array() !== $this->validate_table_name( $table_name ) ) {
			return $this->result( 'rejected', array( 'inventory_external_mapping_table_prefix_mismatch' ), 0, null );
		}

		$now = gmdate( 'Y-m-d H:i:s.u' );
		$sql = $this->database->prepare(
			"UPDATE `{$table_name}` SET `woocommerce_product_id` = %d, `external_sync_state` = %s, `last_external_sync_at` = %s, `updated_at` = %s, `row_version` = `row_version` + 1 WHERE `inventory_id` = %d LIMIT 1", // phpcs:ignore WordPress.DB.PreparedSQL.InterpolatedNotPrepared
			array(
				$product_id,
				'synced',
				$now,
				$now,
				$inventory_id,
			)
		);

		if ( ! is_string( $sql ) || '' === $sql ) {
			return $this->result( 'rejected', array( 'inventory_external_mapping_prepare_failed' ), 0, null );
		}

		$rows = $this->database->query( $sql ); // phpcs:ignore WordPress.DB.PreparedSQL.NotPrepared

		if ( false === $rows ) {
			return $this->result( 'rejected', array( 'inventory_external_mapping_update_failed' ), 0, $sql );
		}

		$rows = (int) $rows;
		if ( 1 !== $rows ) {
			return $this->result(
				'rejected',
				array( 0 === $rows ? 'inventory_external_mapping_update_no_rows' : 'inventory_external_mapping_update_unexpected_rows' ),
				$rows,
				$sql
			);
		}

		return $this->result( 'synced', array(), $rows, $sql );
	}

	/**
	 * @return list<string>
	 */
	private function validate_table_name( string $table_name ): array {
		$prefix = (string) ( $this->database->prefix ?? '' );

		if (
			'' === $prefix
			|| 1 !== preg_match( '/^[A-Za-z0-9_]+$/', $prefix )
			|| $table_name !== $prefix . 'tcg_inventory_items'
		) {
			return array( 'inventory_external_mapping_table_prefix_mismatch' );
		}

		return array();
	}

	/**
	 * @param list<string> $errors Result errors.
	 * @return array<string, mixed>
	 */
	private function result( string $status, array $errors, int $rows_affected, ?string $sql ): array {
		return array(
			'action'             => 'inventory_external_mapping_update',
			'status'             => $status,
			'synced'             => 'synced' === $status,
			'rows_affected'      => $rows_affected,
			'sql_prepared'       => null !== $sql,
			'payment_deferred'   => true,
			'square_deferred'    => true,
			'source_of_truth'    => 'tcg_store_platform',
			'errors'             => array_values( array_unique( $errors ) ),
		);
	}
}
