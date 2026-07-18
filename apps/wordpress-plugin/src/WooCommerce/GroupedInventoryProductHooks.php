<?php
/**
 * WooCommerce storefront hooks for grouped card inventory products.
 *
 * @package TCGStorePlatform
 */

namespace TCGStorePlatform\WooCommerce;

use DateTimeImmutable;
use TCGStorePlatform\Inventory\InventoryStatus;
use TCGStorePlatform\Reservations\ReservationRequest;
use TCGStorePlatform\Reservations\ReservationService;
use TCGStorePlatform\Reservations\WpdbReservationStorage;

final class GroupedInventoryProductHooks {
	public const STYLE_HANDLE = 'tcg-store-woocommerce-card-product';
	public const EXPIRY_CRON_HOOK = 'tcg_store_expire_reservations';
	private const EXPIRY_CRON_RECURRENCE = 'tcg_store_every_five_minutes';

	public function register(): void {
		add_action( 'wp_enqueue_scripts', array( $this, 'enqueue_assets' ) );
		add_filter( 'cron_schedules', array( $this, 'add_cron_schedule' ) );
		add_filter( 'woocommerce_product_get_image', array( $this, 'product_image' ), 10, 5 );
		add_filter( 'woocommerce_single_product_image_thumbnail_html', array( $this, 'single_product_image_html' ), 10, 2 );
		add_action( 'woocommerce_before_single_product_summary', array( $this, 'render_single_product_gallery' ), 19 );
		add_filter( 'woocommerce_cart_item_thumbnail', array( $this, 'cart_item_thumbnail' ), 10, 3 );
		add_action( 'woocommerce_before_add_to_cart_button', array( $this, 'render_condition_selector' ), 15 );
		add_filter( 'woocommerce_add_to_cart_validation', array( $this, 'validate_add_to_cart' ), 10, 5 );
		add_filter( 'woocommerce_add_cart_item_data', array( $this, 'reserve_add_to_cart_inventory' ), 10, 4 );
		add_filter( 'woocommerce_get_cart_item_from_session', array( $this, 'restore_cart_item_from_session' ), 10, 3 );
		add_action( 'woocommerce_before_cart', array( $this, 'release_expired_cart_reservations' ), 5 );
		add_action( 'woocommerce_before_checkout_form', array( $this, 'release_expired_cart_reservations' ), 5 );
		add_action( 'woocommerce_before_calculate_totals', array( $this, 'release_expired_cart_reservations' ), 5 );
		add_action( 'woocommerce_before_calculate_totals', array( $this, 'apply_exact_inventory_price_snapshots' ), 20 );
		add_action( self::EXPIRY_CRON_HOOK, array( $this, 'expire_stale_reservations' ), 10 );
		add_action( 'woocommerce_checkout_create_order_line_item', array( $this, 'attach_exact_inventory_order_line_metadata' ), 10, 4 );
		add_action( 'woocommerce_payment_complete', array( $this, 'convert_paid_order_reservations' ), 10 );
		add_action( 'woocommerce_order_status_failed', array( $this, 'release_order_reservations' ), 10 );
		add_action( 'woocommerce_order_status_cancelled', array( $this, 'release_order_reservations' ), 10 );
		add_action( 'woocommerce_cart_item_removed', array( $this, 'release_removed_cart_item_reservation' ), 10, 2 );
		add_action( 'woocommerce_product_set_stock', array( $this, 'reconcile_product_stock_to_inventory' ), 20, 1 );
		add_action( 'woocommerce_variation_set_stock', array( $this, 'reconcile_product_stock_to_inventory' ), 20, 1 );
		add_action( 'woocommerce_product_set_stock_status', array( $this, 'reconcile_product_stock_to_inventory' ), 20, 3 );
		$this->maybe_schedule_reservation_expiry();
	}

