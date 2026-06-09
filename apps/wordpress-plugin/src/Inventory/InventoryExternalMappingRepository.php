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
			return $this->result( 'inventory_external_mapping_update', 'rejected', array( 'inventory_external_mapping_ids_invalid' ), 0, null );
		}

		$table_name = (string) ( $this->database->prefix ?? '' ) . 'tcg_inventory_items';
		if ( array() !== $this->validate_table_name( $table_name ) ) {
			return $this->result( 'inventory_external_mapping_update', 'rejected', array( 'inventory_external_mapping_table_prefix_mismatch' ), 0, null );
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
			return $this->result( 'inventory_external_mapping_update', 'rejected', array( 'inventory_external_mapping_prepare_failed' ), 0, null );
		}

		$rows = $this->database->query( $sql ); // phpcs:ignore WordPress.DB.PreparedSQL.NotPrepared

		if ( false === $rows ) {
			return $this->result( 'inventory_external_mapping_update', 'rejected', array( 'inventory_external_mapping_update_failed' ), 0, $sql );
		}

		$rows = (int) $rows;
		if ( 1 !== $rows ) {
			return $this->result(
				'inventory_external_mapping_update',
				'rejected',
				array( 0 === $rows ? 'inventory_external_mapping_update_no_rows' : 'inventory_external_mapping_update_unexpected_rows' ),
				$rows,
				$sql
			);
		}

		return $this->result( 'inventory_external_mapping_update', 'synced', array(), $rows, $sql );
	}

	/**
	 * @return array<string, mixed>
	 */
	public function mark_square_catalog_synced( int $inventory_id, string $catalog_item_id, string $catalog_variation_id ): array {
		$catalog_item_id      = $this->external_id( $catalog_item_id );
		$catalog_variation_id = $this->external_id( $catalog_variation_id );

		if ( $inventory_id <= 0 || '' === $catalog_item_id || '' === $catalog_variation_id ) {
			return $this->result(
				'square_catalog_mapping_update',
				'rejected',
				array( 'square_catalog_mapping_ids_invalid' ),
				0,
				null,
				array(
					'square_catalog_item_id'      => $catalog_item_id,
					'square_catalog_variation_id' => $catalog_variation_id,
					'square_deferred'             => false,
					'woocommerce_deferred'        => true,
				)
			);
		}

		$table_name = (string) ( $this->database->prefix ?? '' ) . 'tcg_inventory_items';
		if ( array() !== $this->validate_table_name( $table_name ) ) {
			return $this->result(
				'square_catalog_mapping_update',
				'rejected',
				array( 'inventory_external_mapping_table_prefix_mismatch' ),
				0,
				null,
				array(
					'square_catalog_item_id'      => $catalog_item_id,
					'square_catalog_variation_id' => $catalog_variation_id,
					'square_deferred'             => false,
					'woocommerce_deferred'        => true,
				)
			);
		}

		$now = gmdate( 'Y-m-d H:i:s.u' );
		$sql = $this->database->prepare(
			"UPDATE `{$table_name}` SET `square_catalog_item_id` = %s, `square_catalog_variation_id` = %s, `external_sync_state` = %s, `last_external_sync_at` = %s, `updated_at` = %s, `row_version` = `row_version` + 1 WHERE `inventory_id` = %d LIMIT 1", // phpcs:ignore WordPress.DB.PreparedSQL.InterpolatedNotPrepared
			array(
				$catalog_item_id,
				$catalog_variation_id,
				'square_synced',
				$now,
				$now,
				$inventory_id,
			)
		);

		if ( ! is_string( $sql ) || '' === $sql ) {
			return $this->result(
				'square_catalog_mapping_update',
				'rejected',
				array( 'inventory_external_mapping_prepare_failed' ),
				0,
				null,
				array(
					'square_catalog_item_id'      => $catalog_item_id,
					'square_catalog_variation_id' => $catalog_variation_id,
					'square_deferred'             => false,
					'woocommerce_deferred'        => true,
				)
			);
		}

		$rows = $this->database->query( $sql ); // phpcs:ignore WordPress.DB.PreparedSQL.NotPrepared

		if ( false === $rows ) {
			return $this->result(
				'square_catalog_mapping_update',
				'rejected',
				array( 'square_catalog_mapping_update_failed' ),
				0,
				$sql,
				array(
					'square_catalog_item_id'      => $catalog_item_id,
					'square_catalog_variation_id' => $catalog_variation_id,
					'square_deferred'             => false,
					'woocommerce_deferred'        => true,
				)
			);
		}

		$rows = (int) $rows;
		if ( 1 !== $rows ) {
			return $this->result(
				'square_catalog_mapping_update',
				'rejected',
				array( 0 === $rows ? 'square_catalog_mapping_update_no_rows' : 'square_catalog_mapping_update_unexpected_rows' ),
				$rows,
				$sql,
				array(
					'square_catalog_item_id'      => $catalog_item_id,
					'square_catalog_variation_id' => $catalog_variation_id,
					'square_deferred'             => false,
					'woocommerce_deferred'        => true,
				)
			);
		}

		return $this->result(
			'square_catalog_mapping_update',
			'square_synced',
			array(),
			$rows,
			$sql,
			array(
				'square_catalog_item_id'      => $catalog_item_id,
				'square_catalog_variation_id' => $catalog_variation_id,
				'square_deferred'             => false,
				'woocommerce_deferred'        => true,
			)
		);
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
	 * @param array<string, mixed> $extra Extra result fields.
	 * @return array<string, mixed>
	 */
	private function result( string $action, string $status, array $errors, int $rows_affected, ?string $sql, array $extra = array() ): array {
		return array_merge(
			array(
				'action'             => $action,
				'status'             => $status,
				'synced'             => in_array( $status, array( 'synced', 'square_synced' ), true ),
				'rows_affected'      => $rows_affected,
				'sql_prepared'       => null !== $sql,
				'payment_deferred'   => true,
				'square_deferred'    => true,
				'source_of_truth'    => 'tcg_store_platform',
				'errors'             => array_values( array_unique( $errors ) ),
			),
			$extra
		);
	}

	private function external_id( string $value ): string {
		return substr( trim( $value ), 0, 191 );
	}
}
