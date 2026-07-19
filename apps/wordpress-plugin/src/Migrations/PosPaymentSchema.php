<?php
/**
 * POS and payment adapter database schema.
 *
 * @package TCGStorePlatform
 */

namespace TCGStorePlatform\Migrations;

final class PosPaymentSchema {
	/**
	 * Return dbDelta-compatible CREATE TABLE statements.
	 *
	 * @return array<string, string>
	 */
	public static function tables( string $prefix, string $collation ): array {
		$pos_sync_log_table          = $prefix . 'tcg_pos_sync_log';
		$payment_provider_log_table  = $prefix . 'tcg_payment_provider_log';
		$payment_fee_snapshots_table = $prefix . 'tcg_payment_fee_snapshots';

		return array(
			$pos_sync_log_table          => "CREATE TABLE {$pos_sync_log_table} (
pos_sync_log_id bigint(20) unsigned NOT NULL AUTO_INCREMENT,
public_id char(36) NOT NULL,
provider varchar(64) NOT NULL,
provider_location_id varchar(191) NULL,
external_transaction_id varchar(191) NULL,
external_order_id varchar(191) NULL,
external_line_item_id varchar(191) NULL,
inventory_item_id bigint(20) unsigned NULL,
barcode varchar(191) NULL,
reconciliation_status varchar(32) NOT NULL DEFAULT 'pending',
result_code varchar(100) NULL,
result_details_json longtext NULL,
idempotency_key varchar(191) NOT NULL,
occurred_at datetime(6) NULL,
received_at datetime(6) NOT NULL,
reconciled_at datetime(6) NULL,
created_at datetime(6) NOT NULL,
updated_at datetime(6) NOT NULL,
row_version bigint(20) unsigned NOT NULL DEFAULT 1,
PRIMARY KEY  (pos_sync_log_id),
UNIQUE KEY public_id (public_id),
UNIQUE KEY idempotency_key (idempotency_key),
KEY provider_transaction (provider, external_transaction_id),
KEY external_order (provider, external_order_id),
KEY inventory_status (inventory_item_id, reconciliation_status),
KEY status_received (reconciliation_status, received_at)
) {$collation};",
			$payment_provider_log_table  => "CREATE TABLE {$payment_provider_log_table} (
payment_provider_log_id bigint(20) unsigned NOT NULL AUTO_INCREMENT,
public_id char(36) NOT NULL,
provider varchar(64) NOT NULL,
channel varchar(64) NOT NULL,
operation varchar(64) NOT NULL,
woo_order_id bigint(20) unsigned NULL,
external_transaction_id varchar(191) NULL,
external_payment_id varchar(191) NULL,
external_refund_id varchar(191) NULL,
amount_minor_units bigint(20) unsigned NOT NULL DEFAULT 0,
currency char(3) NOT NULL,
status varchar(32) NOT NULL,
masked_request_json longtext NULL,
masked_response_json longtext NULL,
idempotency_key varchar(191) NOT NULL,
occurred_at datetime(6) NULL,
received_at datetime(6) NOT NULL,
created_at datetime(6) NOT NULL,
updated_at datetime(6) NOT NULL,
row_version bigint(20) unsigned NOT NULL DEFAULT 1,
PRIMARY KEY  (payment_provider_log_id),
UNIQUE KEY public_id (public_id),
UNIQUE KEY idempotency_key (idempotency_key),
KEY provider_operation (provider, operation, received_at),
KEY woo_order (woo_order_id, operation),
KEY transaction_status (external_transaction_id, status),
KEY status_received (status, received_at)
) {$collation};",
			$payment_fee_snapshots_table => "CREATE TABLE {$payment_fee_snapshots_table} (
payment_fee_snapshot_id bigint(20) unsigned NOT NULL AUTO_INCREMENT,
public_id char(36) NOT NULL,
provider varchar(64) NOT NULL,
channel varchar(64) NOT NULL,
currency char(3) NOT NULL,
percentage_basis_points int(10) unsigned NOT NULL DEFAULT 0,
fixed_fee_minor_units bigint(20) unsigned NOT NULL DEFAULT 0,
platform_fee_minor_units bigint(20) unsigned NOT NULL DEFAULT 0,
other_fee_json longtext NULL,
effective_from date NOT NULL,
effective_to date NULL,
source_note text NOT NULL,
source_url varchar(255) NULL,
last_verified_at datetime(6) NOT NULL,
created_at datetime(6) NOT NULL,
updated_at datetime(6) NOT NULL,
row_version bigint(20) unsigned NOT NULL DEFAULT 1,
PRIMARY KEY  (payment_fee_snapshot_id),
UNIQUE KEY public_id (public_id),
UNIQUE KEY provider_channel_effective (provider, channel, currency, effective_from),
KEY provider_channel (provider, channel, currency),
KEY active_window (effective_from, effective_to),
KEY verified_at (last_verified_at)
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
			$prefix . 'tcg_payment_fee_snapshots',
			$prefix . 'tcg_payment_provider_log',
			$prefix . 'tcg_pos_sync_log',
		);
	}

	private function __construct() {
	}
}
