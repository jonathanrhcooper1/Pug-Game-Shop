<?php
/**
 * Inventory and pricing schema tests.
 *
 * @package TCGStorePlatform
 */

namespace TCGStorePlatform\Tests\Unit;

use TCGStorePlatform\Migrations\InventoryPricingSchema;
use TCGStorePlatform\Tests\TestCase;

final class InventoryPricingSchemaTest extends TestCase {
	public function test_phase_two_tables_are_present(): void {
		$tables = InventoryPricingSchema::tables( 'wp_', 'DEFAULT CHARACTER SET utf8mb4' );

		$this->assert_same( 8, count( $tables ) );
		$this->assert_true( isset( $tables['wp_tcg_reference_cards'] ) );
		$this->assert_true( isset( $tables['wp_tcg_reference_variants'] ) );
		$this->assert_true( isset( $tables['wp_tcg_inventory_locations'] ) );
		$this->assert_true( isset( $tables['wp_tcg_inventory_items'] ) );
		$this->assert_true( isset( $tables['wp_tcg_inventory_movements'] ) );
		$this->assert_true( isset( $tables['wp_tcg_barcodes'] ) );
		$this->assert_true( isset( $tables['wp_tcg_price_change_log'] ) );
		$this->assert_true( isset( $tables['wp_tcg_manager_overrides'] ) );
	}

	public function test_inventory_tables_have_required_business_indexes(): void {
		$tables    = InventoryPricingSchema::tables( 'wp_', 'DEFAULT CHARACTER SET utf8mb4' );
		$inventory = $tables['wp_tcg_inventory_items'];
		$prices    = $tables['wp_tcg_price_change_log'];

		$this->assert_contains( 'UNIQUE KEY barcode (barcode)', $inventory );
		$this->assert_contains( 'UNIQUE KEY sku (sku)', $inventory );
		$this->assert_contains( 'KEY status_location_visibility (status, location_id, online_visibility)', $inventory );
		$this->assert_contains( 'minimum_sale_price decimal(19,4) NOT NULL', $inventory );
		$this->assert_contains( 'woocommerce_product_id bigint(20) unsigned NULL', $inventory );
		$this->assert_contains( 'square_catalog_variation_id varchar(191) NULL', $inventory );
		$this->assert_contains( 'KEY external_sync_state (external_sync_state, last_external_sync_at)', $inventory );
		$this->assert_contains( 'KEY floor_hit_created (floor_hit, created_at)', $prices );
	}

	public function test_reference_cards_store_provider_image_urls(): void {
		$tables    = InventoryPricingSchema::tables( 'wp_', 'DEFAULT CHARACTER SET utf8mb4' );
		$reference = $tables['wp_tcg_reference_cards'];

		$this->assert_contains( 'front_image_url varchar(255) NULL', $reference );
		$this->assert_contains( 'back_image_url varchar(255) NULL', $reference );
	}

	public function test_reference_variants_store_provider_image_urls(): void {
		$tables   = InventoryPricingSchema::tables( 'wp_', 'DEFAULT CHARACTER SET utf8mb4' );
		$variants = $tables['wp_tcg_reference_variants'];

		$this->assert_contains( 'front_image_url varchar(255) NULL', $variants );
		$this->assert_contains( 'back_image_url varchar(255) NULL', $variants );
	}

	public function test_dbdelta_statements_avoid_if_not_exists(): void {
		foreach ( InventoryPricingSchema::tables( 'wp_', 'DEFAULT CHARACTER SET utf8mb4' ) as $sql ) {
			$this->assert_not_contains( 'IF NOT EXISTS', $sql );
			$this->assert_contains( 'PRIMARY KEY  (', $sql );
			$this->assert_contains( 'KEY ', $sql );
		}
	}

	public function test_drop_order_reverses_inventory_dependencies(): void {
		$order = InventoryPricingSchema::drop_order( 'wp_' );

		$this->assert_same( 'wp_tcg_manager_overrides', $order[0] );
		$this->assert_same( 'wp_tcg_inventory_items', $order[4] );
		$this->assert_same( 'wp_tcg_reference_cards', $order[7] );
	}
}
