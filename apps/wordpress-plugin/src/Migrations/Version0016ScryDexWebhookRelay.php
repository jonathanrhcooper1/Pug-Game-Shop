<?php
/**
 * Durable ScryDex webhook relay state for the LAN source of truth.
 *
 * @package TCGStorePlatform
 */

namespace TCGStorePlatform\Migrations;

final class Version0016ScryDexWebhookRelay implements Migration {
	public function version(): int {
		return 16;
	}

	public function name(): string {
		return 'scrydex_webhook_lan_relay';
	}

	public function up( \wpdb $database ): void {
		$table_name = $database->prefix . 'tcg_webhook_events';

		$database->query(
			"ALTER TABLE `{$table_name}`
				ADD relay_attempt_count int(10) unsigned NOT NULL DEFAULT 0,
				ADD next_attempt_at datetime(6) NULL,
				ADD result_reference varchar(191) NULL,
				ADD last_error_code varchar(100) NULL,
				ADD last_error_message varchar(255) NULL,
				ADD KEY relay_ready (processing_status, next_attempt_at, received_at)" // phpcs:ignore WordPress.DB.PreparedSQL.InterpolatedNotPrepared
		);

		if ( '' !== (string) $database->last_error ) {
			throw new \RuntimeException( 'Unable to add ScryDex webhook relay state: ' . $database->last_error );
		}
	}

	public function down( \wpdb $database ): void {
		$table_name = $database->prefix . 'tcg_webhook_events';

		$database->query(
			"ALTER TABLE `{$table_name}`
				DROP INDEX relay_ready,
				DROP COLUMN last_error_message,
				DROP COLUMN last_error_code,
				DROP COLUMN result_reference,
				DROP COLUMN next_attempt_at,
				DROP COLUMN relay_attempt_count" // phpcs:ignore WordPress.DB.PreparedSQL.InterpolatedNotPrepared
		);
	}

	public function checksum(): string {
		return hash( 'sha256', 'scrydex_webhook_lan_relay.v1' );
	}
}