	/**
	 * @return list<array{type:string,hook:string,callback:string}>
	 */
	public static function hook_contracts(): array {
		return array(
			array( 'type' => 'action', 'hook' => 'wp_enqueue_scripts', 'callback' => 'enqueue_assets' ),
			array( 'type' => 'filter', 'hook' => 'cron_schedules', 'callback' => 'add_cron_schedule' ),
			array( 'type' => 'filter', 'hook' => 'woocommerce_product_get_image', 'callback' => 'product_image' ),
			array( 'type' => 'filter', 'hook' => 'woocommerce_single_product_image_thumbnail_html', 'callback' => 'single_product_image_html' ),
			array( 'type' => 'action', 'hook' => 'woocommerce_before_single_product_summary', 'callback' => 'render_single_product_gallery' ),
			array( 'type' => 'filter', 'hook' => 'woocommerce_cart_item_thumbnail', 'callback' => 'cart_item_thumbnail' ),
			array( 'type' => 'action', 'hook' => 'woocommerce_before_add_to_cart_button', 'callback' => 'render_condition_selector' ),
			array( 'type' => 'filter', 'hook' => 'woocommerce_add_to_cart_validation', 'callback' => 'validate_add_to_cart' ),
			array( 'type' => 'filter', 'hook' => 'woocommerce_add_cart_item_data', 'callback' => 'reserve_add_to_cart_inventory' ),
			array( 'type' => 'action', 'hook' => 'woocommerce_before_cart', 'callback' => 'release_expired_cart_reservations' ),
			array( 'type' => 'action', 'hook' => 'woocommerce_before_checkout_form', 'callback' => 'release_expired_cart_reservations' ),
			array( 'type' => 'action', 'hook' => 'woocommerce_before_calculate_totals', 'callback' => 'apply_exact_inventory_price_snapshots' ),
			array( 'type' => 'action', 'hook' => self::EXPIRY_CRON_HOOK, 'callback' => 'expire_stale_reservations' ),
			array( 'type' => 'action', 'hook' => 'woocommerce_checkout_create_order_line_item', 'callback' => 'attach_exact_inventory_order_line_metadata' ),
			array( 'type' => 'action', 'hook' => 'woocommerce_payment_complete', 'callback' => 'convert_paid_order_reservations' ),
			array( 'type' => 'action', 'hook' => 'woocommerce_cart_item_removed', 'callback' => 'release_removed_cart_item_reservation' ),
			array( 'type' => 'action', 'hook' => 'woocommerce_product_set_stock', 'callback' => 'reconcile_product_stock_to_inventory' ),
			array( 'type' => 'action', 'hook' => 'woocommerce_variation_set_stock', 'callback' => 'reconcile_product_stock_to_inventory' ),
			array( 'type' => 'action', 'hook' => 'woocommerce_product_set_stock_status', 'callback' => 'reconcile_product_stock_to_inventory' ),
		);
	}

	/**
	 * @param array<string, array{interval:int,display:string}> $schedules Cron schedules.
	 *
	 * @return array<string, array{interval:int,display:string}>
	 */
	public function add_cron_schedule( array $schedules ): array {
		$schedules[ self::EXPIRY_CRON_RECURRENCE ] = array(
			'interval' => 5 * $this->minute_in_seconds(),
			'display'  => __( 'Every five minutes', 'tcg-store-platform' ),
		);

		return $schedules;
	}

	public function maybe_schedule_reservation_expiry(): void {
		if ( ! function_exists( 'wp_next_scheduled' ) || ! function_exists( 'wp_schedule_event' ) ) {
			return;
		}

		if ( wp_next_scheduled( self::EXPIRY_CRON_HOOK ) ) {
			return;
		}

		wp_schedule_event( time() + $this->minute_in_seconds(), self::EXPIRY_CRON_RECURRENCE, self::EXPIRY_CRON_HOOK );
	}

	public static function unschedule_reservation_expiry(): void {
		if ( ! function_exists( 'wp_next_scheduled' ) || ! function_exists( 'wp_unschedule_event' ) ) {
			return;
		}

		while ( $timestamp = wp_next_scheduled( self::EXPIRY_CRON_HOOK ) ) {
			wp_unschedule_event( (int) $timestamp, self::EXPIRY_CRON_HOOK );
		}
	}

	private function minute_in_seconds(): int {
		return defined( 'MINUTE_IN_SECONDS' ) ? (int) constant( 'MINUTE_IN_SECONDS' ) : 60;
	}

	public function enqueue_assets(): void {
		if ( ! function_exists( 'wp_enqueue_style' ) ) {
			return;
		}

		wp_enqueue_style(
			self::STYLE_HANDLE,
			$this->asset_url( 'assets/css/woocommerce-card-product.css' ),
			array(),
			$this->asset_version( 'assets/css/woocommerce-card-product.css' )
		);
	}

	public function product_image( mixed $image, mixed $product, mixed $size, mixed $attr, mixed $placeholder ): string {
		unset( $size, $attr, $placeholder );

		if ( ! $product instanceof \WC_Product || ! $this->is_grouped_inventory_product( $product ) ) {
			return (string) $image;
		}

		$image_url = $this->remote_image_url( $product );
		if ( '' === $image_url ) {
			return (string) $image;
		}

		return $this->remote_image_html( $product, 'tcg-woocommerce-card-image wp-post-image', 'lazy' );
	}

	public function single_product_image_html( mixed $html, mixed $post_thumbnail_id ): string {
		unset( $post_thumbnail_id );

		$product = $this->current_product();
		if ( null === $product || ! $this->is_grouped_inventory_product( $product ) ) {
			return (string) $html;
		}

		$image_url = $this->remote_image_url( $product );
		if ( '' === $image_url ) {
			return (string) $html;
		}

		$alt = $this->esc_attr( $product->get_name() );
		$url = $this->esc_url( $image_url );

		return '<div data-thumb="' . $url . '" data-thumb-alt="' . $alt . '" class="woocommerce-product-gallery__image tcg-woocommerce-card-gallery-image tcg-woocommerce-card-gallery-image--static" data-tcg-card-gallery-static="1">'
			. $this->remote_image_html( $product, 'tcg-woocommerce-card-image wp-post-image', 'eager' )
			. '</div>';
	}

