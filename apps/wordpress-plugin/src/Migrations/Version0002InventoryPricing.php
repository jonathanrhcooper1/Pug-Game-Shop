<?php
/**
 * Inventory and pricing schema migration.
 *
 * @package TCGStorePlatform
 */

namespace TCGStorePlatform\Migrations;

final class Version0002InventoryPricing implements Migration {
	public function version(): int {
		return 2;
	}

	public function name(): string {
		return 'inventory_pricing';
	}

	public function up( \wpdb $database ): void {
		require_once ABSPATH . 'wp-admin/includes/upgrade.php';

		$tables = InventoryPricingSchema::tables(
			$database->prefix,
			$database->get_charset_collate()
		);

		foreach ( $tables as $sql ) {
			dbDelta( $sql );
		}

		foreach ( array_keys( $tables ) as $table_name ) {
			$found = $database->get_var(
				$database->prepare( 'SHOW TABLES LIKE %s', $database->esc_like( $table_name ) )
			);

			if ( $found !== $table_name ) {
				throw new \RuntimeException( 'Database migration did not create expected table: ' . $table_name );
			}
		}
	}

	public function down( \wpdb $database ): void {
		foreach ( InventoryPricingSchema::drop_order( $database->prefix ) as $table_name ) {
			$database->query( "DROP TABLE IF EXISTS `{$table_name}`" ); // phpcs:ignore WordPress.DB.PreparedSQL.InterpolatedNotPrepared
		}
	}

	public function checksum(): string {
		return hash(
			'sha256',
			implode(
				"\n",
				InventoryPricingSchema::tables( 'wp_', 'DEFAULT CHARACTER SET utf8mb4' )
			)
		);
	}
}
