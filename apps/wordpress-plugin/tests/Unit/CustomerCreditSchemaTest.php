<?php
/**
 * Customer credit schema tests.
 *
 * @package TCGStorePlatform
 */

namespace TCGStorePlatform\Tests\Unit;

use TCGStorePlatform\Migrations\CustomerCreditSchema;
use TCGStorePlatform\Tests\TestCase;

final class CustomerCreditSchemaTest extends TestCase {
	public function test_customer_credit_tables_are_present(): void {
		$tables = CustomerCreditSchema::tables( 'wp_', 'DEFAULT CHARACTER SET utf8mb4' );

		$this->assert_same( 5, count( $tables ) );
		$this->assert_true( array_key_exists( 'wp_tcg_customers', $tables ) );
		$this->assert_true( array_key_exists( 'wp_tcg_customer_contacts', $tables ) );
		$this->assert_true( array_key_exists( 'wp_tcg_customer_credit_ledger', $tables ) );
		$this->assert_true( array_key_exists( 'wp_tcg_customer_merge_log', $tables ) );
		$this->assert_true( array_key_exists( 'wp_tcg_customer_notes', $tables ) );
	}

	public function test_customer_table_tracks_credit_projection(): void {
		$customers = CustomerCreditSchema::tables( 'wp_', 'DEFAULT CHARACTER SET utf8mb4' )['wp_tcg_customers'];

		$this->assert_contains( 'credit_balance decimal(19,4) NOT NULL DEFAULT 0.0000', $customers );
		$this->assert_contains( 'credit_currency char(3) NOT NULL DEFAULT \'USD\'', $customers );
		$this->assert_contains( 'credit_version bigint(20) unsigned NOT NULL DEFAULT 0', $customers );
		$this->assert_contains( 'KEY phone_status (normalized_phone, status)', $customers );
	}

	public function test_ledger_table_has_immutable_balance_and_idempotency_fields(): void {
		$ledger = CustomerCreditSchema::tables( 'wp_', 'DEFAULT CHARACTER SET utf8mb4' )['wp_tcg_customer_credit_ledger'];

		$this->assert_contains( 'amount decimal(19,4) NOT NULL', $ledger );
		$this->assert_contains( 'balance_before decimal(19,4) NOT NULL', $ledger );
		$this->assert_contains( 'balance_after decimal(19,4) NOT NULL', $ledger );
		$this->assert_contains( 'UNIQUE KEY idempotency_key (idempotency_key)', $ledger );
		$this->assert_contains( 'KEY customer_created (customer_id, created_at)', $ledger );
	}

	public function test_drop_order_reverses_customer_dependencies(): void {
		$this->assert_same(
			array(
				'wp_tcg_customer_notes',
				'wp_tcg_customer_merge_log',
				'wp_tcg_customer_credit_ledger',
				'wp_tcg_customer_contacts',
				'wp_tcg_customers',
			),
			CustomerCreditSchema::drop_order( 'wp_' )
		);
	}
}
