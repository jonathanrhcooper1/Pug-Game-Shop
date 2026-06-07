<?php
/**
 * Offline sync database schema.
 *
 * @package TCGStorePlatform
 */

namespace TCGStorePlatform\Migrations;

final class OfflineSyncSchema {
	/**
	 * Return dbDelta-compatible CREATE TABLE statements.
	 *
	 * @return array<string, string>
	 */
	public static function tables( string $prefix, string $collation ): array {
		$devices_table     = $prefix . 'tcg_offline_devices';
		$queue_table       = $prefix . 'tcg_offline_sync_queue';
		$conflicts_table   = $prefix . 'tcg_sync_conflicts';
		$pull_cursor_table = $prefix . 'tcg_offline_pull_cursors';

		return array(
			$devices_table     => "CREATE TABLE {$devices_table} (
offline_device_id bigint(20) unsigned NOT NULL AUTO_INCREMENT,
public_id char(36) NOT NULL,
location_id bigint(20) unsigned NULL,
manager_user_id bigint(20) unsigned NULL,
device_label varchar(191) NOT NULL,
device_mode varchar(32) NOT NULL,
token_hash char(64) NOT NULL,
token_expires_at datetime(6) NOT NULL,
scopes_json longtext NOT NULL,
capabilities_json longtext NOT NULL,
app_version varchar(32) NOT NULL,
platform varchar(32) NOT NULL,
status varchar(32) NOT NULL DEFAULT 'active',
last_seen_at datetime(6) NULL,
revoked_at datetime(6) NULL,
issued_at datetime(6) NOT NULL,
created_at datetime(6) NOT NULL,
updated_at datetime(6) NOT NULL,
row_version bigint(20) unsigned NOT NULL DEFAULT 1,
PRIMARY KEY  (offline_device_id),
UNIQUE KEY public_id (public_id),
KEY token_hash (token_hash),
KEY status_expires (status, token_expires_at),
KEY location_status (location_id, status)
) {$collation};",
			$queue_table       => "CREATE TABLE {$queue_table} (
offline_queue_id bigint(20) unsigned NOT NULL AUTO_INCREMENT,
offline_device_id bigint(20) unsigned NOT NULL,
device_public_id char(36) NOT NULL,
batch_id varchar(64) NOT NULL,
client_operation_id varchar(64) NOT NULL,
sequence_number bigint(20) unsigned NOT NULL,
operation_type varchar(64) NOT NULL,
domain varchar(64) NOT NULL,
action_name varchar(64) NOT NULL,
entity_type varchar(64) NOT NULL,
entity_id varchar(191) NOT NULL,
base_row_version bigint(20) unsigned NULL,
payload_json longtext NOT NULL,
status varchar(32) NOT NULL DEFAULT 'queued',
result_code varchar(100) NULL,
result_details_json longtext NULL,
conflict_id varchar(64) NULL,
received_at datetime(6) NOT NULL,
resolved_at datetime(6) NULL,
last_attempt_at datetime(6) NULL,
next_retry_at datetime(6) NULL,
row_version bigint(20) unsigned NOT NULL DEFAULT 1,
PRIMARY KEY  (offline_queue_id),
UNIQUE KEY client_operation (client_operation_id),
UNIQUE KEY device_sequence (offline_device_id, sequence_number),
KEY device_status (offline_device_id, status, received_at),
KEY batch_status (batch_id, status),
KEY entity_status (entity_type, entity_id, status),
KEY conflict_id (conflict_id)
) {$collation};",
			$conflicts_table   => "CREATE TABLE {$conflicts_table} (
sync_conflict_id bigint(20) unsigned NOT NULL AUTO_INCREMENT,
conflict_id varchar(64) NOT NULL,
offline_queue_id bigint(20) unsigned NULL,
offline_device_id bigint(20) unsigned NULL,
device_public_id char(36) NOT NULL,
batch_id varchar(64) NOT NULL,
client_operation_id varchar(64) NOT NULL,
status varchar(32) NOT NULL DEFAULT 'open',
entity_type varchar(64) NOT NULL,
entity_id varchar(191) NOT NULL,
conflict_type varchar(100) NOT NULL,
severity varchar(32) NOT NULL DEFAULT 'blocking',
summary varchar(255) NOT NULL,
server_row_version bigint(20) unsigned NULL,
device_row_version bigint(20) unsigned NULL,
server_payload_json longtext NOT NULL,
device_payload_json longtext NOT NULL,
resolution_options_json longtext NOT NULL,
resolution_action varchar(64) NULL,
resolution_payload_json longtext NULL,
manager_user_id bigint(20) unsigned NULL,
detected_at datetime(6) NOT NULL,
resolved_at datetime(6) NULL,
updated_at datetime(6) NOT NULL,
row_version bigint(20) unsigned NOT NULL DEFAULT 1,
PRIMARY KEY  (sync_conflict_id),
UNIQUE KEY conflict_id (conflict_id),
UNIQUE KEY client_operation (client_operation_id),
KEY status_severity (status, severity, updated_at),
KEY entity_status (entity_type, entity_id, status),
KEY device_status (offline_device_id, status),
KEY batch_status (batch_id, status)
) {$collation};",
			$pull_cursor_table => "CREATE TABLE {$pull_cursor_table} (
offline_pull_cursor_id bigint(20) unsigned NOT NULL AUTO_INCREMENT,
offline_device_id bigint(20) unsigned NOT NULL,
device_public_id char(36) NOT NULL,
domain varchar(64) NOT NULL,
cursor_value varchar(191) NULL,
last_server_time_utc datetime(6) NULL,
last_pulled_at datetime(6) NULL,
row_count bigint(20) unsigned NOT NULL DEFAULT 0,
created_at datetime(6) NOT NULL,
updated_at datetime(6) NOT NULL,
row_version bigint(20) unsigned NOT NULL DEFAULT 1,
PRIMARY KEY  (offline_pull_cursor_id),
UNIQUE KEY device_domain (offline_device_id, domain),
KEY device_public_domain (device_public_id, domain),
KEY updated_at (updated_at)
) {$collation};",
		);
	}

	/**
	 * Return tables in safe reverse dependency order.
	 *
	 * @return list<string>
	 */
	public static function drop_order( string $prefix ): array {
		return array(
			$prefix . 'tcg_offline_pull_cursors',
			$prefix . 'tcg_sync_conflicts',
			$prefix . 'tcg_offline_sync_queue',
			$prefix . 'tcg_offline_devices',
		);
	}

	private function __construct() {
	}
}
