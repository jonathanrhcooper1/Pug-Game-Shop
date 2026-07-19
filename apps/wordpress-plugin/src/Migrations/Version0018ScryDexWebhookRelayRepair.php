<?php
/**
 * Repair incomplete ScryDex webhook relay schemas.
 *
 * @package TCGStorePlatform
 */

namespace TCGStorePlatform\Migrations;

final class Version0018ScryDexWebhookRelayRepair implements Migration {
	public function version(): int {
		return 18;
	}

	public function name(): string {
		return 'scrydex_webhook_lan_relay_repair';
	}

	public function up( \wpdb $database ): void {
		$table_name = $database->prefix . 'tcg_webhook_events';

		$this->add_column_if_missing( $database, $table_name, 'relay_attempt_count', 'int(10) unsigned NOT NULL DEFAULT 0' );
		$this->add_column_if_missing( $database, $table_name, 'next_attempt_at', 'datetime(6) NULL' );
		$this->add_column_if_missing( $database, $table_name, 'result_reference', 'varchar(191) NULL' );
		$this->add_column_if_missing( $database, $table_name, 'last_error_code', 'varchar(100) NULL' );
		$this->add_column_if_missing( $database, $table_name, 'last_error_message', 'varchar(255) NULL' );
		$this->add_index_if_missing(
			$database,
			$table_name,
			'relay_ready',
			'(`processing_status`, `next_attempt_at`, `received_at`)'
		);
	}

	public function down( \wpdb $database ): void {
		// Version 16 owns these fields. Version 18 only repairs incomplete installs.
	}

	public function checksum(): string {
		return hash( 'sha256', 'scrydex_webhook_lan_relay_repair.v1' );
	}

	private function add_column_if_missing( \wpdb $database, string $table_name, string $column, string $definition ): void {
		if ( $this->column_exists( $database, $table_name, $column ) ) {
			return;
		}

		$result = $database->query( "ALTER TABLE `{$table_name}` ADD COLUMN `{$column}` {$definition}" ); // phpcs:ignore WordPress.DB.PreparedSQL.InterpolatedNotPrepared
		if ( false === $result ) {
			throw new \RuntimeException( 'Unable to repair ScryDex webhook relay column: ' . $column );
		}
	}

	private function add_index_if_missing( \wpdb $database, string $table_name, string $index, string $definition ): void {
		if ( $this->index_exists( $database, $table_name, $index ) ) {
			return;
		}

		$result = $database->query( "ALTER TABLE `{$table_name}` ADD KEY `{$index}` {$definition}" ); // phpcs:ignore WordPress.DB.PreparedSQL.InterpolatedNotPrepared
		if ( false === $result ) {
			throw new \RuntimeException( 'Unable to repair ScryDex webhook relay index: ' . $index );
		}
	}

	private function column_exists( \wpdb $database, string $table_name, string $column ): bool {
		$found = $database->get_var(
			$database->prepare(
				'SHOW COLUMNS FROM `' . $table_name . '` LIKE %s', // phpcs:ignore WordPress.DB.PreparedSQL.NotPrepared
				array( $column )
			)
		);

		return null !== $found;
	}

	private function index_exists( \wpdb $database, string $table_name, string $index ): bool {
		$found = $database->get_var(
			$database->prepare(
				'SHOW INDEX FROM `' . $table_name . '` WHERE Key_name = %s', // phpcs:ignore WordPress.DB.PreparedSQL.NotPrepared
				array( $index )
			)
		);

		return null !== $found;
	}
}
