<?php
/**
 * Adds Square location mapping for middleman-owned Square sync.
 *
 * @package TCGStorePlatform
 */

namespace TCGStorePlatform\Migrations;

final class Version0017SquareLocationMapping implements Migration {
	public function version(): int {
		return 17;
	}

	public function name(): string {
		return 'square_location_mapping';
	}

	public function up( \wpdb $database ): void {
		$table_name = $database->prefix . 'tcg_inventory_items';

		$this->add_column_if_missing( $database, $table_name, 'square_location_id', 'varchar(191) NULL AFTER square_catalog_variation_id' );
		$this->add_index_if_missing( $database, $table_name, 'square_location', '(`square_location_id`)' );
	}

	public function down( \wpdb $database ): void {
		$table_name = $database->prefix . 'tcg_inventory_items';

		$this->drop_index_if_present( $database, $table_name, 'square_location' );
		$this->drop_column_if_present( $database, $table_name, 'square_location_id' );
	}

	public function checksum(): string {
		return hash( 'sha256', 'tcg_inventory_items.square_location_id.v1' );
	}

	private function add_column_if_missing( \wpdb $database, string $table_name, string $column, string $definition ): void {
		if ( $this->column_exists( $database, $table_name, $column ) ) {
			return;
		}

		$result = $database->query( "ALTER TABLE `{$table_name}` ADD COLUMN `{$column}` {$definition}" ); // phpcs:ignore WordPress.DB.PreparedSQL.InterpolatedNotPrepared

		if ( false === $result ) {
			throw new \RuntimeException( 'Unable to add Square location mapping column: ' . $database->last_error );
		}
	}

	private function add_index_if_missing( \wpdb $database, string $table_name, string $index, string $definition ): void {
		if ( $this->index_exists( $database, $table_name, $index ) ) {
			return;
		}

		$result = $database->query( "ALTER TABLE `{$table_name}` ADD KEY `{$index}` {$definition}" ); // phpcs:ignore WordPress.DB.PreparedSQL.InterpolatedNotPrepared

		if ( false === $result ) {
			throw new \RuntimeException( 'Unable to add Square location mapping index: ' . $database->last_error );
		}
	}

	private function drop_column_if_present( \wpdb $database, string $table_name, string $column ): void {
		if ( ! $this->column_exists( $database, $table_name, $column ) ) {
			return;
		}

		$result = $database->query( "ALTER TABLE `{$table_name}` DROP COLUMN `{$column}`" ); // phpcs:ignore WordPress.DB.PreparedSQL.InterpolatedNotPrepared

		if ( false === $result ) {
			throw new \RuntimeException( 'Unable to drop Square location mapping column: ' . $database->last_error );
		}
	}

	private function drop_index_if_present( \wpdb $database, string $table_name, string $index ): void {
		if ( ! $this->index_exists( $database, $table_name, $index ) ) {
			return;
		}

		$result = $database->query( "ALTER TABLE `{$table_name}` DROP KEY `{$index}`" ); // phpcs:ignore WordPress.DB.PreparedSQL.InterpolatedNotPrepared

		if ( false === $result ) {
			throw new \RuntimeException( 'Unable to drop Square location mapping index: ' . $database->last_error );
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