	public function render_single_product_gallery(): void {
		$product = $this->current_product();
		if ( null === $product || ! $this->is_grouped_inventory_product( $product ) || '' === $this->remote_image_url( $product ) ) {
			return;
		}

		if ( function_exists( 'remove_action' ) ) {
			remove_action( 'woocommerce_before_single_product_summary', 'woocommerce_show_product_images', 20 );
		}

		echo '<div class="woocommerce-product-gallery woocommerce-product-gallery--without-images images tcg-woocommerce-card-product-gallery" data-columns="1">';
		echo '<div class="woocommerce-product-gallery__wrapper">';
		echo $this->single_product_image_html( '', 0 ); // phpcs:ignore WordPress.Security.EscapeOutput.OutputNotEscaped
		echo '</div></div>';
	}

	/**
	 * @param array<string, mixed> $cart_item WooCommerce cart row.
	 */
	public function cart_item_thumbnail( mixed $thumbnail, mixed $cart_item, mixed $cart_item_key ): string {
		unset( $cart_item_key );

		$product = is_array( $cart_item ) && ( $cart_item['data'] ?? null ) instanceof \WC_Product
			? $cart_item['data']
			: null;
		if ( null === $product || ! $this->is_grouped_inventory_product( $product ) || '' === $this->remote_image_url( $product ) ) {
			return (string) $thumbnail;
		}

		return $this->remote_image_html(
			$product,
			'tcg-woocommerce-card-image tcg-woocommerce-card-cart-image',
			'eager',
			array( 'width' => 72, 'height' => 96 )
		);
	}

	public function render_condition_selector(): void {
		$product = $this->current_product();
		if ( null === $product || ! $this->is_grouped_inventory_product( $product ) ) {
			return;
		}

		$options = $this->available_options_for_product( $product->get_id() );
		if ( array() === $options ) {
			echo '<p class="tcg-inventory-options__empty">' . esc_html__( 'This card is currently out of stock online.', 'tcg-store-platform' ) . '</p>';
			return;
		}

		$line_token = $this->line_token();
		echo '<div class="tcg-inventory-options" data-tcg-inventory-options="1">';
		echo '<div class="tcg-inventory-options__header">';
		echo '<p>' . esc_html__( 'Exact card copy', 'tcg-store-platform' ) . '</p>';
		echo '<span>' . esc_html__( 'Condition, price, stock', 'tcg-store-platform' ) . '</span>';
		echo '</div>';
		echo '<label for="tcg-inventory-option-key"><span>' . esc_html__( 'Condition / version', 'tcg-store-platform' ) . '</span>';
		echo '<select id="tcg-inventory-option-key" name="tcg_inventory_option_key" required="required">';

		foreach ( $options as $option ) {
			$label = $this->option_label( $option );
			echo '<option value="' . esc_attr( (string) $option['option_key'] ) . '" data-price="' . esc_attr( (string) $option['price'] ) . '" data-currency="' . esc_attr( (string) $option['currency'] ) . '" data-stock="' . esc_attr( (string) (int) $option['stock_quantity'] ) . '" data-label="' . esc_attr( $label ) . '">';
			echo esc_html( $label );
			echo '</option>';
		}

		echo '</select></label>';
		echo '<input type="hidden" name="tcg_inventory_line_token" value="' . esc_attr( $line_token ) . '" />';
		echo '<div class="tcg-inventory-options__summary" aria-live="polite">';
		echo '<span class="tcg-inventory-options__selected" data-tcg-selected-option="1"></span>';
		echo '<strong class="tcg-inventory-options__price" data-tcg-selected-price="1"></strong>';
		echo '<span class="tcg-inventory-options__stock" data-tcg-selected-stock="1"></span>';
		echo '</div>';
		echo '</div>';
		echo '<script>(function(){var box=document.querySelector("[data-tcg-inventory-options]");if(!box){return;}var select=box.querySelector("select");var price=box.querySelector("[data-tcg-selected-price]");var selected=box.querySelector("[data-tcg-selected-option]");var stock=box.querySelector("[data-tcg-selected-stock]");var cart=box.closest("form.cart");var quantity=cart?cart.querySelector("input.qty"):null;if(quantity){quantity.value="1";quantity.min="1";quantity.max="1";}var update=function(){var option=select.options[select.selectedIndex];if(!option){return;}var priceText=(option.getAttribute("data-price")||"0.00")+" "+(option.getAttribute("data-currency")||"USD");var stockCount=Number(option.getAttribute("data-stock")||0);if(price){price.textContent=priceText;}if(selected){selected.textContent=option.getAttribute("data-label")||option.textContent||"";}if(stock){stock.textContent=stockCount+" "+(stockCount===1?"' . esc_js( __( 'copy available', 'tcg-store-platform' ) ) . '":"' . esc_js( __( 'copies available', 'tcg-store-platform' ) ) . '");}};select.addEventListener("change",update);update();})();</script>';
	}

