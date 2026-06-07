<?php
/**
 * Phase 2 inventory and pricing database schema.
 *
 * @package TCGStorePlatform
 */

namespace TCGStorePlatform\Migrations;

final class InventoryPricingSchema {
	/**
	 * Return dbDelta-compatible CREATE TABLE statements.
	 *
	 * @return array<string, string>
	 */
	public static function tables( string $prefix, string $collation ): array {
		$reference_cards_table    = $prefix . 'tcg_reference_cards';
		$reference_variants_table = $prefix . 'tcg_reference_variants';
		$locations_table          = $prefix . 'tcg_inventory_locations';
		$inventory_table          = $prefix . 'tcg_inventory_items';
		$movements_table          = $prefix . 'tcg_inventory_movements';
		$barcodes_table           = $prefix . 'tcg_barcodes';
		$price_change_log_table   = $prefix . 'tcg_price_change_log';
		$manager_overrides_table  = $prefix . 'tcg_manager_overrides';

		return array(
			$reference_cards_table    => "CREATE TABLE {$reference_cards_table} (
reference_card_id bigint(20) unsigned NOT NULL AUTO_INCREMENT,
public_id char(36) NOT NULL,
provider_name varchar(64) NOT NULL,
provider_card_id varchar(191) NOT NULL,
game varchar(64) NOT NULL,
name varchar(191) NOT NULL,
normalized_name varchar(191) NOT NULL,
set_name varchar(191) NULL,
set_code varchar(64) NULL,
card_number varchar(64) NULL,
printed_number varchar(64) NULL,
year smallint(5) unsigned NULL,
rarity varchar(100) NULL,
rarity_code varchar(64) NULL,
language varchar(100) NULL,
language_code varchar(16) NULL,
release_date date NULL,
search_text longtext NULL,
provider_updated_at datetime(6) NULL,
created_at datetime(6) NOT NULL,
updated_at datetime(6) NOT NULL,
row_version bigint(20) unsigned NOT NULL DEFAULT 1,
PRIMARY KEY  (reference_card_id),
UNIQUE KEY public_id (public_id),
UNIQUE KEY provider_card (provider_name, provider_card_id),
KEY game_name (game, normalized_name),
KEY set_lookup (set_code, card_number),
KEY updated_at (updated_at)
) {$collation};",
			$reference_variants_table => "CREATE TABLE {$reference_variants_table} (
reference_variant_id bigint(20) unsigned NOT NULL AUTO_INCREMENT,
reference_card_id bigint(20) unsigned NOT NULL,
provider_variant_id varchar(191) NULL,
variant varchar(100) NULL,
finish varchar(100) NULL,
parallel_name varchar(100) NULL,
edition varchar(100) NULL,
language varchar(100) NULL,
raw_or_graded_support varchar(32) NOT NULL DEFAULT 'both',
normalized_attributes_json longtext NULL,
created_at datetime(6) NOT NULL,
updated_at datetime(6) NOT NULL,
PRIMARY KEY  (reference_variant_id),
UNIQUE KEY provider_variant (reference_card_id, provider_variant_id),
KEY reference_card_id (reference_card_id),
KEY variant_lookup (variant, finish),
KEY updated_at (updated_at)
) {$collation};",
			$locations_table          => "CREATE TABLE {$locations_table} (
location_id bigint(20) unsigned NOT NULL AUTO_INCREMENT,
public_id char(36) NOT NULL,
parent_location_id bigint(20) unsigned NULL,
location_type varchar(32) NOT NULL,
code varchar(100) NOT NULL,
name varchar(191) NOT NULL,
timezone varchar(64) NOT NULL DEFAULT 'America/New_York',
is_active tinyint(1) unsigned NOT NULL DEFAULT 1,
sort_order int(10) unsigned NOT NULL DEFAULT 0,
created_at datetime(6) NOT NULL,
updated_at datetime(6) NOT NULL,
row_version bigint(20) unsigned NOT NULL DEFAULT 1,
PRIMARY KEY  (location_id),
UNIQUE KEY public_id (public_id),
UNIQUE KEY code (code),
KEY parent_location (parent_location_id, is_active),
KEY type_active (location_type, is_active),
KEY updated_at (updated_at)
) {$collation};",
			$inventory_table          => "CREATE TABLE {$inventory_table} (
