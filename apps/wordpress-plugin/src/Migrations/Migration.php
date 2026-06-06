<?php
/**
 * Database migration contract.
 *
 * @package TCGStorePlatform
 */

namespace TCGStorePlatform\Migrations;

interface Migration {
	public function version(): int;

	public function name(): string;

	/**
	 * Apply the migration.
	 *
	 * @param \wpdb $database WordPress database connection.
	 */
	public function up( \wpdb $database ): void;

	/**
	 * Reverse the migration where practical.
	 *
	 * @param \wpdb $database WordPress database connection.
	 */
	public function down( \wpdb $database ): void;

	public function checksum(): string;
}
