<?php
/**
 * Exact inventory reservation schema.
 *
 * @package TCGStorePlatform
 */

namespace TCGStorePlatform\Migrations;

final class ReservationSchema {
	/**
	 * Return dbDelta-compatible CREATE TABLE statements.
	 *
	 * @return array<string, string>
	 */
	public static function tables( string $prefix, string $collation ): array {
		$reservations_table = $prefix . 'tcg_reservations';

		return array(
			$reservations_table => "CREATE TABLE {$reservations_table} (
reservation_id bigint(20) unsigned NOT NULL AUTO_INCREMENT,
public_id char(36) NOT NULL,
inventory_id bigint(20) unsigned NOT NULL,
active_inventory_id bigint(20) unsigned NULL,
source varchar(32) NOT NULL,
cart_id varchar(191) NULL,
order_id bigint(20) unsigned NULL,
customer_id bigint(20) unsigned NULL,
owner_token_hash char(64) NOT NULL,
idempotency_key varchar(191) NOT NULL,
status varchar(32) NOT NULL DEFAULT 'active',
expires_at datetime(6) NOT NULL,
converted_at datetime(6) NULL,
released_at datetime(6) NULL,
release_reason varchar(100) NULL,
price_snapshot decimal(19,4) NOT NULL,
currency char(3) NOT NULL DEFAULT 'USD',
metadata_json longtext NULL,
created_at datetime(6) NOT NULL,
updated_at datetime(6) NOT NULL,
row_version bigint(20) unsigned NOT NULL DEFAULT 1,
PRIMARY KEY  (reservation_id),
UNIQUE KEY public_id (public_id),
UNIQUE KEY idempotency_key (idempotency_key),
UNIQUE KEY active_inventory (active_inventory_id),
KEY inventory_status (inventory_id, status),
KEY cart_status (cart_id, status),
KEY expiry_status (status, expires_at),
KEY customer_status (customer_id, status)
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
			$prefix . 'tcg_reservations',
		);
	}

	private function __construct() {
	}
}
