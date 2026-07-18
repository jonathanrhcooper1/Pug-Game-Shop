<?php
/**
 * ScryDex catalog expansion and price-point schema.
 *
 * @package TCGStorePlatform
 */

namespace TCGStorePlatform\Migrations;

final class ScryDexCatalogSchema {
	/**
	 * Return dbDelta-compatible CREATE TABLE statements.
	 *
	 * @return array<string, string>
	 */
	public static function tables( string $prefix, string $collation ): array {
		$sets_table         = $prefix . 'tcg_reference_sets';
		$price_points_table = $prefix . 'tcg_provider_price_points';

		return array(
			$sets_table         => "CREATE TABLE {$sets_table} (
reference_set_id bigint(20) unsigned NOT NULL AUTO_INCREMENT,
public_id char(36) NOT NULL,
provider_name varchar(64) NOT NULL,
provider_set_id varchar(191) NOT NULL,
game varchar(64) NOT NULL,
name varchar(191) NOT NULL,
series varchar(191) NULL,
set_code varchar(64) NULL,
total_cards int(10) unsigned NULL,
printed_total int(10) unsigned NULL,
language varchar(100) NULL,
language_code varchar(16) NULL,
release_date date NULL,
logo_url varchar(255) NULL,
symbol_url varchar(255) NULL,
is_online_only tinyint(1) unsigned NOT NULL DEFAULT 0,
search_text longtext NULL,
provider_updated_at datetime(6) NULL,
created_at datetime(6) NOT NULL,
updated_at datetime(6) NOT NULL,
row_version bigint(20) unsigned NOT NULL DEFAULT 1,
PRIMARY KEY  (reference_set_id),
UNIQUE KEY public_id (public_id),
UNIQUE KEY provider_set (provider_name, provider_set_id),
KEY game_release (game, release_date),
KEY set_lookup (game, set_code),
KEY updated_at (updated_at)
) {$collation};",
			$price_points_table => "CREATE TABLE {$price_points_table} (
provider_price_point_id bigint(20) unsigned NOT NULL AUTO_INCREMENT,
public_id char(36) NOT NULL,
reference_card_id bigint(20) unsigned NULL,
reference_variant_id bigint(20) unsigned NULL,
provider_name varchar(64) NOT NULL,
provider_card_id varchar(191) NOT NULL,
provider_variant_id varchar(191) NULL,
game varchar(64) NULL,
condition_code varchar(32) NULL,
raw_or_graded varchar(16) NOT NULL DEFAULT 'raw',
grading_company varchar(64) NULL,
grade varchar(32) NULL,
market_price decimal(19,4) NULL,
low_price decimal(19,4) NULL,
mid_price decimal(19,4) NULL,
high_price decimal(19,4) NULL,
currency char(3) NOT NULL DEFAULT 'USD',
source_observed_at datetime(6) NULL,
provider_updated_at datetime(6) NULL,
observed_at datetime(6) NOT NULL,
sync_job_id bigint(20) unsigned NULL,
raw_price_payload_json longtext NULL,
created_at datetime(6) NOT NULL,
PRIMARY KEY  (provider_price_point_id),
UNIQUE KEY public_id (public_id),
KEY provider_card_condition (provider_name, provider_card_id, condition_code, observed_at),
KEY provider_variant_condition (provider_name, provider_variant_id, condition_code, observed_at),
KEY reference_card_observed (reference_card_id, observed_at),
KEY reference_variant_observed (reference_variant_id, observed_at),
KEY game_observed (game, observed_at)
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
			$prefix . 'tcg_provider_price_points',
			$prefix . 'tcg_reference_sets',
		);
	}

	private function __construct() {
	}
}