	public function validate_add_to_cart( mixed $passed, mixed $product_id, mixed $quantity, mixed $variation_id = 0, mixed $variations = array() ): bool {
		unset( $variation_id, $variations );

		$product = $this->product( $product_id );
		if ( null === $product || ! $this->is_grouped_inventory_product( $product ) ) {
			return (bool) $passed;
		}

		if ( (int) $quantity !== 1 ) {
			$this->add_notice( __( 'Serialized card inventory must be added one card at a time.', 'tcg-store-platform' ) );
			return false;
		}

		$option_key = $this->posted_option_key();
		if ( '' === $option_key ) {
			$this->add_notice( __( 'Choose a condition/version before adding this card to the cart.', 'tcg-store-platform' ) );
			return false;
		}

		if ( null === $this->next_available_inventory_for_option( $product->get_id(), $option_key ) ) {
			$this->add_notice( __( 'That condition/version is no longer available. Please refresh the card and choose another option.', 'tcg-store-platform' ) );
			return false;
		}

		return (bool) $passed;
	}

	/**
	 * @param array<string, mixed> $cart_item_data Existing cart item data.
	 * @return array<string, mixed>
	 */
	public function reserve_add_to_cart_inventory( array $cart_item_data, mixed $product_id, mixed $variation_id = 0, mixed $quantity = 1 ): array {
		$product = $this->product( $product_id );
		if ( null === $product || ! $this->is_grouped_inventory_product( $product ) || (int) $quantity !== 1 ) {
			return $cart_item_data;
		}

		$option_key = $this->posted_option_key();
		$inventory  = $this->next_available_inventory_for_option( $product->get_id(), $option_key );
		if ( null === $inventory ) {
			$this->add_notice( __( 'That card is no longer available for checkout.', 'tcg-store-platform' ) );
			return $cart_item_data;
		}

		global $wpdb;

		$owner_token_hash = $this->owner_token_hash();
		$expires_at       = gmdate( 'Y-m-d H:i:s', time() + $this->cart_hold_seconds() );
		$price            = $this->money( $inventory['sale_price'] ?? '0.00' );
		$currency         = $this->currency( $inventory['sale_currency'] ?? 'USD' );
		$request          = new ReservationRequest(
			(int) $inventory['inventory_id'],
			'online',
			$owner_token_hash,
			$this->idempotency_key( $product->get_id(), $option_key ),
			$expires_at,
			$this->cart_id(),
			$this->customer_id(),
			null,
			$price,
			$currency,
			array(
				'product_id'  => $product->get_id(),
				'option_key'  => $option_key,
				'cart_source' => 'woocommerce_product_page',
			)
		);
		$result           = ( new ReservationService( new WpdbReservationStorage( $wpdb ) ) )->reserve( $request );

		if ( ! $result->is_accepted() || null === $result->reservation_id() ) {
			$this->add_notice( __( 'This card could not be reserved. Please try again.', 'tcg-store-platform' ) );
			return $cart_item_data;
		}

		return array_merge(
			$cart_item_data,
			array(
				'tcg_serialized_inventory'   => '1',
				'inventory_id'               => (int) $inventory['inventory_id'],
				'reservation_id'             => $result->reservation_id(),
				'owner_token_hash'           => $owner_token_hash,
				'reservation_expires_at'     => $expires_at,
				'price_snapshot_minor_units' => $this->minor_units( $price ),
				'currency'                   => $currency,
				'cart_id'                    => $this->cart_id(),
				'product_id'                 => $product->get_id(),
				'variation_id'               => (int) $variation_id,
				'barcode'                    => (string) ( $inventory['barcode'] ?? '' ),
				'condition_code'             => (string) ( $inventory['condition_code'] ?? '' ),
				'provider'                   => (string) ( $inventory['provider_name'] ?? '' ),
				'provider_card_id'           => (string) ( $inventory['provider_card_id'] ?? '' ),
				'card_name'                  => (string) ( $inventory['card_name'] ?? '' ),
				'set_name'                   => (string) ( $inventory['set_name'] ?? '' ),
				'card_number'                => (string) ( $inventory['printed_number'] ?? ( $inventory['card_number'] ?? '' ) ),
				'tcg_inventory_option_key'   => $option_key,
			)
		);
	}

	public function restore_cart_item_from_session( array $cart_item, array $values, mixed $cart_item_key ): array {
		unset( $cart_item_key );

		foreach ( $this->cart_metadata_keys() as $key ) {
			if ( array_key_exists( $key, $values ) ) {
				$cart_item[ $key ] = $values[ $key ];
			}
		}

		return $cart_item;
	}

	public function apply_exact_inventory_price_snapshots( mixed $cart ): void {
		if ( ! is_object( $cart ) || ! method_exists( $cart, 'get_cart' ) ) {
			return;
		}

		foreach ( $cart->get_cart() as $cart_item ) {
			if ( ! is_array( $cart_item ) || empty( $cart_item['tcg_serialized_inventory'] ) || ! is_object( $cart_item['data'] ?? null ) ) {
				continue;
			}

			$minor_units = (int) ( $cart_item['price_snapshot_minor_units'] ?? -1 );
			if ( $minor_units >= 0 && method_exists( $cart_item['data'], 'set_price' ) ) {
				$cart_item['data']->set_price( number_format( $minor_units / 100, 2, '.', '' ) );
			}
		}
	}

