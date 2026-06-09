<?php
/**
 * WooCommerce My Account customer portal for card purchases and store credit.
 *
 * @package TCGStorePlatform
 */

namespace TCGStorePlatform\WooCommerce;

use DateTimeInterface;
use TCGStorePlatform\Settings\BrandingSettings;
use TCGStorePlatform\Settings\Settings;
use TCGStorePlatform\Version;

final class CustomerAccountPortalController {
	public const ENDPOINT = 'pug-portal';
	public const STYLE_HANDLE = 'tcg-store-customer-account-portal';

	private const ORDER_LIMIT  = 10;
	private const LEDGER_LIMIT = 12;
	private const EVENT_LIMIT  = 10;

	public function __construct( private ?CustomerAccountPortalPresenter $presenter = null ) {
		$this->presenter = $presenter ?? new CustomerAccountPortalPresenter();
	}

	public function register(): void {
		add_action( 'init', array( $this, 'register_endpoint' ) );
		add_filter( 'query_vars', array( $this, 'register_query_var' ), 0 );
		add_filter( 'woocommerce_account_menu_items', array( $this, 'add_menu_item' ), 40 );
		add_action( 'woocommerce_account_' . self::ENDPOINT . '_endpoint', array( $this, 'render_endpoint' ) );
		add_action( 'wp_enqueue_scripts', array( $this, 'enqueue_assets' ) );
	}

	/**
	 * @return list<array{type:string,hook:string,callback:string,priority:int}>
	 */
	public static function hook_contracts(): array {
		return array(
			array(
				'type'     => 'action',
				'hook'     => 'init',
				'callback' => 'register_endpoint',
				'priority' => 10,
			),
			array(
				'type'     => 'filter',
				'hook'     => 'query_vars',
				'callback' => 'register_query_var',
				'priority' => 0,
			),
			array(
				'type'     => 'filter',
				'hook'     => 'woocommerce_account_menu_items',
				'callback' => 'add_menu_item',
				'priority' => 40,
			),
			array(
				'type'     => 'action',
				'hook'     => 'woocommerce_account_' . self::ENDPOINT . '_endpoint',
				'callback' => 'render_endpoint',
				'priority' => 10,
			),
			array(
				'type'     => 'action',
				'hook'     => 'wp_enqueue_scripts',
				'callback' => 'enqueue_assets',
				'priority' => 10,
			),
		);
	}

	public function register_endpoint(): void {
		if ( function_exists( 'add_rewrite_endpoint' ) ) {
			add_rewrite_endpoint( self::ENDPOINT, $this->endpoint_places() );
		}
	}

	/**
	 * @param list<string> $vars Query vars.
	 * @return list<string>
	 */
	public function register_query_var( array $vars ): array {
		if ( ! in_array( self::ENDPOINT, $vars, true ) ) {
			$vars[] = self::ENDPOINT;
		}

		return $vars;
	}

	/**
	 * @param array<string, string> $items WooCommerce account menu items.
	 * @return array<string, string>
	 */
	public function add_menu_item( array $items ): array {
		$items[ self::ENDPOINT ] = $this->label( 'Pug Portal' );

		if ( ! isset( $items['customer-logout'] ) ) {
			return $items;
		}

		$with_portal = array();

		foreach ( $items as $key => $label ) {
			if ( 'customer-logout' === $key ) {
				$with_portal[ self::ENDPOINT ] = $this->label( 'Pug Portal' );
			}

			if ( self::ENDPOINT !== $key ) {
				$with_portal[ $key ] = $label;
			}
		}

		return $with_portal;
	}

	public function render_endpoint(): void {
		echo $this->presenter->render_html( $this->portal_payload() ); // phpcs:ignore WordPress.Security.EscapeOutput.OutputNotEscaped
	}

