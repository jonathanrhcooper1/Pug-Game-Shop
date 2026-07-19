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
		$this->assert_same( 'add_cron_schedule', $map['filter cron_schedules'] );
		$this->assert_same( 'product_image', $map['filter woocommerce_product_get_image'] );
		$this->assert_same( 'single_product_image_html', $map['filter woocommerce_single_product_image_thumbnail_html'] );
		$this->assert_same( 'render_single_product_gallery', $map['action woocommerce_before_single_product_summary'] );
		$this->assert_same( 'cart_item_thumbnail', $map['filter woocommerce_cart_item_thumbnail'] );
		$this->assert_same( 'render_condition_selector', $map['action woocommerce_before_add_to_cart_button'] );
		$this->assert_same( 'validate_add_to_cart', $map['filter woocommerce_add_to_cart_validation'] );
		$this->assert_same( 'reserve_add_to_cart_inventory', $map['filter woocommerce_add_cart_item_data'] );
		$this->assert_same( 'release_expired_cart_reservations', $map['action woocommerce_before_cart'] );
		$this->assert_same( 'release_expired_cart_reservations', $map['action woocommerce_before_checkout_form'] );
		$this->assert_same( 'apply_exact_inventory_price_snapshots', $map['action woocommerce_before_calculate_totals'] );
		$this->assert_same( 'expire_stale_reservations', $map['action tcg_store_expire_reservations'] );
		$this->assert_same( 'attach_exact_inventory_order_line_metadata', $map['action woocommerce_checkout_create_order_line_item'] );
		$this->assert_same( 'convert_paid_order_reservations', $map['action woocommerce_payment_complete'] );
		$this->assert_same( 'move_refunded_inventory_to_return_review', $map['action woocommerce_order_refunded'] );
		$this->assert_same( 'release_removed_cart_item_reservation', $map['action woocommerce_cart_item_removed'] );
		$this->assert_same( 'reconcile_product_stock_to_inventory', $map['action woocommerce_product_set_stock'] );
		$this->assert_same( 'reconcile_product_stock_to_inventory', $map['action woocommerce_variation_set_stock'] );
		$this->assert_same( 'reconcile_product_stock_to_inventory', $map['action woocommerce_product_set_stock_status'] );
	}

	public function test_source_contains_condition_price_exact_inventory_markers(): void {
		$source = $this->source();

		foreach (
			array(
				'_tcg_inventory_product_mode',
				'_tcg_serialized_inventory',
				'front_image_remote_url',
				'update_post_meta',
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
				'woocommerce_single_product_image_thumbnail_html',
				'woocommerce_before_single_product_summary',
				'woocommerce_cart_item_thumbnail',
				'tcg-woocommerce-card-gallery-image',
				'tcg-woocommerce-card-product-gallery',
				'tcg-woocommerce-card-cart-image',
				"'eager',",
				'tcg-woocommerce-card-gallery-image--static',
				'data-tcg-card-gallery-static',
				'price_snapshot_minor_units',
				'SerializedOrderLineMetadataPlanner',
				'convert_to_sale',
				'SerializedOrderRefundHandler',
				'move_refunded_inventory_to_return_review',
				'cart_removed',
				'release_expired_cart_reservations',
				'expire_stale_reservations',
				'maybe_schedule_reservation_expiry',
				'tcg_store_every_five_minutes',
				'wp_schedule_event',
				'wp_next_scheduled',
				'A card hold expired after 15 minutes',
				'reconcile_product_stock_to_inventory',
				'mark_inventory_rows_sold_from_stock_sync',
				'woo_stock_reconciled',
				'woocommerce_product_set_stock_status',
			) as $marker
		) {
			$this->assert_contains( $marker, $source );
		}

		$this->assert_true( 1 === preg_match( "/'width'\s*=>\s*72/", $source ) );
		$this->assert_true( 1 === preg_match( "/'height'\s*=>\s*96/", $source ) );
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
				'tcg-woocommerce-card-gallery-image',
				'grid-template-columns',
				'overflow-wrap: anywhere',
				'@media (max-width: 640px)',
				'tcg-woocommerce-card-gallery-image--static',
				'tcg-woocommerce-card-cart-image',
				'td.product-thumbnail:has(.tcg-woocommerce-card-cart-image)',
				'cursor: default',
				'background: transparent',
				'box-shadow: none',
				'isolation: isolate',
				'display: flow-root',
				'min-height: clamp(300px, 76vw, 470px)',
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