	public function release_expired_cart_reservations( mixed $cart = null ): void {
		$this->expire_stale_reservations();

		$cart = is_object( $cart ) ? $cart : ( function_exists( 'WC' ) && is_object( WC() ) ? ( WC()->cart ?? null ) : null );
		if ( ! is_object( $cart ) || ! method_exists( $cart, 'get_cart' ) ) {
			return;
		}

		global $wpdb;
		$service = new ReservationService( new WpdbReservationStorage( $wpdb ) );

		foreach ( $cart->get_cart() as $cart_item_key => $cart_item ) {
			if ( ! is_array( $cart_item ) || empty( $cart_item['tcg_serialized_inventory'] ) ) {
				continue;
			}

			if ( ! $this->datetime_expired( (string) ( $cart_item['reservation_expires_at'] ?? '' ) ) ) {
				continue;
			}

			$reservation_id = (int) ( $cart_item['reservation_id'] ?? 0 );
			if ( $reservation_id > 0 ) {
				$service->expire( $reservation_id );
			}

			if ( method_exists( $cart, 'remove_cart_item' ) ) {
				$cart->remove_cart_item( (string) $cart_item_key );
			}

			if ( function_exists( 'wc_add_notice' ) ) {
				wc_add_notice( __( 'A card hold expired after 15 minutes and was returned to available inventory.', 'tcg-store-platform' ), 'notice' );
			}
		}
	}

	public function expire_stale_reservations( int $limit = 50 ): int {
		global $wpdb;

		if ( ! is_object( $wpdb ?? null ) ) {
			return 0;
		}

		$table = $this->reservations_table( $wpdb );
		$sql   = $wpdb->prepare(
			"SELECT `reservation_id` FROM `{$table}` WHERE `status` = %s AND `expires_at` <= %s ORDER BY `expires_at` ASC LIMIT %d", // phpcs:ignore WordPress.DB.PreparedSQL.InterpolatedNotPrepared
			'active',
			gmdate( 'Y-m-d H:i:s' ),
			max( 1, min( 500, $limit ) )
		);
		$rows  = is_string( $sql ) ? $wpdb->get_results( $sql, ARRAY_A ) : array(); // phpcs:ignore WordPress.DB.PreparedSQL.NotPrepared

		if ( ! is_array( $rows ) || array() === $rows ) {
			return 0;
		}

		$service = new ReservationService( new WpdbReservationStorage( $wpdb ) );
		$expired = 0;
		foreach ( $rows as $row ) {
			$result = $service->expire( (int) ( $row['reservation_id'] ?? 0 ) );
			if ( $result->is_accepted() ) {
				++$expired;
			}
		}

		return $expired;
	}

	public function attach_exact_inventory_order_line_metadata( mixed $item, mixed $cart_item_key, mixed $values, mixed $order ): void {
		unset( $order );

		if ( ! is_array( $values ) || empty( $values['tcg_serialized_inventory'] ) || ! is_object( $item ) ) {
			return;
		}

		$values['cart_item_key'] = (string) $cart_item_key;
		$plan                    = ( new SerializedOrderLineMetadataPlanner() )->plan( $values, new DateTimeImmutable( 'now' ) );

		if ( ! $plan->is_ready() ) {
			return;
		}

		foreach ( $plan->metadata() as $key => $value ) {
			if ( method_exists( $item, 'add_meta_data' ) ) {
				$item->add_meta_data( $key, $value, true );
			}
		}
	}

	public function convert_paid_order_reservations( mixed $order_id ): void {
		$this->transition_order_reservations( (int) $order_id, 'convert_to_sale' );
	}

	public function release_order_reservations( mixed $order_id ): void {
		$this->transition_order_reservations( (int) $order_id, 'release_reservation' );
	}

	public function reconcile_product_stock_to_inventory( mixed $product_or_id = null, mixed $stock_status = null, mixed $product_from_hook = null ): void {
		unset( $stock_status );

		$product = $product_from_hook instanceof \WC_Product
			? $product_from_hook
			: $this->product_from_stock_hook_value( $product_or_id );

		if ( null === $product || ! $this->is_grouped_inventory_product( $product ) ) {
			return;
		}

		$target_quantity = $this->stock_quantity_for_reconciliation( $product );
		if ( null === $target_quantity ) {
			return;
		}

		$available_rows = $this->available_inventory_rows_for_product( $product->get_id() );
		$current_count  = count( $available_rows );
		if ( $current_count <= $target_quantity ) {
			return;
		}

		$rows_to_mark_sold = array_slice( $available_rows, $target_quantity );
		$this->mark_inventory_rows_sold_from_stock_sync( $rows_to_mark_sold );
	}