inventory_id bigint(20) unsigned NOT NULL AUTO_INCREMENT,
public_id char(36) NOT NULL,
reference_card_id bigint(20) unsigned NULL,
reference_variant_id bigint(20) unsigned NULL,
manual_reference_payload_json longtext NULL,
provider_name varchar(64) NULL,
provider_card_id varchar(191) NULL,
game varchar(64) NOT NULL,
card_name varchar(191) NOT NULL,
set_name varchar(191) NULL,
set_code varchar(64) NULL,
card_number varchar(64) NULL,
printed_number varchar(64) NULL,
year smallint(5) unsigned NULL,
rarity varchar(100) NULL,
rarity_code varchar(64) NULL,
variant varchar(100) NULL,
finish varchar(100) NULL,
parallel_name varchar(100) NULL,
language varchar(100) NULL,
raw_or_graded varchar(16) NOT NULL,
condition_code varchar(32) NULL,
grading_company varchar(64) NULL,
grade varchar(32) NULL,
cert_number varchar(100) NULL,
barcode varchar(191) NOT NULL,
sku varchar(191) NOT NULL,
cost decimal(19,4) NULL,
cost_currency char(3) NULL,
market_price decimal(19,4) NULL,
market_price_currency char(3) NULL,
suggested_price decimal(19,4) NULL,
sale_price decimal(19,4) NOT NULL,
minimum_sale_price decimal(19,4) NOT NULL,
sale_currency char(3) NOT NULL DEFAULT 'USD',
pricing_source varchar(100) NULL,
pricing_formula varchar(100) NULL,
price_lock tinyint(1) unsigned NOT NULL DEFAULT 0,
price_floor_hit tinyint(1) unsigned NOT NULL DEFAULT 0,
location_id bigint(20) unsigned NULL,
case_id bigint(20) unsigned NULL,
box_id bigint(20) unsigned NULL,
binder_id bigint(20) unsigned NULL,
shelf_id bigint(20) unsigned NULL,
row_slot varchar(64) NULL,
online_visibility varchar(32) NOT NULL DEFAULT 'hidden',
kiosk_visibility varchar(32) NOT NULL DEFAULT 'hidden',
pos_visibility varchar(32) NOT NULL DEFAULT 'visible',
status varchar(32) NOT NULL DEFAULT 'pending_intake',
front_image_local_path varchar(255) NULL,
back_image_local_path varchar(255) NULL,
front_image_remote_url varchar(255) NULL,
back_image_remote_url varchar(255) NULL,
notes longtext NULL,
staff_notes longtext NULL,
date_acquired datetime(6) NULL,
date_listed datetime(6) NULL,
date_sold datetime(6) NULL,
created_by bigint(20) unsigned NULL,
updated_by bigint(20) unsigned NULL,
created_at datetime(6) NOT NULL,
updated_at datetime(6) NOT NULL,
row_version bigint(20) unsigned NOT NULL DEFAULT 1,
PRIMARY KEY  (inventory_id),
UNIQUE KEY public_id (public_id),
UNIQUE KEY barcode (barcode),
UNIQUE KEY sku (sku),
KEY status_location_visibility (status, location_id, online_visibility),
KEY card_lookup (game, card_name, set_code, card_number),
KEY reference_status (reference_card_id, reference_variant_id, status),
KEY condition_lookup (condition_code, grading_company, grade),
KEY updated_cursor (updated_at, inventory_id)
) {$collation};",
			$movements_table          => "CREATE TABLE {$movements_table} (
