<?php
/**
 * Inventory admin workspace UI contract tests.
 *
 * @package TCGStorePlatform
 */

namespace TCGStorePlatform\Tests\Unit;

use RuntimeException;
use TCGStorePlatform\Tests\TestCase;

final class InventoryAdminWorkspaceUiTest extends TestCase {
	public function test_admin_menu_exposes_card_lookup_to_intake_handoff(): void {
		$source = $this->source();

		foreach (
			array(
				'tcg-store-inventory-lookup-form',
				'tcg-store-inventory-lookup-results',
				'card_lookup',
				'Card Lookup',
				'Use for intake',
				'tcg-store-lookup-condition',
				'tcg-store-lookup-quantity',
				'data-condition-options',
				'fillIntake',
			) as $marker
		) {
			$this->assert_contains( $marker, $source );
		}
	}

	public function test_lookup_results_surface_image_stock_price_and_number_context(): void {
		$source = $this->source();

		foreach (
			array(
				'Image URL',
				'Set / Number',
				'Stock / Price',
				'front_image_url',
				'image_url',
				'stock_available_count',
				'stock_total_count',
				'stock_by_condition',
				'market_price_minor_units',
				'formatMoney',
				'toFixed(2)',
			) as $marker
		) {
			$this->assert_contains( $marker, $source );
		}
	}

	public function test_inventory_search_formats_staff_price_display_to_two_decimals(): void {
		$source = $this->source();

		$this->assert_contains( 'const formatMoney=function(amount)', $source );
		$this->assert_contains( 'formatMoney(item.sale_price)', $source );
		$this->assert_contains( 'toFixed(2)', $source );
	}

	public function test_square_mapping_dashboard_uses_staff_inventory_search_results(): void {
		$source = $this->source();

		foreach (
			array(
				'admin_post_tcg_store_square_mapping_update',
				'handle_square_mapping_update',
				'mark_square_catalog_synced',
				'Square POS Mapping',
				'tcg-store-square-mapping-readiness',
				'tcg_store_square_mapping_nonce',
				'tcg-store-square-mapping-form',
				'updateSquareMapping(items)',
				'squareMappingForm',
				'inventory_id',
				'square_catalog_item_id',
				'square_catalog_variation_id_required_for_inventory_pull',
				'duplicate_barcode_or_sku',
				'Square inventory authority:',
				'Ready Square pull feed',
				'POS mapping review',
				'Square variation',
				'Save mapping',
				'payments remain delegated',
			) as $marker
		) {
			$this->assert_contains( $marker, $source );
		}
	}

	public function test_intake_form_keeps_lookup_context_fields_and_quantity_batching(): void {
		$source = $this->source();

		foreach (
			array(
				'front_image_remote_url',
				'back_image_remote_url',
				'provider_name',
				'provider_card_id',
				'reference_card_id',
				'setIntakeValue("reference_card_id",card.reference_card_id||"")',
				'reference_variant_id',
				'intake_quantity',
				'quantityFrom',
				'suffixed',
				'Created inventory items',
			) as $marker
		) {
			$this->assert_contains( $marker, $source );
		}
	}

	private function source(): string {
		$path     = dirname( __DIR__, 2 ) . '/src/Admin/AdminMenu.php';
		$contents = file_get_contents( $path );

		if ( false === $contents ) {
			throw new RuntimeException( 'Unable to read AdminMenu.php.' );
		}

		return $contents;
	}
}
