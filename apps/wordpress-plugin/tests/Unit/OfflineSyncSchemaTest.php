<?php
/**
 * Offline sync schema tests.
 *
 * @package TCGStorePlatform
 */

namespace TCGStorePlatform\Tests\Unit;

use TCGStorePlatform\Migrations\OfflineSyncSchema;
use TCGStorePlatform\Tests\TestCase;

final class OfflineSyncSchemaTest extends TestCase {
	public function test_offline_sync_tables_are_present(): void {
		$tables = OfflineSyncSchema::tables( 'wp_', 'DEFAULT CHARACTER SET utf8mb4' );

		$this->assert_same( 4, count( $tables ) );
		$this->assert_true( array_key_exists( 'wp_tcg_offline_devices', $tables ) );
		$this->assert_true( array_key_exists( 'wp_tcg_offline_sync_queue', $tables ) );
		$this->assert_true( array_key_exists( 'wp_tcg_sync_conflicts', $tables ) );
		$this->assert_true( array_key_exists( 'wp_tcg_offline_pull_cursors', $tables ) );
	}

	public function test_device_table_tracks_token_scope_and_revocation_state(): void {
		$devices = OfflineSyncSchema::tables( 'wp_', 'DEFAULT CHARACTER SET utf8mb4' )['wp_tcg_offline_devices'];

		$this->assert_contains( 'public_id char(36) NOT NULL', $devices );
		$this->assert_contains( 'token_hash char(64) NOT NULL', $devices );
		$this->assert_contains( 'token_expires_at datetime(6) NOT NULL', $devices );
		$this->assert_contains( 'scopes_json longtext NOT NULL', $devices );
		$this->assert_contains( 'capabilities_json longtext NOT NULL', $devices );
		$this->assert_contains( 'revoked_at datetime(6) NULL', $devices );
		$this->assert_contains( 'UNIQUE KEY public_id (public_id)', $devices );
		$this->assert_contains( 'KEY status_expires (status, token_expires_at)', $devices );
	}

	public function test_queue_table_supports_idempotent_operation_results(): void {
		$queue = OfflineSyncSchema::tables( 'wp_', 'DEFAULT CHARACTER SET utf8mb4' )['wp_tcg_offline_sync_queue'];

		$this->assert_contains( 'client_operation_id varchar(64) NOT NULL', $queue );
		$this->assert_contains( 'sequence_number bigint(20) unsigned NOT NULL', $queue );
		$this->assert_contains( 'payload_json longtext NOT NULL', $queue );
		$this->assert_contains( 'status varchar(32) NOT NULL DEFAULT \'queued\'', $queue );
		$this->assert_contains( 'result_code varchar(100) NULL', $queue );
		$this->assert_contains( 'conflict_id varchar(64) NULL', $queue );
		$this->assert_contains( 'UNIQUE KEY client_operation (client_operation_id)', $queue );
		$this->assert_contains( 'UNIQUE KEY device_sequence (offline_device_id, sequence_number)', $queue );
		$this->assert_contains( 'KEY entity_status (entity_type, entity_id, status)', $queue );
	}

	public function test_conflict_table_supports_manager_review_and_lookup(): void {
		$conflicts = OfflineSyncSchema::tables( 'wp_', 'DEFAULT CHARACTER SET utf8mb4' )['wp_tcg_sync_conflicts'];

		$this->assert_contains( 'conflict_id varchar(64) NOT NULL', $conflicts );
		$this->assert_contains( 'server_payload_json longtext NOT NULL', $conflicts );
		$this->assert_contains( 'device_payload_json longtext NOT NULL', $conflicts );
		$this->assert_contains( 'resolution_options_json longtext NOT NULL', $conflicts );
		$this->assert_contains( 'manager_user_id bigint(20) unsigned NULL', $conflicts );
		$this->assert_contains( 'row_version bigint(20) unsigned NOT NULL DEFAULT 1', $conflicts );
		$this->assert_contains( 'UNIQUE KEY conflict_id (conflict_id)', $conflicts );
		$this->assert_contains( 'KEY status_severity (status, severity, updated_at)', $conflicts );
		$this->assert_contains( 'KEY entity_status (entity_type, entity_id, status)', $conflicts );
	}

	public function test_pull_cursor_table_tracks_per_device_domain_progress(): void {
		$cursors = OfflineSyncSchema::tables( 'wp_', 'DEFAULT CHARACTER SET utf8mb4' )['wp_tcg_offline_pull_cursors'];

		$this->assert_contains( 'offline_device_id bigint(20) unsigned NOT NULL', $cursors );
		$this->assert_contains( 'domain varchar(64) NOT NULL', $cursors );
		$this->assert_contains( 'cursor_value varchar(191) NULL', $cursors );
		$this->assert_contains( 'last_server_time_utc datetime(6) NULL', $cursors );
		$this->assert_contains( 'UNIQUE KEY device_domain (offline_device_id, domain)', $cursors );
	}

	public function test_drop_order_reverses_offline_sync_dependencies(): void {
		$this->assert_same(
			array(
				'wp_tcg_offline_pull_cursors',
				'wp_tcg_sync_conflicts',
				'wp_tcg_offline_sync_queue',
				'wp_tcg_offline_devices',
			),
			OfflineSyncSchema::drop_order( 'wp_' )
		);
	}
}
