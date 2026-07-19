<?php
/**
 * ScryDex catalog expansion and price-point migration.
 *
 * @package TCGStorePlatform
 */

namespace TCGStorePlatform\Migrations;

final class Version0012ScryDexCatalog implements Migration {
	public function version(): int {
		return 12;
	}

	public function name(): string {
		return 'scrydex_catalog';
	}

	public function up( \wpdb $database ): void {
		require_once ABSPATH . 'wp-admin/includes/upgrade.php';

		$tables = ScryDexCatalogSchema::tables(
			$database->prefix,
			$database->get_charset_collate()
		);

		foreach ( $tables as $sql ) {
			dbDelta( $sql );
		}

		$this->update_existing_catalog_tables( $database );

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
		foreach ( ScryDexCatalogSchema::drop_order( $database->prefix ) as $table_name ) {
			$database->query( "DROP TABLE IF EXISTS `{$table_name}`" ); // phpcs:ignore WordPress.DB.PreparedSQL.InterpolatedNotPrepared
		}
	}

	public function checksum(): string {
		return hash(
			'sha256',
			implode(
				"\n",
				ScryDexCatalogSchema::tables( 'wp_', 'DEFAULT CHARACTER SET utf8mb4' )
			)
		);
	}

	private function update_existing_catalog_tables( \wpdb $database ): void {
		$inventory_tables = InventoryPricingSchema::tables(
			$database->prefix,
			$database->get_charset_collate()
		);
		$price_tables     = ProviderPriceObservationSchema::tables(
			$database->prefix,
			$database->get_charset_collate()
		);

		foreach ( array( $database->prefix . 'tcg_reference_cards' ) as $table_name ) {
			if ( isset( $inventory_tables[ $table_name ] ) ) {
				dbDelta( $inventory_tables[ $table_name ] );
			}
		}

		foreach ( $price_tables as $sql ) {
			dbDelta( $sql );
		}
	}
}
