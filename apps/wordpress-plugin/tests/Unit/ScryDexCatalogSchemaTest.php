<?php
/**
 * ScryDex catalog schema tests.
 *
 * @package TCGStorePlatform
 */

namespace TCGStorePlatform\Tests\Unit;

use TCGStorePlatform\Migrations\ScryDexCatalogSchema;
use TCGStorePlatform\Tests\TestCase;

final class ScryDexCatalogSchemaTest extends TestCase {
	public function test_catalog_tables_are_present(): void {
		$tables = ScryDexCatalogSchema::tables( 'wp_', 'DEFAULT CHARACTER SET utf8mb4' );

		$this->assert_same( 2, count( $tables ) );
		$this->assert_true( isset( $tables['wp_tcg_reference_sets'] ) );
		$this->assert_true( isset( $tables['wp_tcg_provider_price_points'] ) );
	}

	public function test_reference_sets_store_scrydex_expansion_metadata(): void {
		$sets = ScryDexCatalogSchema::tables( 'wp_', 'DEFAULT CHARACTER SET utf8mb4' )['wp_tcg_reference_sets'];

		$this->assert_contains( 'provider_set_id varchar(191) NOT NULL', $sets );
		$this->assert_contains( 'series varchar(191) NULL', $sets );
		$this->assert_contains( 'total_cards int(10) unsigned NULL', $sets );
		$this->assert_contains( 'logo_url varchar(255) NULL', $sets );
		$this->assert_contains( 'UNIQUE KEY provider_set (provider_name, provider_set_id)', $sets );
	}

	public function test_price_points_store_condition_and_variant_prices(): void {
		$prices = ScryDexCatalogSchema::tables( 'wp_', 'DEFAULT CHARACTER SET utf8mb4' )['wp_tcg_provider_price_points'];

		$this->assert_contains( 'provider_variant_id varchar(191) NULL', $prices );
		$this->assert_contains( 'condition_code varchar(32) NULL', $prices );
		$this->assert_contains( 'market_price decimal(19,4) NULL', $prices );
		$this->assert_contains( 'raw_price_payload_json longtext NULL', $prices );
		$this->assert_contains( 'KEY provider_card_condition (provider_name, provider_card_id, condition_code, observed_at)', $prices );
	}

	public function test_drop_order_reverses_catalog_dependencies(): void {
		$this->assert_same(
			array(
				'wp_tcg_provider_price_points',
				'wp_tcg_reference_sets',
			),
			ScryDexCatalogSchema::drop_order( 'wp_' )
		);
	}
}
