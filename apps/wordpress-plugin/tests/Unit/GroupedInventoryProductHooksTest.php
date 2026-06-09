<?php
/**
 * Grouped WooCommerce inventory product hook contract tests.
 *
 * @package TCGStorePlatform
 */

namespace TCGStorePlatform\Tests\Unit;

use RuntimeException;
use TCGStorePlatform\Tests\TestCase;
use TCGStorePlatform\WooCommerce\GroupedInventoryProductHooks;

final class GroupedInventoryProductHooksTest extends TestCase {
	public function test_hook_contracts_cover_product_selector_cart_reservation_and_order_lifecycle(): void {
		$contracts = GroupedInventoryProductHooks::hook_contracts();
		$map       = array();

		foreach ( $contracts as $contract ) {
			$map[ $contract['type'] . ' ' . $contract['hook'] ] = $contract['callback'];
		}

		$this->assert_same( 'enqueue_assets', $map['action wp_enqueue_scripts'] );
		$this->assert_same( 'product_image', $map['filter woocommerce_product_get_image'] );
		$this->assert_same( 'render_condition_selector', $map['action woocommerce_before_add_to_cart_button'] );
		$this->assert_same( 'validate_add_to_cart', $map['filter woocommerce_add_to_cart_validation'] );
		$this->assert_same( 'reserve_add_to_cart_inventory', $map['filter woocommerce_add_cart_item_data'] );
		$this->assert_same( 'apply_exact_inventory_price_snapshots', $map['action woocommerce_before_calculate_totals'] );
		$this->assert_same( 'attach_exact_inventory_order_line_metadata', $map['action woocommerce_checkout_create_order_line_item'] );
		$this->assert_same( 'convert_paid_order_reservations', $map['action woocommerce_payment_complete'] );
		$this->assert_same( 'release_removed_cart_item_reservation', $map['action woocommerce_cart_item_removed'] );
	}

	public function test_source_contains_condition_price_exact_inventory_markers(): void {
		$source = $this->source();

		foreach (
			array(
				'_tcg_inventory_product_mode',
				'grouped_card',
				'tcg_inventory_option_key',
				'Condition / version',
				'Exact card copy',
				'data-tcg-selected-option',
				'data-tcg-selected-stock',
				'data-stock',
				'next_available_inventory_for_option',
				'ReservationService',
				'WpdbReservationStorage',
				'woocommerce-card-product.css',
				'tcg-store-woocommerce-card-product',
				'price_snapshot_minor_units',
				'SerializedOrderLineMetadataPlanner',
				'convert_to_sale',
				'cart_removed',
			) as $marker
		) {
			$this->assert_contains( $marker, $source );
		}
	}

	public function test_product_styles_cover_selected_price_stock_and_mobile_layout(): void {
		$source = $this->style_source();

		foreach (
			array(
				'tcg-inventory-options__header',
				'tcg-inventory-options__summary',
				'tcg-inventory-options__selected',
				'tcg-inventory-options__price',
				'tcg-inventory-options__stock',
				'grid-template-columns',
				'overflow-wrap: anywhere',
				'@media (max-width: 640px)',
			) as $marker
		) {
			$this->assert_contains( $marker, $source );
		}
	}

	private function source(): string {
		$path     = dirname( __DIR__, 2 ) . '/src/WooCommerce/GroupedInventoryProductHooks.php';
		$contents = file_get_contents( $path );

		if ( false === $contents ) {
			throw new RuntimeException( 'Unable to read GroupedInventoryProductHooks.php.' );
		}

		return $contents;
	}

	private function style_source(): string {
		$path     = dirname( __DIR__, 2 ) . '/assets/css/woocommerce-card-product.css';
		$contents = file_get_contents( $path );

		if ( false === $contents ) {
			throw new RuntimeException( 'Unable to read woocommerce-card-product.css.' );
		}

		return $contents;
	}
}