movement_id bigint(20) unsigned NOT NULL AUTO_INCREMENT,
public_id char(36) NOT NULL,
inventory_id bigint(20) unsigned NOT NULL,
from_location_id bigint(20) unsigned NULL,
to_location_id bigint(20) unsigned NULL,
movement_reason varchar(64) NOT NULL,
actor_user_id bigint(20) unsigned NULL,
device_id varchar(191) NULL,
idempotency_key varchar(191) NOT NULL,
created_at datetime(6) NOT NULL,
PRIMARY KEY  (movement_id),
UNIQUE KEY public_id (public_id),
UNIQUE KEY idempotency_key (idempotency_key),
KEY inventory_created (inventory_id, created_at),
KEY to_location_created (to_location_id, created_at),
KEY actor_created (actor_user_id, created_at)
) {$collation};",
			$barcodes_table           => "CREATE TABLE {$barcodes_table} (
barcode_id bigint(20) unsigned NOT NULL AUTO_INCREMENT,
barcode varchar(191) NOT NULL,
entity_type varchar(64) NOT NULL,
entity_id bigint(20) unsigned NOT NULL,
symbology varchar(32) NOT NULL DEFAULT 'code128',
print_state varchar(32) NOT NULL DEFAULT 'queued',
template_slug varchar(100) NULL,
generated_at datetime(6) NOT NULL,
printed_at datetime(6) NULL,
created_by bigint(20) unsigned NULL,
PRIMARY KEY  (barcode_id),
UNIQUE KEY barcode (barcode),
KEY entity_lookup (entity_type, entity_id),
KEY print_state (print_state, generated_at)
) {$collation};",
			$price_change_log_table   => "CREATE TABLE {$price_change_log_table} (
price_change_id bigint(20) unsigned NOT NULL AUTO_INCREMENT,
public_id char(36) NOT NULL,
inventory_id bigint(20) unsigned NOT NULL,
old_market_price decimal(19,4) NULL,
new_market_price decimal(19,4) NULL,
old_suggested_price decimal(19,4) NULL,
new_suggested_price decimal(19,4) NULL,
old_sale_price decimal(19,4) NULL,
new_sale_price decimal(19,4) NULL,
minimum_sale_price decimal(19,4) NOT NULL,
currency char(3) NOT NULL,
floor_hit tinyint(1) unsigned NOT NULL DEFAULT 0,
change_source varchar(100) NOT NULL,
formula varchar(100) NULL,
reason varchar(191) NULL,
actor_user_id bigint(20) unsigned NULL,
job_id bigint(20) unsigned NULL,
created_at datetime(6) NOT NULL,
PRIMARY KEY  (price_change_id),
UNIQUE KEY public_id (public_id),
KEY inventory_created (inventory_id, created_at),
KEY floor_hit_created (floor_hit, created_at),
KEY source_created (change_source, created_at)
) {$collation};",
			$manager_overrides_table  => "CREATE TABLE {$manager_overrides_table} (
manager_override_id bigint(20) unsigned NOT NULL AUTO_INCREMENT,
public_id char(36) NOT NULL,
override_type varchar(64) NOT NULL,
inventory_id bigint(20) unsigned NULL,
employee_user_id bigint(20) unsigned NOT NULL,
manager_user_id bigint(20) unsigned NOT NULL,
original_price decimal(19,4) NULL,
override_price decimal(19,4) NULL,
currency char(3) NULL,
reason varchar(255) NOT NULL,
cart_id varchar(191) NULL,
order_id bigint(20) unsigned NULL,
location_id bigint(20) unsigned NULL,
expires_at datetime(6) NULL,
used_at datetime(6) NULL,
created_at datetime(6) NOT NULL,
PRIMARY KEY  (manager_override_id),
UNIQUE KEY public_id (public_id),
KEY inventory_created (inventory_id, created_at),
KEY manager_created (manager_user_id, created_at),
KEY override_type (override_type, created_at)
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
			$prefix . 'tcg_manager_overrides',
			$prefix . 'tcg_price_change_log',
			$prefix . 'tcg_barcodes',
			$prefix . 'tcg_inventory_movements',
			$prefix . 'tcg_inventory_items',
			$prefix . 'tcg_inventory_locations',
			$prefix . 'tcg_reference_variants',
			$prefix . 'tcg_reference_cards',
		);
	}

	private function __construct() {
	}
}
