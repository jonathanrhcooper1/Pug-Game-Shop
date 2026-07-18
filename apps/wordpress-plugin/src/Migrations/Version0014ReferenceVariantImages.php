<?php
/**
 * Reference variant image URL schema migration.
 *
 * @package TCGStorePlatform
 */

namespace TCGStorePlatform\Migrations;

final class Version0014ReferenceVariantImages implements Migration {
	public function version(): int {
		return 14;
	}

	public function name(): string {
		return 'reference_variant_images';
	}

	public function up( \wpdb $database ): void {
		$table_name = $database->prefix . 'tcg_reference_variants';

		$this->add_column_if_missing( $database, $table_name, 'front_image_url', 'varchar(255) NULL' );
		$this->add_column_if_missing( $database, $table_name, 'back_image_url', 'varchar(255) NULL' );
	}

	public function down( \wpdb $database ): void {
		$table_name = $database->prefix . 'tcg_reference_variants';

		$this->drop_column_if_present( $database, $table_name, 'back_image_url' );
		$this->drop_column_if_present( $database, $table_name, 'front_image_url' );
	}

	public function checksum(): string {
		return hash( 'sha256', 'tcg_reference_variants.front_image_url.back_image_url.v1' );
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
