<?php
/**
 * Sync job database schema.
 *
 * @package TCGStorePlatform
 */

namespace TCGStorePlatform\Migrations;

final class SyncSchema {
	/**
	 * Return dbDelta-compatible CREATE TABLE statements.
	 *
	 * @return array<string, string>
	 */
	public static function tables( string $prefix, string $collation ): array {
		$jobs_table        = $prefix . 'tcg_sync_jobs';
		$logs_table        = $prefix . 'tcg_sync_job_logs';
		$checkpoints_table = $prefix . 'tcg_sync_checkpoints';
		$errors_table      = $prefix . 'tcg_sync_errors';
		$webhooks_table    = $prefix . 'tcg_webhook_events';

		return array(
			$jobs_table        => "CREATE TABLE {$jobs_table} (
sync_job_id bigint(20) unsigned NOT NULL AUTO_INCREMENT,
public_id char(36) NOT NULL,
provider_name varchar(64) NOT NULL,
job_type varchar(64) NOT NULL,
status varchar(32) NOT NULL DEFAULT 'queued',
scope_key varchar(191) NOT NULL DEFAULT 'global',
configuration_snapshot_json longtext NOT NULL,
current_page int(10) unsigned NOT NULL DEFAULT 0,
next_cursor varchar(191) NULL,
high_water_mark varchar(191) NULL,
requested_by bigint(20) unsigned NULL,
started_at datetime(6) NULL,
heartbeat_at datetime(6) NULL,
completed_at datetime(6) NULL,
cancelled_at datetime(6) NULL,
processed_count bigint(20) unsigned NOT NULL DEFAULT 0,
error_count bigint(20) unsigned NOT NULL DEFAULT 0,
created_at datetime(6) NOT NULL,
updated_at datetime(6) NOT NULL,
row_version bigint(20) unsigned NOT NULL DEFAULT 1,
PRIMARY KEY  (sync_job_id),
UNIQUE KEY public_id (public_id),
KEY provider_status (provider_name, status, updated_at),
KEY job_type_status (job_type, status, updated_at),
KEY heartbeat_status (status, heartbeat_at)
) {$collation};",
			$logs_table        => "CREATE TABLE {$logs_table} (
sync_log_id bigint(20) unsigned NOT NULL AUTO_INCREMENT,
sync_job_id bigint(20) unsigned NOT NULL,
sequence_number bigint(20) unsigned NOT NULL,
level varchar(32) NOT NULL,
code varchar(100) NOT NULL,
message varchar(255) NOT NULL,
context_json longtext NULL,
created_at datetime(6) NOT NULL,
PRIMARY KEY  (sync_log_id),
UNIQUE KEY job_sequence (sync_job_id, sequence_number),
KEY job_created (sync_job_id, created_at),
KEY level_created (level, created_at)
) {$collation};",
			$checkpoints_table => "CREATE TABLE {$checkpoints_table} (
sync_checkpoint_id bigint(20) unsigned NOT NULL AUTO_INCREMENT,
sync_job_id bigint(20) unsigned NOT NULL,
provider_name varchar(64) NOT NULL,
resource_type varchar(64) NOT NULL,
resource_key varchar(191) NOT NULL,
page_number int(10) unsigned NOT NULL DEFAULT 0,
cursor_value varchar(191) NULL,
high_water_mark varchar(191) NULL,
payload_hash char(64) NULL,
committed_count bigint(20) unsigned NOT NULL DEFAULT 0,
created_at datetime(6) NOT NULL,
updated_at datetime(6) NOT NULL,
PRIMARY KEY  (sync_checkpoint_id),
UNIQUE KEY job_resource (sync_job_id, provider_name, resource_type, resource_key),
KEY provider_resource (provider_name, resource_type, resource_key),
KEY updated_at (updated_at)
) {$collation};",
			$errors_table      => "CREATE TABLE {$errors_table} (
sync_error_id bigint(20) unsigned NOT NULL AUTO_INCREMENT,
sync_job_id bigint(20) unsigned NOT NULL,
classification varchar(64) NOT NULL,
retryable tinyint(1) unsigned NOT NULL DEFAULT 0,
request_fingerprint char(64) NULL,
http_status int(10) unsigned NULL,
error_code varchar(100) NULL,
message varchar(255) NOT NULL,
masked_payload_json longtext NULL,
resolution_status varchar(32) NOT NULL DEFAULT 'open',
created_at datetime(6) NOT NULL,
resolved_at datetime(6) NULL,
PRIMARY KEY  (sync_error_id),
KEY job_created (sync_job_id, created_at),
KEY retryable_status (retryable, resolution_status),
KEY request_fingerprint (request_fingerprint)
) {$collation};",
			$webhooks_table    => "CREATE TABLE {$webhooks_table} (
webhook_event_id bigint(20) unsigned NOT NULL AUTO_INCREMENT,
provider_name varchar(64) NOT NULL,
provider_event_id varchar(191) NOT NULL,
event_type varchar(100) NOT NULL,
signature_status varchar(32) NOT NULL,
payload_hash char(64) NOT NULL,
payload_body longtext NOT NULL,
processing_status varchar(32) NOT NULL DEFAULT 'queued',
received_at datetime(6) NOT NULL,
processed_at datetime(6) NULL,
PRIMARY KEY  (webhook_event_id),
UNIQUE KEY provider_event (provider_name, provider_event_id),
KEY processing_status (processing_status, received_at),
KEY event_type_received (event_type, received_at)
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
			$prefix . 'tcg_webhook_events',
			$prefix . 'tcg_sync_errors',
			$prefix . 'tcg_sync_checkpoints',
			$prefix . 'tcg_sync_job_logs',
			$prefix . 'tcg_sync_jobs',
		);
	}

	private function __construct() {
	}
}
