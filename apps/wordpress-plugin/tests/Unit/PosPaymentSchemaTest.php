<?php
/**
 * POS and payment adapter schema tests.
 *
 * @package TCGStorePlatform
 */

namespace TCGStorePlatform\Tests\Unit;

use TCGStorePlatform\Migrations\PosPaymentSchema;
use TCGStorePlatform\Tests\TestCase;

final class PosPaymentSchemaTest extends TestCase {
	public function test_pos_payment_tables_are_present(): void {
		$tables = PosPaymentSchema::tables( 'wp_', 'DEFAULT CHARACTER SET utf8mb4' );

		$this->assert_same( 3, count( $tables ) );
		$this->assert_true( array_key_exists( 'wp_tcg_pos_sync_log', $tables ) );
		$this->assert_true( array_key_exists( 'wp_tcg_payment_provider_log', $tables ) );
		$this->assert_true( array_key_exists( 'wp_tcg_payment_fee_snapshots', $tables ) );
	}

	public function test_pos_sync_log_tracks_provider_idempotency_and_inventory_mapping(): void {
		$log = PosPaymentSchema::tables( 'wp_', 'DEFAULT CHARACTER SET utf8mb4' )['wp_tcg_pos_sync_log'];

		$this->assert_contains( 'provider varchar(64) NOT NULL', $log );
		$this->assert_contains( 'provider_location_id varchar(191) NULL', $log );
		$this->assert_contains( 'external_transaction_id varchar(191) NULL', $log );
		$this->assert_contains( 'external_order_id varchar(191) NULL', $log );
		$this->assert_contains( 'external_line_item_id varchar(191) NULL', $log );
		$this->assert_contains( 'inventory_item_id bigint(20) unsigned NULL', $log );
		$this->assert_contains( 'barcode varchar(191) NULL', $log );
		$this->assert_contains( 'reconciliation_status varchar(32) NOT NULL DEFAULT \'pending\'', $log );
		$this->assert_contains( 'idempotency_key varchar(191) NOT NULL', $log );
		$this->assert_contains( 'UNIQUE KEY idempotency_key (idempotency_key)', $log );
		$this->assert_contains( 'KEY provider_transaction (provider, external_transaction_id)', $log );
		$this->assert_contains( 'KEY inventory_status (inventory_item_id, reconciliation_status)', $log );
	}

	public function test_payment_provider_log_tracks_masked_payloads_and_gateway_operations(): void {
		$log = PosPaymentSchema::tables( 'wp_', 'DEFAULT CHARACTER SET utf8mb4' )['wp_tcg_payment_provider_log'];

		$this->assert_contains( 'provider varchar(64) NOT NULL', $log );
		$this->assert_contains( 'channel varchar(64) NOT NULL', $log );
		$this->assert_contains( 'operation varchar(64) NOT NULL', $log );
		$this->assert_contains( 'woo_order_id bigint(20) unsigned NULL', $log );
		$this->assert_contains( 'external_payment_id varchar(191) NULL', $log );
		$this->assert_contains( 'external_refund_id varchar(191) NULL', $log );
		$this->assert_contains( 'amount_minor_units bigint(20) unsigned NOT NULL DEFAULT 0', $log );
		$this->assert_contains( 'currency char(3) NOT NULL', $log );
		$this->assert_contains( 'masked_request_json longtext NULL', $log );
		$this->assert_contains( 'masked_response_json longtext NULL', $log );
		$this->assert_contains( 'UNIQUE KEY idempotency_key (idempotency_key)', $log );
		$this->assert_contains( 'KEY woo_order (woo_order_id, operation)', $log );
		$this->assert_contains( 'KEY transaction_status (external_transaction_id, status)', $log );
	}

	public function test_fee_snapshot_table_tracks_effective_dated_config_without_live_rates(): void {
		$fees = PosPaymentSchema::tables( 'wp_', 'DEFAULT CHARACTER SET utf8mb4' )['wp_tcg_payment_fee_snapshots'];

		$this->assert_contains( 'provider varchar(64) NOT NULL', $fees );
		$this->assert_contains( 'channel varchar(64) NOT NULL', $fees );
		$this->assert_contains( 'currency char(3) NOT NULL', $fees );
		$this->assert_contains( 'percentage_basis_points int(10) unsigned NOT NULL DEFAULT 0', $fees );
		$this->assert_contains( 'fixed_fee_minor_units bigint(20) unsigned NOT NULL DEFAULT 0', $fees );
		$this->assert_contains( 'platform_fee_minor_units bigint(20) unsigned NOT NULL DEFAULT 0', $fees );
		$this->assert_contains( 'other_fee_json longtext NULL', $fees );
		$this->assert_contains( 'effective_from date NOT NULL', $fees );
		$this->assert_contains( 'effective_to date NULL', $fees );
		$this->assert_contains( 'source_note text NOT NULL', $fees );
		$this->assert_contains( 'last_verified_at datetime(6) NOT NULL', $fees );
		$this->assert_contains( 'UNIQUE KEY provider_channel_effective (provider, channel, currency, effective_from)', $fees );
		$this->assert_contains( 'KEY active_window (effective_from, effective_to)', $fees );
	}

	public function test_dbdelta_statements_avoid_if_not_exists(): void {
		foreach ( PosPaymentSchema::tables( 'wp_', 'DEFAULT CHARACTER SET utf8mb4' ) as $sql ) {
			$this->assert_not_contains( 'IF NOT EXISTS', $sql );
		}
	}

	public function test_drop_order_reverses_pos_payment_dependencies(): void {
		$this->assert_same(
			array(
				'wp_tcg_payment_fee_snapshots',
				'wp_tcg_payment_provider_log',
				'wp_tcg_pos_sync_log',
			),
			PosPaymentSchema::drop_order( 'wp_' )
		);
	}
}
