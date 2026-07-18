<?php
/**
 * Add authoritative projected quantity to website inventory rows.
 *
 * @package TCGStorePlatform
 */

namespace TCGStorePlatform\Migrations;

final class Version0017InventoryProjectionQuantity implements Migration {
	public function version(): int {
		return 17;
	}

	public function name(): string {
		return 'inventory_projection_quantity';
	}

	public function up( \wpdb $database ): void {
		$table_name = $database->prefix . 'tcg_inventory_items';
		$database->query(
			"ALTER TABLE `{$table_name}`
				ADD quantity_on_hand int(10) unsigned NOT NULL DEFAULT 1 AFTER status,
				ADD KEY projection_quantity (status, quantity_on_hand, online_visibility)" // phpcs:ignore WordPress.DB.PreparedSQL.InterpolatedNotPrepared
		);
		if ( '' !== (string) $database->last_error ) {
			throw new \RuntimeException( 'Unable to add inventory projection quantity: ' . $database->last_error );
		}

		$database->query(
			"UPDATE `{$table_name}` SET quantity_on_hand = 0 WHERE status IN ('sold', 'removed', 'returned', 'archived')" // phpcs:ignore WordPress.DB.PreparedSQL.InterpolatedNotPrepared
		);
	}

	public function down( \wpdb $database ): void {
		$table_name = $database->prefix . 'tcg_inventory_items';
		$database->query(
			"ALTER TABLE `{$table_name}` DROP INDEX projection_quantity, DROP COLUMN quantity_on_hand" // phpcs:ignore WordPress.DB.PreparedSQL.InterpolatedNotPrepared
		);
	}

	public function checksum(): string {
		return hash( 'sha256', 'inventory_projection_quantity.v1' );
	}
}
