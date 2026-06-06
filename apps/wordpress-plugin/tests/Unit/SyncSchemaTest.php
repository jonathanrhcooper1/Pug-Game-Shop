<?php
/**
 * Sync schema tests.
 *
 * @package TCGStorePlatform
 */

namespace TCGStorePlatform\Tests\Unit;

use TCGStorePlatform\Migrations\SyncSchema;
use TCGStorePlatform\Tests\TestCase;

final class SyncSchemaTest extends TestCase {
	public function test_sync_tables_are_present(): void {
		$tables = SyncSchema::tables( 'wp_', 'DEFAULT CHARACTER SET utf8mb4' );

		$this->assert_same( 5, count( $tables ) );
		$this->assert_true( array_key_exists( 'wp_tcg_sync_jobs', $tables ) );
		$this->assert_true( array_key_exists( 'wp_tcg_sync_job_logs', $tables ) );
		$this->assert_true( array_key_exists( 'wp_tcg_sync_checkpoints', $tables ) );
		$this->assert_true( array_key_exists( 'wp_tcg_sync_errors', $tables ) );
		$this->assert_true( array_key_exists( 'wp_tcg_webhook_events', $tables ) );
	}

	public function test_checkpoint_table_supports_resume_identity(): void {
		$checkpoint = SyncSchema::tables( 'wp_', 'DEFAULT CHARACTER SET utf8mb4' )['wp_tcg_sync_checkpoints'];

		$this->assert_contains( 'resource_type varchar(64) NOT NULL', $checkpoint );
		$this->assert_contains( 'resource_key varchar(191) NOT NULL', $checkpoint );
		$this->assert_contains( 'page_number int(10) unsigned NOT NULL DEFAULT 0', $checkpoint );
		$this->assert_contains( 'cursor_value varchar(191) NULL', $checkpoint );
		$this->assert_contains( 'UNIQUE KEY job_resource (sync_job_id, provider_name, resource_type, resource_key)', $checkpoint );
	}

	public function test_drop_order_reverses_sync_dependencies(): void {
		$this->assert_same(
			array(
				'wp_tcg_webhook_events',
				'wp_tcg_sync_errors',
				'wp_tcg_sync_checkpoints',
				'wp_tcg_sync_job_logs',
				'wp_tcg_sync_jobs',
			),
			SyncSchema::drop_order( 'wp_' )
		);
	}
}