	public function release_removed_cart_item_reservation( mixed $cart_item_key, mixed $cart ): void {
		if ( ! is_object( $cart ) || ! method_exists( $cart, 'get_removed_cart_contents' ) ) {
			return;
		}

		$removed = $cart->get_removed_cart_contents();
		$item    = is_array( $removed ) ? ( $removed[ (string) $cart_item_key ] ?? null ) : null;
		if ( ! is_array( $item ) || empty( $item['tcg_serialized_inventory'] ) ) {
			return;
		}

		$reservation_id = (int) ( $item['reservation_id'] ?? 0 );
		if ( $reservation_id <= 0 ) {
			return;
		}

		global $wpdb;
		( new ReservationService( new WpdbReservationStorage( $wpdb ) ) )->release( $reservation_id, 'cart_removed' );
	}

	private function transition_order_reservations( int $order_id, string $operation ): void {
		if ( $order_id <= 0 || ! function_exists( 'wc_get_order' ) ) {
			return;
		}

		$order = wc_get_order( $order_id );
		if ( ! is_object( $order ) || ! method_exists( $order, 'get_items' ) ) {
			return;
		}

		global $wpdb;
		$service = new ReservationService( new WpdbReservationStorage( $wpdb ) );

		foreach ( $order->get_items() as $item ) {
			if ( ! is_object( $item ) || ! method_exists( $item, 'get_meta' ) ) {
				continue;
			}

			if ( '1' !== (string) $item->get_meta( '_tcg_serialized_inventory', true ) ) {
				continue;
			}

			$reservation_id = (int) $item->get_meta( '_tcg_reservation_id', true );
			if ( $reservation_id <= 0 ) {
				continue;
			}

			if ( 'convert_to_sale' === $operation ) {
				$service->convert_to_sale( $reservation_id );
			} else {
				$service->release( $reservation_id, 'order_released' );
			}
		}
	}

	/**
	 * @return list<array<string, mixed>>
	 */
	private function available_options_for_product( int $product_id ): array {
		$rows    = $this->available_inventory_rows_for_product( $product_id );
		$options = array();

		foreach ( $rows as $row ) {
			$price      = $this->money( $row['sale_price'] ?? '0.00' );
			$option_key = $this->option_key_for_row( $row, $price );

			if ( ! isset( $options[ $option_key ] ) ) {
				$options[ $option_key ] = array(
					'option_key'     => $option_key,
					'condition_code' => strtoupper( $this->text( $row['condition_code'] ?? '' ) ),
					'variant'        => $this->text( $row['variant'] ?? '' ),
					'finish'         => $this->text( $row['finish'] ?? '' ),
					'language'       => strtoupper( $this->text( $row['language'] ?? '' ) ),
					'price'          => $price,
					'currency'       => $this->currency( $row['sale_currency'] ?? 'USD' ),
					'stock_quantity' => 0,
				);
			}

			++$options[ $option_key ]['stock_quantity'];
		}

		return array_values( $options );
	}

	/**
	 * @return array<string, mixed>|null
	 */
	private function next_available_inventory_for_option( int $product_id, string $option_key ): ?array {
		foreach ( $this->available_inventory_rows_for_product( $product_id ) as $row ) {
			$price = $this->money( $row['sale_price'] ?? '0.00' );
			if ( $option_key === $this->option_key_for_row( $row, $price ) ) {
				return $row;
			}
		}

		return null;
	}

	/**
	 * @return list<array<string, mixed>>
	 */
	private function available_inventory_rows_for_product( int $product_id ): array {
		global $wpdb;

		if ( ! is_object( $wpdb ?? null ) || $product_id <= 0 ) {
			return array();
		}

		$table = $this->inventory_table( $wpdb );
		$sql   = $wpdb->prepare(
			"SELECT * FROM `{$table}` WHERE `woocommerce_product_id` = %d AND `status` = %s AND `online_visibility` = %s ORDER BY `sale_price` ASC, `condition_code` ASC, `inventory_id` ASC", // phpcs:ignore WordPress.DB.PreparedSQL.InterpolatedNotPrepared
			$product_id,
			InventoryStatus::AVAILABLE,
			'visible'
		);
		$rows  = is_string( $sql ) ? $wpdb->get_results( $sql, ARRAY_A ) : array(); // phpcs:ignore WordPress.DB.PreparedSQL.NotPrepared

		return is_array( $rows ) ? array_values( array_filter( $rows, 'is_array' ) ) : array();
	}

	private function option_key_for_row( array $row, string $price ): string {
		return substr(
			hash(
				'sha256',
				strtolower(
					implode(
						'|',
						array(
							$this->text( $row['condition_code'] ?? '' ),
							$this->text( $row['variant'] ?? '' ),
							$this->text( $row['finish'] ?? '' ),
							$this->text( $row['language'] ?? '' ),
							$price,
						)
					)
				)
			),
			0,
			32
		);
	}

	private function option_label( array $option ): string {
		$details = array_filter(
			array(
				(string) ( $option['condition_code'] ?? '' ),
				(string) ( $option['finish'] ?? '' ),
				(string) ( $option['variant'] ?? '' ),
				(string) ( $option['language'] ?? '' ),
			)
		);

		return trim( implode( ' / ', $details ) ) . ' - ' . $option['price'] . ' ' . $option['currency'] . ' - ' . (int) $option['stock_quantity'] . ' in stock';
	}