	public function enqueue_assets(): void {
		if ( ! function_exists( 'wp_enqueue_style' ) || ! $this->should_enqueue_assets() ) {
			return;
		}

		wp_enqueue_style(
			self::STYLE_HANDLE,
			$this->asset_url( 'assets/css/customer-account-portal.css' ),
			array(),
			Version::PLUGIN
		);

		if ( function_exists( 'wp_add_inline_style' ) ) {
			wp_add_inline_style(
				self::STYLE_HANDLE,
				'.tcg-account-portal {' . BrandingSettings::css_variable_string( Settings::all() ) . '}'
			);
		}
	}

	/**
	 * @return array<string, mixed>
	 */
	private function portal_payload(): array {
		$user_id = $this->current_user_id();
		$email   = $this->current_user_email( $user_id );

		$customer = '' === $email ? null : $this->find_customer_by_email( $email );
		$ledger   = null === $customer ? array() : $this->recent_ledger_entries( (int) $customer['customer_id'] );
		$orders   = $this->recent_order_snapshots( $user_id );
		$events   = '' === $email ? array() : $this->recent_event_registration_snapshots( $email );

		return $this->presenter->present(
			$customer,
			$ledger,
			$orders,
			array(
				'currency'                     => $customer['credit_currency'] ?? 'USD',
				'is_logged_in'                 => $user_id > 0,
				'woocommerce_orders_available' => function_exists( 'wc_get_orders' ),
				'branding'                     => BrandingSettings::public_config( Settings::all() ),
				'links'                        => $this->portal_links(),
			),
			$events
		);
	}

	/**
	 * @return array<string, mixed>|null
	 */
	private function find_customer_by_email( string $email ): ?array {
		global $wpdb;

		if ( ! is_object( $wpdb ?? null ) || ! isset( $wpdb->prefix ) || ! method_exists( $wpdb, 'get_row' ) ) {
			return null;
		}

		$table_name = $wpdb->prefix . 'tcg_customers';

		$row = $wpdb->get_row(
			$wpdb->prepare(
				"SELECT * FROM {$table_name} WHERE normalized_email = %s AND status = %s LIMIT 1", // phpcs:ignore WordPress.DB.PreparedSQL.InterpolatedNotPrepared
				$email,
				'active'
			),
			$this->array_a()
		);

		return is_array( $row ) ? $row : null;
	}

	/**
	 * @return list<array<string, mixed>>
	 */
	private function recent_ledger_entries( int $customer_id ): array {
		global $wpdb;

		if ( $customer_id <= 0 || ! is_object( $wpdb ?? null ) || ! isset( $wpdb->prefix ) ) {
			return array();
		}

		$table_name = $wpdb->prefix . 'tcg_customer_credit_ledger';
		$rows       = $wpdb->get_results(
			$wpdb->prepare(
				"SELECT * FROM {$table_name}
				WHERE customer_id = %d
				ORDER BY created_at DESC, credit_ledger_id DESC
				LIMIT %d", // phpcs:ignore WordPress.DB.PreparedSQL.InterpolatedNotPrepared
				$customer_id,
				self::LEDGER_LIMIT
			),
			$this->array_a()
		);

		return is_array( $rows ) ? array_values( array_filter( $rows, 'is_array' ) ) : array();
	}

	/**
	 * @return list<array<string, mixed>>
	 */
	private function recent_order_snapshots( int $user_id ): array {
		if ( $user_id <= 0 || ! function_exists( 'wc_get_orders' ) ) {
			return array();
		}

		try {
			$orders = wc_get_orders(
				array(
					'customer_id' => $user_id,
					'limit'       => self::ORDER_LIMIT,
					'orderby'     => 'date',
					'order'       => 'DESC',
					'status'      => array( 'pending', 'processing', 'on-hold', 'completed', 'cancelled', 'refunded', 'failed' ),
					'return'      => 'objects',
				)
			);
		} catch ( \Throwable ) {
			return array();
		}

		if ( ! is_array( $orders ) ) {
			return array();
		}

		$snapshots = array();

		foreach ( $orders as $order ) {
			$snapshots[] = $this->order_snapshot( $order );
		}

		return $snapshots;
	}

