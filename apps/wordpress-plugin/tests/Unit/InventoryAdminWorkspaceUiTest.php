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
