<?php
/**
 * Provider price observation database schema.
 *
 * @package TCGStorePlatform
 */

namespace TCGStorePlatform\Migrations;

final class ProviderPriceObservationSchema {
	/**
	 * Return dbDelta-compatible CREATE TABLE statements.
	 *
	 * @return array<string, string>
	 */
	public static function tables( string $prefix, string $collation ): array {
		$observations_table = $prefix . 'tcg_provider_price_observations';

		return array(
			$observations_table => "CREATE TABLE {$observations_table} (
provider_price_observation_id bigint(20) unsigned NOT NULL AUTO_INCREMENT,
public_id char(36) NOT NULL,
reference_card_id bigint(20) unsigned NULL,
provider_name varchar(64) NOT NULL,
provider_card_id varchar(191) NOT NULL,
game varchar(64) NULL,
market_price decimal(19,4) NOT NULL,
currency char(3) NOT NULL,
source_observed_at datetime(6) NULL,
provider_updated_at datetime(6) NULL,
observed_at datetime(6) NOT NULL,
sync_job_id bigint(20) unsigned NULL,
created_at datetime(6) NOT NULL,
PRIMARY KEY  (provider_price_observation_id),
UNIQUE KEY public_id (public_id),
KEY provider_card_observed (provider_name, provider_card_id, observed_at),
KEY provider_card_latest (provider_name, provider_card_id, observed_at, provider_price_observation_id),
KEY reference_observed (reference_card_id, observed_at),
KEY reference_latest (reference_card_id, observed_at, provider_price_observation_id),
KEY game_observed (game, observed_at),
KEY sync_job (sync_job_id, observed_at)
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
			$prefix . 'tcg_provider_price_observations',
		);
	}

	private function __construct() {
	}
}