	/**
	 * @return list<array<string, mixed>>
	 */
	private function recent_event_registration_snapshots( string $email ): array {
		global $wpdb;

		if ( '' === $email || ! is_object( $wpdb ?? null ) || ! isset( $wpdb->prefix ) ) {
			return array();
		}

		$registrations_table = $wpdb->prefix . 'tcg_event_registrations';
		$events_table        = $wpdb->prefix . 'tcg_events';
		$rows                = $wpdb->get_results(
			$wpdb->prepare(
				"SELECT registrations.*, events.title AS event_title, events.slug AS event_slug, events.start_datetime, events.end_datetime, events.timezone, events.location_id, events.game, events.format, events.entry_fee, events.currency
				FROM {$registrations_table} registrations
				INNER JOIN {$events_table} events ON events.event_id = registrations.event_id
				WHERE LOWER(registrations.email) = LOWER(%s)
				ORDER BY events.start_datetime DESC, registrations.created_at DESC
				LIMIT %d", // phpcs:ignore WordPress.DB.PreparedSQL.InterpolatedNotPrepared
				$email,
				self::EVENT_LIMIT
			),
			$this->array_a()
		);

		return is_array( $rows ) ? array_values( array_filter( $rows, 'is_array' ) ) : array();
	}

	/**
	 * @return array<string, mixed>
	 */
	private function order_snapshot( mixed $order ): array {
		$order_id = method_exists( $order, 'get_id' ) ? (int) $order->get_id() : 0;
		$currency = method_exists( $order, 'get_currency' ) ? (string) $order->get_currency() : 'USD';
		$lines    = $this->order_line_snapshots( $order, $currency );

		return array(
			'order_id'     => $order_id,
			'order_number' => method_exists( $order, 'get_order_number' ) ? (string) $order->get_order_number() : (string) $order_id,
			'status'       => method_exists( $order, 'get_status' ) ? (string) $order->get_status() : '',
			'status_label' => $this->order_status_label( $order ),
			'created_at'   => method_exists( $order, 'get_date_created' ) ? $this->date_string( $order->get_date_created() ) : null,
			'total'        => method_exists( $order, 'get_total' ) ? $this->decimal_string( $order->get_total() ) : '0.0000',
			'currency'     => $currency,
			'item_count'   => method_exists( $order, 'get_item_count' ) ? (int) $order->get_item_count() : count( $lines ),
			'view_url'     => method_exists( $order, 'get_view_order_url' ) ? (string) $order->get_view_order_url() : null,
			'lines'        => $lines,
		);
	}

	/**
	 * @return list<array<string, mixed>>
	 */
	private function order_line_snapshots( mixed $order, string $currency ): array {
		if ( ! method_exists( $order, 'get_items' ) ) {
			return array();
		}

		try {
			$items = $order->get_items( 'line_item' );
		} catch ( \Throwable ) {
			$items = $order->get_items();
		}

		if ( ! is_iterable( $items ) ) {
			return array();
		}

		$lines = array();

		foreach ( $items as $item ) {
			$lines[] = array(
				'name'           => method_exists( $item, 'get_name' ) ? (string) $item->get_name() : '',
				'card_name'      => $this->item_meta( $item, '_tcg_card_name' ),
				'quantity'       => method_exists( $item, 'get_quantity' ) ? (int) $item->get_quantity() : 1,
				'total'          => method_exists( $item, 'get_total' ) ? $this->decimal_string( $item->get_total() ) : '0.0000',
				'currency'       => $currency,
				'is_serialized'  => '1' === $this->item_meta( $item, '_tcg_serialized_inventory' ),
				'inventory_id'   => $this->positive_int_or_null( $this->item_meta( $item, '_tcg_inventory_id' ) ),
				'condition_code' => $this->item_meta( $item, '_tcg_condition_code' ),
				'set_name'       => $this->item_meta( $item, '_tcg_set_name' ),
				'card_number'    => $this->item_meta( $item, '_tcg_card_number' ),
			);
		}

		return $lines;
	}

