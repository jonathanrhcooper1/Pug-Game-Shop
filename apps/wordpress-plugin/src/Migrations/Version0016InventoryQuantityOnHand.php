<?php
/**
 * Ensures inventory quantity tracking exists for LAN/app updates.
 *
 * @package TCGStorePlatform
 */

namespace TCGStorePlatform\Migrations;

final class Version0016InventoryQuantityOnHand implements Migration {
	public function version(): int {
		return 16;
	}

	public function name(): string {
		return 'inventory_quantity_on_hand';
	}

	public function up( \wpdb $database ): void {
		$table_name = $database->prefix . 'tcg_inventory_items';

		$this->add_column_if_missing( $database, $table_name, 'quantity_on_hand', 'int(10) unsigned NOT NULL DEFAULT 1 AFTER minimum_sale_price' );
	}

	public function down( \wpdb $database ): void {
		$table_name = $database->prefix . 'tcg_inventory_items';

		$this->drop_column_if_present( $database, $table_name, 'quantity_on_hand' );
	}

	public function checksum(): string {
		return hash( 'sha256', 'tcg_inventory_items.quantity_on_hand.v1' );
	}

	private function add_column_if_missing( \wpdb $database, string $table_name, string $column, string $definition ): void {
		if ( $this->column_exists( $database, $table_name, $column ) ) {
			return;
		}

		$result = $database->query( "ALTER TABLE `{$table_name}` ADD COLUMN `{$column}` {$definition}" ); // phpcs:ignore WordPress.DB.PreparedSQL.InterpolatedNotPrepared

		if ( false === $result ) {
			throw new \RuntimeException( 'Unable to add inventory quantity column: ' . $database->last_error );
		}
	}

	private function drop_column_if_present( \wpdb $database, string $table_name, string $column ): void {
		if ( ! $this->column_exists( $database, $table_name, $column ) ) {
			return;
		}

		$result = $database->query( "ALTER TABLE `{$table_name}` DROP COLUMN `{$column}`" ); // phpcs:ignore WordPress.DB.PreparedSQL.InterpolatedNotPrepared

		if ( false === $result ) {
			throw new \RuntimeException( 'Unable to drop inventory quantity column: ' . $database->last_error );
		}
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
}
