<?php
/**
 * Buylist schema tests.
 *
 * @package TCGStorePlatform
 */

namespace TCGStorePlatform\Tests\Unit;

use TCGStorePlatform\Migrations\BuylistSchema;
use TCGStorePlatform\Tests\TestCase;

final class BuylistSchemaTest extends TestCase {
	public function test_buylist_tables_are_present(): void {
		$tables = BuylistSchema::tables( 'wp_', 'DEFAULT CHARACTER SET utf8mb4' );

		$this->assert_same( 5, count( $tables ) );
		$this->assert_true( array_key_exists( 'wp_tcg_buylist_submissions', $tables ) );
		$this->assert_true( array_key_exists( 'wp_tcg_buylist_items', $tables ) );
		$this->assert_true( array_key_exists( 'wp_tcg_buylist_offers', $tables ) );
		$this->assert_true( array_key_exists( 'wp_tcg_buylist_approvals', $tables ) );
		$this->assert_true( array_key_exists( 'wp_tcg_buylist_conversion_log', $tables ) );
	}

	public function test_submission_table_tracks_customer_source_status_and_totals(): void {
		$submissions = BuylistSchema::tables( 'wp_', 'DEFAULT CHARACTER SET utf8mb4' )['wp_tcg_buylist_submissions'];

		$this->assert_contains( 'customer_phone varchar(50) NOT NULL', $submissions );
		$this->assert_contains( 'status varchar(32) NOT NULL DEFAULT \'draft\'', $submissions );
		$this->assert_contains( 'total_cash_offer decimal(19,4) NOT NULL DEFAULT 0.0000', $submissions );
		$this->assert_contains( 'total_credit_offer decimal(19,4) NOT NULL DEFAULT 0.0000', $submissions );
		$this->assert_contains( 'UNIQUE KEY idempotency_key (idempotency_key)', $submissions );
	}

	public function test_item_offer_approval_and_conversion_tables_have_required_indexes(): void {
		$tables = BuylistSchema::tables( 'wp_', 'DEFAULT CHARACTER SET utf8mb4' );

		$this->assert_contains( 'KEY submission_status (submission_id, review_status)', $tables['wp_tcg_buylist_items'] );
		$this->assert_contains( 'formula_snapshot_json longtext NOT NULL', $tables['wp_tcg_buylist_offers'] );
		$this->assert_contains( 'KEY manager_approval (requires_manager_approval, manager_user_id, approved_at)', $tables['wp_tcg_buylist_offers'] );
		$this->assert_contains( 'approval_reason varchar(100) NOT NULL', $tables['wp_tcg_buylist_approvals'] );
		$this->assert_contains( 'UNIQUE KEY item_inventory (buylist_item_id, inventory_id)', $tables['wp_tcg_buylist_conversion_log'] );
	}

	public function test_drop_order_reverses_buylist_dependencies(): void {
		$this->assert_same(
			array(
				'wp_tcg_buylist_conversion_log',
				'wp_tcg_buylist_approvals',
				'wp_tcg_buylist_offers',
				'wp_tcg_buylist_items',
				'wp_tcg_buylist_submissions',
			),
			BuylistSchema::drop_order( 'wp_' )
		);
	}
}