	private function order_status_label( mixed $order ): string {
		$status = method_exists( $order, 'get_status' ) ? (string) $order->get_status() : '';

		if ( function_exists( 'wc_get_order_status_name' ) && '' !== $status ) {
			return (string) wc_get_order_status_name( $status );
		}

		return ucwords( str_replace( '-', ' ', $status ) );
	}

	private function item_meta( mixed $item, string $key ): string {
		if ( ! method_exists( $item, 'get_meta' ) ) {
			return '';
		}

		$value = $item->get_meta( $key, true );

		return trim( preg_replace( '/\s+/', ' ', (string) $value ) ?? '' );
	}

	private function current_user_id(): int {
		if ( function_exists( 'get_current_user_id' ) ) {
			return max( 0, (int) get_current_user_id() );
		}

		return 0;
	}

	private function current_user_email( int $user_id ): string {
		if ( $user_id <= 0 || ! function_exists( 'get_userdata' ) ) {
			return '';
		}

		$user  = get_userdata( $user_id );
		$email = is_object( $user ) && isset( $user->user_email ) ? (string) $user->user_email : '';
		$email = strtolower( trim( $email ) );

		if ( function_exists( 'sanitize_email' ) ) {
			$email = sanitize_email( $email );
		}

		return filter_var( $email, FILTER_VALIDATE_EMAIL ) ? $email : '';
	}

	private function date_string( mixed $date ): ?string {
		if ( $date instanceof DateTimeInterface ) {
			return $date->format( 'Y-m-d H:i:s' );
		}

		if ( is_object( $date ) && method_exists( $date, 'date' ) ) {
			return (string) $date->date( 'Y-m-d H:i:s' );
		}

		return null;
	}

	private function decimal_string( mixed $value ): string {
		$value = trim( (string) $value );

		if ( 1 !== preg_match( '/^-?\d+(?:\.\d+)?$/', $value ) ) {
			return '0.0000';
		}

		return number_format( (float) $value, 4, '.', '' );
	}

	private function positive_int_or_null( mixed $value ): ?int {
		if ( null === $value || '' === $value ) {
			return null;
		}

		$value = (int) $value;

		return $value > 0 ? $value : null;
	}

	private function endpoint_places(): int {
		$root  = defined( 'EP_ROOT' ) ? (int) constant( 'EP_ROOT' ) : 0;
		$pages = defined( 'EP_PAGES' ) ? (int) constant( 'EP_PAGES' ) : 0;

		return $root | $pages;
	}

	/**
	 * @return array<string, string|null>
	 */
	private function portal_links(): array {
		$shop_url = null;
		if ( function_exists( 'wc_get_page_permalink' ) ) {
			$shop_url = (string) wc_get_page_permalink( 'shop' );
		}

		$orders_url = null;
		if ( function_exists( 'wc_get_account_endpoint_url' ) ) {
			$orders_url = (string) wc_get_account_endpoint_url( 'orders' );
		}

		return array(
			'shop_url'    => '' === (string) $shop_url ? null : $shop_url,
			'orders_url'  => '' === (string) $orders_url ? null : $orders_url,
			'support_url' => null,
		);
	}

	private function should_enqueue_assets(): bool {
		if ( function_exists( 'is_account_page' ) ) {
			return (bool) is_account_page();
		}

		return false;
	}

	private function asset_url( string $path ): string {
		if ( defined( 'TCG_STORE_PLATFORM_FILE' ) && function_exists( 'plugins_url' ) ) {
			return plugins_url( $path, TCG_STORE_PLATFORM_FILE );
		}

		return $path;
	}

	private function array_a(): mixed {
		return defined( 'ARRAY_A' ) ? constant( 'ARRAY_A' ) : 'ARRAY_A';
	}

	private function label( string $text ): string {
		return function_exists( '__' ) ? __( $text, 'tcg-store-platform' ) : $text;
	}
}
