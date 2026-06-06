<?php
/**
 * Phase 3 events and TopDeck database schema.
 *
 * @package TCGStorePlatform
 */

namespace TCGStorePlatform\Migrations;

final class EventsTopDeckSchema {
	/**
	 * Return dbDelta-compatible CREATE TABLE statements.
	 *
	 * @return array<string, string>
	 */
	public static function tables( string $prefix, string $collation ): array {
		$events_table                 = $prefix . 'tcg_events';
		$registrations_table          = $prefix . 'tcg_event_registrations';
		$registration_logs_table      = $prefix . 'tcg_event_registration_logs';
		$topdeck_sync_log_table       = $prefix . 'tcg_event_topdeck_sync_log';
		$waitlist_table               = $prefix . 'tcg_event_waitlist';
		$checkins_table               = $prefix . 'tcg_event_checkins';
		$event_templates_table        = $prefix . 'tcg_event_templates';

		return array(
			$events_table            => "CREATE TABLE {$events_table} (
event_id bigint(20) unsigned NOT NULL AUTO_INCREMENT,
public_id char(36) NOT NULL,
title varchar(191) NOT NULL,
slug varchar(191) NOT NULL,
event_type varchar(64) NOT NULL,
game varchar(64) NOT NULL,
format varchar(100) NULL,
rules_level varchar(64) NULL,
start_datetime datetime(6) NOT NULL,
end_datetime datetime(6) NULL,
timezone varchar(64) NOT NULL DEFAULT 'America/New_York',
location_id bigint(20) unsigned NULL,
entry_fee decimal(19,4) NOT NULL DEFAULT 0.0000,
currency char(3) NOT NULL DEFAULT 'USD',
player_cap int(10) unsigned NULL,
registered_count int(10) unsigned NOT NULL DEFAULT 0,
waitlist_enabled tinyint(1) unsigned NOT NULL DEFAULT 0,
registration_status varchar(32) NOT NULL DEFAULT 'open',
registration_mode varchar(32) NOT NULL DEFAULT 'local_only',
registration_deadline datetime(6) NULL,
refund_deadline datetime(6) NULL,
decklist_required tinyint(1) unsigned NOT NULL DEFAULT 0,
decklist_deadline datetime(6) NULL,
prize_support longtext NULL,
description longtext NULL,
what_to_bring longtext NULL,
age_restriction varchar(100) NULL,
staff_notes longtext NULL,
public_visibility varchar(32) NOT NULL DEFAULT 'draft',
featured_event tinyint(1) unsigned NOT NULL DEFAULT 0,
header_image varchar(255) NULL,
topdeck_enabled tinyint(1) unsigned NOT NULL DEFAULT 0,
topdeck_tid varchar(191) NULL,
topdeck_event_url varchar(255) NULL,
topdeck_registration_url varchar(255) NULL,
topdeck_sync_status varchar(32) NOT NULL DEFAULT 'local_event',
topdeck_last_sync_at datetime(6) NULL,
topdeck_create_supported tinyint(1) unsigned NOT NULL DEFAULT 0,
topdeck_raw_event_json longtext NULL,
woocommerce_product_id bigint(20) unsigned NULL,
allow_store_credit_payment tinyint(1) unsigned NOT NULL DEFAULT 0,
allow_pay_at_store tinyint(1) unsigned NOT NULL DEFAULT 0,
offline_reservation_enabled tinyint(1) unsigned NOT NULL DEFAULT 0,
created_by bigint(20) unsigned NULL,
updated_by bigint(20) unsigned NULL,
created_at datetime(6) NOT NULL,
updated_at datetime(6) NOT NULL,
row_version bigint(20) unsigned NOT NULL DEFAULT 1,
PRIMARY KEY  (event_id),
UNIQUE KEY public_id (public_id),
UNIQUE KEY slug (slug),
UNIQUE KEY topdeck_tid (topdeck_tid),
KEY public_start (public_visibility, start_datetime),
KEY game_format_start (game, format, start_datetime),
KEY event_type_start (event_type, start_datetime),
KEY registration_status_start (registration_status, start_datetime),
KEY topdeck_sync (topdeck_enabled, topdeck_sync_status, topdeck_last_sync_at)
) {$collation};",
			$registrations_table     => "CREATE TABLE {$registrations_table} (
registration_id bigint(20) unsigned NOT NULL AUTO_INCREMENT,
public_id char(36) NOT NULL,
event_id bigint(20) unsigned NOT NULL,
customer_id bigint(20) unsigned NULL,
first_name varchar(100) NOT NULL,
last_name varchar(100) NOT NULL,
phone varchar(50) NULL,
email varchar(191) NOT NULL,
topdeck_email varchar(191) NULL,
topdeck_uid varchar(191) NULL,
status varchar(32) NOT NULL DEFAULT 'reserved',
payment_status varchar(32) NOT NULL DEFAULT 'not_required',
woocommerce_order_id bigint(20) unsigned NULL,
amount_paid decimal(19,4) NOT NULL DEFAULT 0.0000,
store_credit_used decimal(19,4) NOT NULL DEFAULT 0.0000,
topdeck_response_json longtext NULL,
checkin_status varchar(32) NOT NULL DEFAULT 'not_checked_in',
checked_in_at datetime(6) NULL,
idempotency_key varchar(191) NULL,
created_at datetime(6) NOT NULL,
updated_at datetime(6) NOT NULL,
row_version bigint(20) unsigned NOT NULL DEFAULT 1,
PRIMARY KEY  (registration_id),
UNIQUE KEY public_id (public_id),
UNIQUE KEY idempotency_key (idempotency_key),
KEY event_status (event_id, status),
KEY event_email (event_id, email),
KEY customer_event (customer_id, event_id),
KEY order_lookup (woocommerce_order_id),
KEY checkin_lookup (event_id, checkin_status)
) {$collation};",
			$registration_logs_table => "CREATE TABLE {$registration_logs_table} (
registration_log_id bigint(20) unsigned NOT NULL AUTO_INCREMENT,
event_id bigint(20) unsigned NOT NULL,
registration_id bigint(20) unsigned NULL,
action varchar(64) NOT NULL,
actor_user_id bigint(20) unsigned NULL,
device_id varchar(191) NULL,
message varchar(255) NULL,
metadata_json longtext NULL,
created_at datetime(6) NOT NULL,
PRIMARY KEY  (registration_log_id),
KEY event_created (event_id, created_at),
KEY registration_created (registration_id, created_at),
KEY action_created (action, created_at)
) {$collation};",
			$topdeck_sync_log_table  => "CREATE TABLE {$topdeck_sync_log_table} (