	private function is_grouped_inventory_product( \WC_Product $product ): bool {
		return 'grouped_card' === (string) $product->get_meta( '_tcg_inventory_product_mode', true )
			|| '1' === (string) $product->get_meta( '_tcg_serialized_inventory', true );
	}

	private function current_product(): ?\WC_Product {
		global $product;

		return $product instanceof \WC_Product ? $product : null;
	}

	private function product( mixed $product_id ): ?\WC_Product {
		if ( ! function_exists( 'wc_get_product' ) || (int) $product_id <= 0 ) {
			return null;
		}

		$product = wc_get_product( (int) $product_id );

		return $product instanceof \WC_Product ? $product : null;
	}

	private function product_from_stock_hook_value( mixed $value ): ?\WC_Product {
		if ( $value instanceof \WC_Product ) {
			return $value;
		}

		if ( is_object( $value ) && method_exists( $value, 'get_parent_id' ) ) {
			$parent_id = (int) $value->get_parent_id();
			if ( $parent_id > 0 ) {
				return $this->product( $parent_id );
			}
		}

		return $this->product( $value );
	}

	private function stock_quantity_for_reconciliation( \WC_Product $product ): ?int {
		if ( method_exists( $product, 'get_stock_quantity' ) ) {
			$stock_quantity = $product->get_stock_quantity();
			if ( is_numeric( $stock_quantity ) ) {
				return max( 0, (int) $stock_quantity );
			}
		}

		if ( method_exists( $product, 'is_in_stock' ) && ! $product->is_in_stock() ) {
			return 0;
		}

		return null;
	}

	/**
	 * @param list<array<string, mixed>> $rows Inventory rows.
	 */
	private function mark_inventory_rows_sold_from_stock_sync( array $rows ): void {
		global $wpdb;

		if ( ! is_object( $wpdb ?? null ) || array() === $rows ) {
			return;
		}

		$table = $this->inventory_table( $wpdb );
		$now   = function_exists( 'current_time' ) ? current_time( 'mysql', true ) : gmdate( 'Y-m-d H:i:s' );

		foreach ( $rows as $row ) {
			$inventory_id = (int) ( $row['inventory_id'] ?? 0 );
			if ( $inventory_id <= 0 ) {
				continue;
			}

			$sql = $wpdb->prepare(
				"UPDATE `{$table}` SET `status` = %s, `date_sold` = COALESCE(`date_sold`, %s), `external_sync_state` = %s, `last_external_sync_at` = %s, `updated_at` = %s, `row_version` = `row_version` + 1 WHERE `inventory_id` = %d AND `status` = %s LIMIT 1", // phpcs:ignore WordPress.DB.PreparedSQL.InterpolatedNotPrepared
				InventoryStatus::SOLD,
				$now,
				'woo_stock_reconciled',
				$now,
				$now,
				$inventory_id,
				InventoryStatus::AVAILABLE
			);

			if ( is_string( $sql ) ) {
				$wpdb->query( $sql ); // phpcs:ignore WordPress.DB.PreparedSQL.NotPrepared
			}
		}
	}

	private function inventory_table( \wpdb $database ): string {
		$prefix = (string) ( $database->prefix ?? '' );

		return ( 1 === preg_match( '/^[A-Za-z0-9_]+$/', $prefix ) ? $prefix : '' ) . 'tcg_inventory_items';
	}

	private function reservations_table( \wpdb $database ): string {
		$prefix = (string) ( $database->prefix ?? '' );

		return ( 1 === preg_match( '/^[A-Za-z0-9_]+$/', $prefix ) ? $prefix : '' ) . 'tcg_reservations';
	}

	private function datetime_expired( string $value ): bool {
		if ( '' === trim( $value ) ) {
			return false;
		}

		try {
			return new DateTimeImmutable( $value ) <= new DateTimeImmutable( 'now' );
		} catch ( \Exception ) {
			return false;
		}
	}

	private function posted_option_key(): string {
		$value = $_POST['tcg_inventory_option_key'] ?? ''; // phpcs:ignore WordPress.Security.NonceVerification.Missing
		$value = is_scalar( $value ) ? (string) $value : '';

		return substr( preg_replace( '/[^a-f0-9]/i', '', $value ) ?? '', 0, 32 );
	}

	private function idempotency_key( int $product_id, string $option_key ): string {
		$line_token = $_POST['tcg_inventory_line_token'] ?? ''; // phpcs:ignore WordPress.Security.NonceVerification.Missing
		$line_token = is_scalar( $line_token ) ? $this->text( $line_token ) : $this->line_token();

		return substr( 'woo-cart-' . $product_id . '-' . $option_key . '-' . hash( 'sha256', $line_token ), 0, 191 );
	}

	private function line_token(): string {
		return function_exists( 'wp_generate_uuid4' ) ? wp_generate_uuid4() : bin2hex( random_bytes( 16 ) );
	}

