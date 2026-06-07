<?php
/**
 * Customer and store-credit database schema.
 *
 * @package TCGStorePlatform
 */

namespace TCGStorePlatform\Migrations;

final class CustomerCreditSchema {
	/**
	 * Return dbDelta-compatible CREATE TABLE statements.
	 *
	 * @return array<string, string>
	 */
	public static function tables( string $prefix, string $collation ): array {
		$customers_table = $prefix . 'tcg_customers';
		$contacts_table  = $prefix . 'tcg_customer_contacts';
		$ledger_table    = $prefix . 'tcg_customer_credit_ledger';
		$merge_table     = $prefix . 'tcg_customer_merge_log';
		$notes_table     = $prefix . 'tcg_customer_notes';

		return array(
			$customers_table => "CREATE TABLE {$customers_table} (
customer_id bigint(20) unsigned NOT NULL AUTO_INCREMENT,
public_id char(36) NOT NULL,
first_name varchar(100) NULL,
last_name varchar(100) NULL,
display_name varchar(191) NOT NULL,
normalized_phone varchar(32) NULL,
display_phone varchar(50) NULL,
normalized_email varchar(191) NULL,
barcode varchar(100) NULL,
credit_balance decimal(19,4) NOT NULL DEFAULT 0.0000,
credit_currency char(3) NOT NULL DEFAULT 'USD',
credit_version bigint(20) unsigned NOT NULL DEFAULT 0,
status varchar(32) NOT NULL DEFAULT 'active',
created_by bigint(20) unsigned NULL,
updated_by bigint(20) unsigned NULL,
created_at datetime(6) NOT NULL,
updated_at datetime(6) NOT NULL,
row_version bigint(20) unsigned NOT NULL DEFAULT 1,
PRIMARY KEY  (customer_id),
UNIQUE KEY public_id (public_id),
UNIQUE KEY barcode (barcode),
KEY phone_status (normalized_phone, status),
KEY email_status (normalized_email, status),
KEY status_updated (status, updated_at)
) {$collation};",
			$contacts_table  => "CREATE TABLE {$contacts_table} (
contact_id bigint(20) unsigned NOT NULL AUTO_INCREMENT,
customer_id bigint(20) unsigned NOT NULL,
contact_type varchar(32) NOT NULL,
display_value varchar(191) NOT NULL,
normalized_value varchar(191) NOT NULL,
value_hash char(64) NOT NULL,
is_primary tinyint(1) unsigned NOT NULL DEFAULT 0,
verification_status varchar(32) NOT NULL DEFAULT 'unverified',
verified_at datetime(6) NULL,
created_at datetime(6) NOT NULL,
updated_at datetime(6) NOT NULL,
row_version bigint(20) unsigned NOT NULL DEFAULT 1,
PRIMARY KEY  (contact_id),
UNIQUE KEY customer_type_value (customer_id, contact_type, normalized_value),
KEY value_hash (value_hash),
KEY customer_primary (customer_id, contact_type, is_primary),
KEY verification (verification_status, verified_at)
) {$collation};",
			$ledger_table    => "CREATE TABLE {$ledger_table} (
credit_ledger_id bigint(20) unsigned NOT NULL AUTO_INCREMENT,
public_id char(36) NOT NULL,
customer_id bigint(20) unsigned NOT NULL,
entry_type varchar(32) NOT NULL,
amount decimal(19,4) NOT NULL,
currency char(3) NOT NULL DEFAULT 'USD',
balance_before decimal(19,4) NOT NULL,
balance_after decimal(19,4) NOT NULL,
related_ledger_id bigint(20) unsigned NULL,
idempotency_key varchar(191) NULL,
actor_user_id bigint(20) unsigned NULL,
manager_user_id bigint(20) unsigned NULL,
order_id bigint(20) unsigned NULL,
buylist_submission_id bigint(20) unsigned NULL,
location_id bigint(20) unsigned NULL,
offline_operation_id varchar(191) NULL,
reason varchar(255) NULL,
metadata_json longtext NULL,
created_at datetime(6) NOT NULL,
PRIMARY KEY  (credit_ledger_id),
UNIQUE KEY public_id (public_id),
UNIQUE KEY idempotency_key (idempotency_key),
KEY customer_created (customer_id, created_at),
KEY type_created (entry_type, created_at),
KEY manager_created (manager_user_id, created_at),
KEY order_lookup (order_id),
KEY buylist_lookup (buylist_submission_id),
KEY offline_operation (offline_operation_id)
) {$collation};",
			$merge_table     => "CREATE TABLE {$merge_table} (
merge_id bigint(20) unsigned NOT NULL AUTO_INCREMENT,
public_id char(36) NOT NULL,
source_customer_id bigint(20) unsigned NOT NULL,
target_customer_id bigint(20) unsigned NOT NULL,
manager_user_id bigint(20) unsigned NOT NULL,
transfer_out_ledger_id bigint(20) unsigned NULL,
transfer_in_ledger_id bigint(20) unsigned NULL,
field_decisions_json longtext NOT NULL,
reason varchar(255) NULL,
created_at datetime(6) NOT NULL,
PRIMARY KEY  (merge_id),
UNIQUE KEY public_id (public_id),
KEY source_created (source_customer_id, created_at),
KEY target_created (target_customer_id, created_at),
KEY manager_created (manager_user_id, created_at)
) {$collation};",
			$notes_table     => "CREATE TABLE {$notes_table} (
note_id bigint(20) unsigned NOT NULL AUTO_INCREMENT,
public_id char(36) NOT NULL,
customer_id bigint(20) unsigned NOT NULL,
visibility varchar(32) NOT NULL DEFAULT 'staff',
author_user_id bigint(20) unsigned NULL,
note_text longtext NOT NULL,
created_at datetime(6) NOT NULL,
updated_at datetime(6) NOT NULL,
PRIMARY KEY  (note_id),
UNIQUE KEY public_id (public_id),
KEY customer_created (customer_id, created_at),
KEY author_created (author_user_id, created_at),
KEY visibility_created (visibility, created_at)
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
			$prefix . 'tcg_customer_notes',
			$prefix . 'tcg_customer_merge_log',
			$prefix . 'tcg_customer_credit_ledger',
			$prefix . 'tcg_customer_contacts',
			$prefix . 'tcg_customers',
		);
	}

	private function __construct() {
	}
}
