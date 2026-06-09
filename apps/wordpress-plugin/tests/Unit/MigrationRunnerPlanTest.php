<?php
/**
 * Migration runner plan tests.
 *
 * @package TCGStorePlatform
 */

namespace TCGStorePlatform\Tests\Unit;

use TCGStorePlatform\Migrations\MigrationRunner;
use TCGStorePlatform\Tests\TestCase;
use TCGStorePlatform\Version;

final class MigrationRunnerPlanTest extends TestCase {
	public function test_clean_install_plans_every_migration_in_order(): void {
		$runner = new MigrationRunner();

		$this->assert_same(
			array( 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12 ),
			$runner->pending_versions( 0 )
		);
		$this->assert_same( Version::DATABASE, 12 );
	}

	public function test_upgrade_from_prior_schema_plans_only_missing_versions(): void {
		$runner = new MigrationRunner();

		$this->assert_same(
			array( 6, 7, 8, 9, 10, 11, 12 ),
			$runner->pending_versions( 5 )
		);
	}

	public function test_current_schema_has_no_pending_migrations(): void {
		$runner = new MigrationRunner();

		$this->assert_same( array(), $runner->pending_versions( Version::DATABASE ) );
	}

	public function test_rollback_plan_reverses_applied_migrations_to_target(): void {
		$runner = new MigrationRunner();

		$this->assert_same(
			array( 12, 11, 10, 9, 8, 7, 6, 5 ),
			$runner->rollback_versions( 12, 4 )
		);
	}

	public function test_rollback_plan_is_empty_when_target_is_current_or_higher(): void {
		$runner = new MigrationRunner();

		$this->assert_same( array(), $runner->rollback_versions( 12, 12 ) );
		$this->assert_same( array(), $runner->rollback_versions( 5, 12 ) );
	}
}