	private function owner_token_hash(): string {
		return hash( 'sha256', $this->cart_id() . '|' . (string) $this->customer_id() );
	}

	private function cart_id(): string {
		if ( function_exists( 'WC' ) && is_object( WC() ) && is_object( WC()->session ?? null ) && method_exists( WC()->session, 'get_customer_id' ) ) {
			return (string) WC()->session->get_customer_id();
		}

		return 'guest-' . hash( 'sha256', (string) ( $_SERVER['REMOTE_ADDR'] ?? 'local' ) );
	}

	private function customer_id(): ?int {
		return function_exists( 'get_current_user_id' ) && get_current_user_id() > 0 ? get_current_user_id() : null;
	}

	private function cart_hold_seconds(): int {
		return defined( 'MINUTE_IN_SECONDS' ) ? 15 * (int) MINUTE_IN_SECONDS : 900;
	}

	private function cart_metadata_keys(): array {
		return array(
			'tcg_serialized_inventory',
			'inventory_id',
			'reservation_id',
			'owner_token_hash',
			'reservation_expires_at',
			'price_snapshot_minor_units',
			'currency',
			'cart_id',
			'product_id',
			'variation_id',
			'barcode',
			'condition_code',
			'provider',
			'provider_card_id',
			'card_name',
			'set_name',
			'card_number',
			'tcg_inventory_option_key',
		);
	}

	private function add_notice( string $message ): void {
		if ( function_exists( 'wc_add_notice' ) ) {
			wc_add_notice( $message, 'error' );
		}
	}

	private function asset_url( string $path ): string {
		return function_exists( 'plugins_url' )
			? plugins_url( $path, dirname( __DIR__, 2 ) . '/tcg-store-platform.php' )
			: ltrim( $path, '/' );
	}

	private function asset_version( string $path ): string {
		$file = dirname( __DIR__, 2 ) . '/' . ltrim( $path, '/' );

		return is_readable( $file ) ? (string) filemtime( $file ) : '1';
	}

	private function money( mixed $value ): string {
		return number_format( max( 0, (float) $value ), 2, '.', '' );
	}

	private function minor_units( string $price ): int {
		return max( 0, (int) round( (float) $price * 100 ) );
	}

	private function currency( mixed $value ): string {
		$value = strtoupper( $this->text( $value ) );

		return 1 === preg_match( '/^[A-Z]{3}$/', $value ) ? $value : 'USD';
	}

	private function text( mixed $value ): string {
		return substr( trim( (string) ( is_array( $value ) || is_object( $value ) ? '' : $value ) ), 0, 191 );
	}

	private function url( mixed $value ): string {
		$value = trim( (string) $value );

		return 1 === preg_match( '#^https?://#i', $value ) ? $value : '';
	}

	private function remote_image_url( \WC_Product $product ): string {
		$image_url = $this->url( $product->get_meta( '_tcg_front_image_url', true ) );
		if ( '' !== $image_url ) {
			return $image_url;
		}

		global $wpdb;
		if ( ! $wpdb instanceof \wpdb || $product->get_id() <= 0 ) {
			return '';
		}

		$table     = $this->inventory_table( $wpdb );
		$image_url = $this->url(
			$wpdb->get_var(
				$wpdb->prepare(
					"SELECT front_image_remote_url FROM {$table} WHERE woocommerce_product_id = %d AND front_image_remote_url <> '' ORDER BY inventory_id DESC LIMIT 1",
					$product->get_id()
				)
			)
		);

		if ( '' !== $image_url && function_exists( 'update_post_meta' ) ) {
			update_post_meta( $product->get_id(), '_tcg_front_image_url', $image_url );
		}

		return $image_url;
	}

	/**
	 * @param array{width?: int, height?: int} $dimensions Optional stable dimensions.
	 */
	private function remote_image_html( \WC_Product $product, string $class_names, string $loading, array $dimensions = array() ): string {
		$url = $this->esc_url( $this->remote_image_url( $product ) );
		$alt = $this->esc_attr( $product->get_name() );
		$width = max( 0, (int) ( $dimensions['width'] ?? 0 ) );
		$height = max( 0, (int) ( $dimensions['height'] ?? 0 ) );
		$dimension_html = '';

		if ( $width > 0 && $height > 0 ) {
			$dimension_html = ' width="' . $width . '" height="' . $height . '"';
		}

		return '<img src="' . $url . '" alt="' . $alt . '" class="' . $this->esc_attr( $class_names ) . '" loading="' . $this->esc_attr( $loading ) . '" decoding="async"' . $dimension_html . ' style="background:transparent;box-shadow:none;" />';
	}

	private function esc_url( string $url ): string {
		return function_exists( 'esc_url' ) ? esc_url( $url ) : htmlspecialchars( $url, ENT_QUOTES, 'UTF-8' );
	}

	private function esc_attr( string $text ): string {
		return function_exists( 'esc_attr' ) ? esc_attr( $text ) : htmlspecialchars( $text, ENT_QUOTES, 'UTF-8' );
	}
}
