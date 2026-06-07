<?php
/**
 * Buylist database schema.
 *
 * @package TCGStorePlatform
 */

namespace TCGStorePlatform\Migrations;

final class BuylistSchema {
	/**
	 * Return dbDelta-compatible CREATE TABLE statements.
	 *
	 * @return array<string, string>
	 */
	public static function tables( string $prefix, string $collation ): array {
		$submissions_table = $prefix . 'tcg_buylist_submissions';
		$items_table       = $prefix . 'tcg_buylist_items';
		$offers_table      = $prefix . 'tcg_buylist_offers';
		$approvals_table   = $prefix . 'tcg_buylist_approvals';
		$conversion_table  = $prefix . 'tcg_buylist_conversion_log';

		return array(
			$submissions_table => "CREATE TABLE {$submissions_table} (
submission_id bigint(20) unsigned NOT NULL AUTO_INCREMENT,
public_id char(36) NOT NULL,
customer_id bigint(20) unsigned NULL,
source varchar(32) NOT NULL,
status varchar(32) NOT NULL DEFAULT 'draft',
customer_first_name varchar(100) NULL,
customer_last_name varchar(100) NULL,
customer_phone varchar(50) NOT NULL,
customer_email varchar(191) NULL,
device_id varchar(191) NULL,
location_id bigint(20) unsigned NULL,
owner_token_hash char(64) NULL,
item_count int(10) unsigned NOT NULL DEFAULT 0,
total_cash_offer decimal(19,4) NOT NULL DEFAULT 0.0000,
total_credit_offer decimal(19,4) NOT NULL DEFAULT 0.0000,
currency char(3) NOT NULL DEFAULT 'USD',
accepted_payout_type varchar(32) NULL,
accepted_at datetime(6) NULL,
expires_at datetime(6) NULL,
submitted_at datetime(6) NULL,
idempotency_key varchar(191) NULL,
created_by bigint(20) unsigned NULL,
updated_by bigint(20) unsigned NULL,
created_at datetime(6) NOT NULL,
updated_at datetime(6) NOT NULL,
row_version bigint(20) unsigned NOT NULL DEFAULT 1,
PRIMARY KEY  (submission_id),
UNIQUE KEY public_id (public_id),
UNIQUE KEY idempotency_key (idempotency_key),
KEY customer_status (customer_id, status),
KEY status_updated (status, updated_at),
KEY owner_lookup (owner_token_hash),
KEY source_status (source, status)
) {$collation};",
			$items_table       => "CREATE TABLE {$items_table} (
buylist_item_id bigint(20) unsigned NOT NULL AUTO_INCREMENT,
public_id char(36) NOT NULL,
submission_id bigint(20) unsigned NOT NULL,
reference_card_id bigint(20) unsigned NULL,
reference_variant_id bigint(20) unsigned NULL,
manual_card_name varchar(191) NULL,
game varchar(64) NULL,
set_name varchar(191) NULL,
set_code varchar(64) NULL,
card_number varchar(64) NULL,
quantity int(10) unsigned NOT NULL DEFAULT 1,
submitted_condition varchar(32) NULL,
staff_condition varchar(32) NULL,
raw_or_graded varchar(16) NULL,
grading_company varchar(64) NULL,
grade varchar(32) NULL,
cert_number varchar(100) NULL,
authenticity_status varchar(32) NOT NULL DEFAULT 'unreviewed',
review_status varchar(32) NOT NULL DEFAULT 'pending',
cash_offer decimal(19,4) NOT NULL DEFAULT 0.0000,
credit_offer decimal(19,4) NOT NULL DEFAULT 0.0000,
accepted_quantity int(10) unsigned NOT NULL DEFAULT 0,
converted_inventory_id bigint(20) unsigned NULL,
conversion_status varchar(32) NOT NULL DEFAULT 'not_converted',
staff_notes longtext NULL,
created_at datetime(6) NOT NULL,
updated_at datetime(6) NOT NULL,
row_version bigint(20) unsigned NOT NULL DEFAULT 1,
PRIMARY KEY  (buylist_item_id),
UNIQUE KEY public_id (public_id),
KEY submission_status (submission_id, review_status),
KEY reference_lookup (reference_card_id, reference_variant_id),
KEY conversion_lookup (conversion_status, converted_inventory_id),
KEY authenticity_lookup (authenticity_status)
) {$collation};",
			$offers_table      => "CREATE TABLE {$offers_table} (
offer_id bigint(20) unsigned NOT NULL AUTO_INCREMENT,
public_id char(36) NOT NULL,
submission_id bigint(20) unsigned NOT NULL,
buylist_item_id bigint(20) unsigned NULL,
offer_version int(10) unsigned NOT NULL DEFAULT 1,
offer_status varchar(32) NOT NULL DEFAULT 'draft',
cash_amount decimal(19,4) NOT NULL DEFAULT 0.0000,
credit_amount decimal(19,4) NOT NULL DEFAULT 0.0000,
currency char(3) NOT NULL DEFAULT 'USD',
formula_snapshot_json longtext NOT NULL,
requires_manager_approval tinyint(1) unsigned NOT NULL DEFAULT 0,
manager_user_id bigint(20) unsigned NULL,
approved_at datetime(6) NULL,
expires_at datetime(6) NULL,
created_by bigint(20) unsigned NULL,
created_at datetime(6) NOT NULL,
PRIMARY KEY  (offer_id),
UNIQUE KEY public_id (public_id),
KEY submission_status (submission_id, offer_status),
KEY item_status (buylist_item_id, offer_status),
KEY manager_approval (requires_manager_approval, manager_user_id, approved_at)
) {$collation};",
			$approvals_table   => "CREATE TABLE {$approvals_table} (
