<?php
/**
 * Provider price observation schema tests.
 *
 * @package TCGStorePlatform
 */

namespace TCGStorePlatform\Tests\Unit;

use TCGStorePlatform\Migrations\ProviderPriceObservationSchema;
use TCGStorePlatform\Tests\TestCase;

final class ProviderPriceObservationSchemaTest extends TestCase {
	public function test_provider_price_observation_table_is_present(): void {
		$tables = ProviderPriceObservationSchema::tables( 'wp_', 'DEFAULT CHARACTER SET utf8mb4' );

		$this->assert_same( 1, count( $tables ) );
		$this->assert_true( isset( $tables['wp_tcg_provider_price_observations'] ) );
	}

	public function test_provider_price_observation_table_tracks_provider_market_snapshots(): void {
		$table = ProviderPriceObservationSchema::tables( 'wp_', 'DEFAULT CHARACTER SET utf8mb4' )['wp_tcg_provider_price_observations'];

		$this->assert_contains( 'provider_name varchar(64) NOT NULL', $table );
		$this->assert_contains( 'provider_card_id varchar(191) NOT NULL', $table );
		$this->assert_contains( 'reference_card_id bigint(20) unsigned NULL', $table );
		$this->assert_contains( 'market_price decimal(19,4) NOT NULL', $table );
		$this->assert_contains( 'source_observed_at datetime(6) NULL', $table );
		$this->assert_contains( 'sync_job_id bigint(20) unsigned NULL', $table );
		$this->assert_contains( 'UNIQUE KEY public_id (public_id)', $table );
		$this->assert_contains( 'KEY provider_card_observed (provider_name, provider_card_id, observed_at)', $table );
	}

	public function test_dbdelta_statement_avoids_if_not_exists(): void {
		foreach ( ProviderPriceObservationSchema::tables( 'wp_', 'DEFAULT CHARACTER SET utf8mb4' ) as $sql ) {
			$this->assert_not_contains( 'IF NOT EXISTS', $sql );
			$this->assert_contains( 'PRIMARY KEY  (', $sql );
			$this->assert_contains( 'KEY ', $sql );
		}
	}

	public function test_drop_order_contains_observation_table(): void {
		$this->assert_same(
			array( 'wp_tcg_provider_price_observations' ),
			ProviderPriceObservationSchema::drop_order( 'wp_' )
		);
	}
}