event_sync_id bigint(20) unsigned NOT NULL AUTO_INCREMENT,
event_id bigint(20) unsigned NULL,
topdeck_tid varchar(191) NULL,
action varchar(64) NOT NULL,
request_payload longtext NULL,
response_payload longtext NULL,
status varchar(32) NOT NULL,
http_status int(10) unsigned NULL,
error_code varchar(100) NULL,
error_message varchar(255) NULL,
created_at datetime(6) NOT NULL,
PRIMARY KEY  (event_sync_id),
KEY event_created (event_id, created_at),
KEY topdeck_tid_created (topdeck_tid, created_at),
KEY action_status_created (action, status, created_at),
KEY error_created (error_code, created_at)
) {$collation};",
			$waitlist_table          => "CREATE TABLE {$waitlist_table} (
waitlist_id bigint(20) unsigned NOT NULL AUTO_INCREMENT,
event_id bigint(20) unsigned NOT NULL,
registration_id bigint(20) unsigned NOT NULL,
position int(10) unsigned NOT NULL,
status varchar(32) NOT NULL DEFAULT 'waiting',
invited_at datetime(6) NULL,
offer_expires_at datetime(6) NULL,
promoted_at datetime(6) NULL,
created_at datetime(6) NOT NULL,
updated_at datetime(6) NOT NULL,
PRIMARY KEY  (waitlist_id),
UNIQUE KEY registration_id (registration_id),
UNIQUE KEY event_position (event_id, position),
KEY event_status_position (event_id, status, position)
) {$collation};",
			$checkins_table          => "CREATE TABLE {$checkins_table} (
checkin_id bigint(20) unsigned NOT NULL AUTO_INCREMENT,
event_id bigint(20) unsigned NOT NULL,
registration_id bigint(20) unsigned NOT NULL,
actor_user_id bigint(20) unsigned NULL,
device_id varchar(191) NULL,
location_id bigint(20) unsigned NULL,
checkin_method varchar(64) NOT NULL,
notes varchar(255) NULL,
checked_in_at datetime(6) NOT NULL,
PRIMARY KEY  (checkin_id),
UNIQUE KEY registration_id (registration_id),
KEY event_checked_in (event_id, checked_in_at),
KEY actor_checked_in (actor_user_id, checked_in_at),
KEY device_checked_in (device_id, checked_in_at)
) {$collation};",
			$event_templates_table   => "CREATE TABLE {$event_templates_table} (
template_id bigint(20) unsigned NOT NULL AUTO_INCREMENT,
public_id char(36) NOT NULL,
name varchar(191) NOT NULL,
event_type varchar(64) NOT NULL,
game varchar(64) NULL,
format varchar(100) NULL,
default_payload_json longtext NOT NULL,
is_active tinyint(1) unsigned NOT NULL DEFAULT 1,
created_by bigint(20) unsigned NULL,
updated_by bigint(20) unsigned NULL,
created_at datetime(6) NOT NULL,
updated_at datetime(6) NOT NULL,
PRIMARY KEY  (template_id),
UNIQUE KEY public_id (public_id),
KEY type_game_format (event_type, game, format),
KEY active_name (is_active, name)
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
			$prefix . 'tcg_event_templates',
			$prefix . 'tcg_event_checkins',
			$prefix . 'tcg_event_waitlist',
			$prefix . 'tcg_event_topdeck_sync_log',
			$prefix . 'tcg_event_registration_logs',
			$prefix . 'tcg_event_registrations',
			$prefix . 'tcg_events',
		);
	}

	private function __construct() {
	}
}
