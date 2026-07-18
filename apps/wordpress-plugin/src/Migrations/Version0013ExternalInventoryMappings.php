<?php
/**
 * External inventory mapping columns for WooCommerce/Square sync.
 *
 * @package TCGStorePlatform
 */

namespace TCGStorePlatform\Migrations;

final class Version0013ExternalInventoryMappings implements Migration {
	public function version(): int {
		return 13;
	}

	public function name(): string {
		return 'external_inventory_mappings';
	}

	public function up( \wpdb $database ): void {
		$table_name = $database->prefix . 'tcg_inventory_items';

		$this->add_column_if_missing( $database, $table_name, 'woocommerce_product_id', 'bigint(20) unsigned NULL' );
		$this->add_column_if_missing( $database, $table_name, 'square_catalog_item_id', 'varchar(191) NULL' );
		$this->add_column_if_missing( $database, $table_name, 'square_catalog_variation_id', 'varchar(191) NULL' );
		$this->add_column_if_missing( $database, $table_name, 'external_sync_state', "varchar(32) NOT NULL DEFAULT 'pending'" );
		$this->add_column_if_missing( $database, $table_name, 'last_external_sync_at', 'datetime(6) NULL' );
		$this->add_index_if_missing( $database, $table_name, 'woocommerce_product', '(`woocommerce_product_id`)' );
		$this->add_index_if_missing( $database, $table_name, 'square_catalog_variation', '(`square_catalog_variation_id`)' );
		$this->add_index_if_missing( $database, $table_name, 'external_sync_state', '(`external_sync_state`, `last_external_sync_at`)' );
	}

	public function down( \wpdb $database ): void {
		$table_name = $database->prefix . 'tcg_inventory_items';

		$this->drop_index_if_present( $database, $table_name, 'external_sync_state' );
		$this->drop_index_if_present( $database, $table_name, 'square_catalog_variation' );
		$this->drop_index_if_present( $database, $table_name, 'woocommerce_product' );
		$this->drop_column_if_present( $database, $table_name, 'last_external_sync_at' );
		$this->drop_column_if_present( $database, $table_name, 'external_sync_state' );
		$this->drop_column_if_present( $database, $table_name, 'square_catalog_variation_id' );
		$this->drop_column_if_present( $database, $table_name, 'square_catalog_item_id' );
		$this->drop_column_if_present( $database, $table_name, 'woocommerce_product_id' );
	}

	public function checksum(): string {
		return hash( 'sha256', 'tcg_inventory_items.external_inventory_mappings.v1' );
	}

	private function add_column_if_missing( \wpdb $database, string $table_name, string $column, string $definition ): void {
		if ( $this->column_exists( $database, $table_name, $column ) ) {
			return;
		}

		$database->query( "ALTER TABLE `{$table_name}` ADD COLUMN `{$column}` {$definition}" ); // phpcs:ignore WordPress.DB.PreparedSQL.InterpolatedNotPrepared
	}

	private function drop_column_if_present( \wpdb $database, string $table_name, string $column ): void {
		if ( ! $this->column_exists( $database, $table_name, $column ) ) {
			return;
		}

		$database->query( "ALTER TABLE `{$table_name}` DROP COLUMN `{$column}`" ); // phpcs:ignore WordPress.DB.PreparedSQL.InterpolatedNotPrepared
	}

	private function add_index_if_missing( \wpdb $database, string $table_name, string $index, string $definition ): void {
		if ( $this->index_exists( $database, $table_name, $index ) ) {
			return;
		}

		$database->query( "ALTER TABLE `{$table_name}` ADD KEY `{$index}` {$definition}" ); // phpcs:ignore WordPress.DB.PreparedSQL.InterpolatedNotPrepared
	}

	private function drop_index_if_present( \wpdb $database, string $table_name, string $index ): void {
		if ( ! $this->index_exists( $database, $table_name, $index ) ) {
			return;
		}

		$database->query( "ALTER TABLE `{$table_name}` DROP INDEX `{$index}`" ); // phpcs:ignore WordPress.DB.PreparedSQL.InterpolatedNotPrepared
	}

	private function column_exists( \wpdb $database, string $table_name, string $column ): bool {
		$found = $database->get_var(
			$database->prepare(
				'SHOW COLUMNS FROM `' . $table_name . '` LIKE %s', // phpcs:ignore WordPress.DB.PreparedSQL.NotPrepared
				$column
			)
		);

		return null !== $found;
	}

	private function index_exists( \wpdb $database, string $table_name, string $index ): bool {
		$found = $database->get_var(
			$database->prepare(
				'SHOW INDEX FROM `' . $table_name . '` WHERE Key_name = %s', // phpcs:ignore WordPress.DB.PreparedSQL.NotPrepared
				$index
			)
		);

		return null !== $found;
	}
}