approval_id bigint(20) unsigned NOT NULL AUTO_INCREMENT,
public_id char(36) NOT NULL,
submission_id bigint(20) unsigned NOT NULL,
buylist_item_id bigint(20) unsigned NULL,
approval_reason varchar(100) NOT NULL,
threshold_value decimal(19,4) NULL,
requested_by bigint(20) unsigned NOT NULL,
manager_user_id bigint(20) unsigned NULL,
decision varchar(32) NOT NULL DEFAULT 'pending',
decision_notes varchar(255) NULL,
created_at datetime(6) NOT NULL,
decided_at datetime(6) NULL,
PRIMARY KEY  (approval_id),
UNIQUE KEY public_id (public_id),
KEY submission_decision (submission_id, decision),
KEY item_decision (buylist_item_id, decision),
KEY manager_decision (manager_user_id, decision, decided_at)
) {$collation};",
			$conversion_table  => "CREATE TABLE {$conversion_table} (
conversion_id bigint(20) unsigned NOT NULL AUTO_INCREMENT,
public_id char(36) NOT NULL,
submission_id bigint(20) unsigned NOT NULL,
buylist_item_id bigint(20) unsigned NOT NULL,
inventory_id bigint(20) unsigned NOT NULL,
actor_user_id bigint(20) unsigned NULL,
idempotency_key varchar(191) NULL,
conversion_payload_json longtext NOT NULL,
created_at datetime(6) NOT NULL,
PRIMARY KEY  (conversion_id),
UNIQUE KEY public_id (public_id),
UNIQUE KEY idempotency_key (idempotency_key),
UNIQUE KEY item_inventory (buylist_item_id, inventory_id),
KEY submission_created (submission_id, created_at),
KEY inventory_lookup (inventory_id)
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
			$prefix . 'tcg_buylist_conversion_log',
			$prefix . 'tcg_buylist_approvals',
			$prefix . 'tcg_buylist_offers',
			$prefix . 'tcg_buylist_items',
			$prefix . 'tcg_buylist_submissions',
		);
	}

	private function __construct() {
	}
}
