<?php
/**
 * Foundation schema tests.
 *
 * @package TCGStorePlatform
 */

namespace TCGStorePlatform\Tests\Unit;

use TCGStorePlatform\Migrations\FoundationSchema;
use TCGStorePlatform\Tests\TestCase;

final class FoundationSchemaTest extends TestCase {
	public function test_foundation_tables_are_present(): void {
		$tables = FoundationSchema::tables( 'wp_', 'DEFAULT CHARACTER SET utf8mb4' );

		$this->assert_same( 4, count( $tables ) );
		$this->assert_true( isset( $tables['wp_tcg_schema_migrations'] ) );
		$this->assert_true( isset( $tables['wp_tcg_settings'] ) );
		$this->assert_true( isset( $tables['wp_tcg_role_permissions'] ) );
		$this->assert_true( isset( $tables['wp_tcg_audit_log'] ) );
	}

	public function test_dbdelta_statements_avoid_if_not_exists(): void {
		foreach ( FoundationSchema::tables( 'wp_', 'DEFAULT CHARACTER SET utf8mb4' ) as $sql ) {
			$this->assert_not_contains( 'IF NOT EXISTS', $sql );
			$this->assert_contains( 'PRIMARY KEY  (', $sql );
			$this->assert_contains( 'KEY ', $sql );
		}
	}

	public function test_drop_order_reverses_foundation_dependencies(): void {
		$order = FoundationSchema::drop_order( 'wp_' );

		$this->assert_same( 'wp_tcg_audit_log', $order[0] );
		$this->assert_same( 'wp_tcg_schema_migrations', $order[3] );
	}
}
