<?php
/**
 * Public inventory search shortcode.
 *
 * @package TCGStorePlatform
 */

namespace TCGStorePlatform\PublicSite;

use TCGStorePlatform\Inventory\InventorySearchQueryPlanner;
use TCGStorePlatform\Inventory\InventorySearchRepository;
use TCGStorePlatform\Inventory\InventorySearchRequestParser;
use TCGStorePlatform\Settings\BrandingSettings;
use TCGStorePlatform\Settings\Settings;
use TCGStorePlatform\Version;

final class InventorySearchShortcode {
	public const SHORTCODE             = 'tcg_inventory_search';
	public const STYLE_HANDLE          = 'tcg-store-public-inventory';
	public const SCRIPT_HANDLE         = 'tcg-store-public-storefront-links';
	public const STOREFRONT_PAGE_SLUGS = array(
		'shop-singles',
		'shop-graded-cards',
		'card-inventory',
		'events',
	);

	private InventorySearchPresenter $presenter;

	public function __construct( ?InventorySearchPresenter $presenter = null ) {
		$this->presenter = $presenter ?? new InventorySearchPresenter();
	}

	public function register(): void {
		add_shortcode( self::SHORTCODE, array( $this, 'render_inventory_search' ) );
		add_action( 'wp_enqueue_scripts', array( $this, 'enqueue_assets' ) );
		add_action( 'wp', array( $this, 'mark_inventory_pages_uncacheable' ) );
		add_action( 'send_headers', array( $this, 'mark_inventory_pages_uncacheable' ), PHP_INT_MAX );
		add_action( 'template_redirect', array( $this, 'redirect_legacy_shop_page' ), 1 );
		add_filter( 'wp_headers', array( $this, 'filter_inventory_no_cache_headers' ), PHP_INT_MAX );
		add_filter( 'woocommerce_return_to_shop_redirect', array( $this, 'return_to_singles_shop_url' ) );
	}

	/**
	 * @return list<array{type:string,hook:string,callback:string}>
	 */
	public static function hook_contracts(): array {
		return array(
			array(
				'type'     => 'shortcode',
				'hook'     => self::SHORTCODE,
				'callback' => 'render_inventory_search',
			),
			array(
				'type'     => 'action',
				'hook'     => 'wp_enqueue_scripts',
				'callback' => 'enqueue_assets',
			),
			array(
				'type'     => 'action',
				'hook'     => 'wp',
				'callback' => 'mark_inventory_pages_uncacheable',
			),
			array(
				'type'     => 'action',
				'hook'     => 'send_headers',
				'callback' => 'mark_inventory_pages_uncacheable',
			),
			array(
				'type'     => 'action',
				'hook'     => 'template_redirect',
				'callback' => 'redirect_legacy_shop_page',
			),
			array(
				'type'     => 'filter',
				'hook'     => 'wp_headers',
				'callback' => 'filter_inventory_no_cache_headers',
			),
			array(
				'type'     => 'filter',
				'hook'     => 'woocommerce_return_to_shop_redirect',
				'callback' => 'return_to_singles_shop_url',
			),
		);
	}

	public function return_to_singles_shop_url( string $url = '' ): string {
		if ( ! function_exists( 'home_url' ) ) {
			return $url;
		}

		return home_url( '/shop-singles/' );
	}

	/**
	 * @param array<string, string> $headers Headers prepared by WordPress.
	 * @return array<string, string>
	 */
	public function filter_inventory_no_cache_headers( array $headers ): array {
		if ( ! $this->is_inventory_page_context() ) {
			return $headers;
		}

		$headers['Cache-Control']         = 'no-store, no-cache, must-revalidate, max-age=0';
		$headers['Pragma']                = 'no-cache';
		$headers['Expires']               = 'Wed, 11 Jan 1984 05:00:00 GMT';
		$headers['Surrogate-Control']     = 'no-store';
		$headers['X-Accel-Expires']       = '0';
		$headers['X-TCG-Inventory-Cache'] = 'bypass';

		return $headers;
	}

	public function mark_inventory_pages_uncacheable(): void {
		if ( ! $this->is_inventory_page_context() ) {
			return;
		}

		if ( ! defined( 'DONOTCACHEPAGE' ) ) {
			define( 'DONOTCACHEPAGE', true );
		}

		$this->send_inventory_no_cache_headers();
	}

	public function redirect_legacy_shop_page(): void {
		if ( function_exists( 'is_admin' ) && is_admin() ) {
			return;
		}

		if ( defined( 'REST_REQUEST' ) && REST_REQUEST ) {
			return;
		}

		$should_redirect = false;

		if ( function_exists( 'is_shop' ) && is_shop() ) {
			$should_redirect = true;
		}

		if ( function_exists( 'is_page' ) && is_page( 'shop' ) ) {
			$should_redirect = true;
		}

		if ( ! $should_redirect ) {
			$path            = trim( (string) ( $_SERVER['REQUEST_URI'] ?? '' ) ); // phpcs:ignore WordPress.Security.ValidatedSanitizedInput.InputNotSanitized
			$path            = parse_url( $path, PHP_URL_PATH );
			$should_redirect = '/shop' === rtrim( (string) $path, '/' );
		}

		if ( ! $should_redirect || ! function_exists( 'wp_safe_redirect' ) || ! function_exists( 'home_url' ) ) {
			return;
		}

		wp_safe_redirect( home_url( '/shop-singles/' ), 301 );
		exit;
	}

	/**
	 * @param array<string, mixed>|string $attributes Shortcode attributes.
	 */
	public function render_inventory_search( array|string $attributes = array() ): string {
		global $wpdb;

		$this->enqueue_assets();

		if ( ! is_object( $wpdb ?? null ) || ! isset( $wpdb->prefix ) ) {
			return $this->presenter->render_html(
				$this->presenter->present(
					$this->request_from_values( array() ),
					array(),
					0,
					array(
						'settings' => Settings::all(),
						'status'   => 'blocked',
						'message'  => 'Inventory search is temporarily unavailable.',
					)
				)
			);
		}

		$values     = $this->query_values( is_array( $attributes ) ? $attributes : array() );
		$validation = ( new InventorySearchRequestParser() )->parse( $values );

		if ( ! $validation->is_valid() ) {
			return $this->presenter->render_html(
				$this->presenter->present(
					$this->request_from_values( $values ),
					array(),
					0,
					array(
						'settings' => Settings::all(),
						'status'   => 'blocked',
						'message'  => 'Search filters need to be adjusted.',
					)
				)
			);
		}

		$request    = $validation->request();
		$query_plan = ( new InventorySearchQueryPlanner() )->plan( $request, (string) $wpdb->prefix );
		$result     = ( new InventorySearchRepository( $wpdb ) )->fetch( $query_plan );

		if ( $result->is_rejected() ) {
			return $this->presenter->render_html(
				$this->presenter->present(
					$request,
					array(),
					0,
					array(
						'settings' => Settings::all(),
						'status'   => 'blocked',
						'message'  => 'Inventory search is temporarily unavailable.',
					)
				)
			);
		}

		return $this->presenter->render_html(
			$this->presenter->present(
				$request,
				$result->rows(),
				$result->total(),
				array(
					'settings' => Settings::all(),
				)
			)
		);
	}

	public function enqueue_assets(): void {
		if ( ! function_exists( 'wp_enqueue_style' ) ) {
			return;
		}

		wp_enqueue_style(
			self::STYLE_HANDLE,
			$this->asset_url( 'assets/css/public-inventory.css' ),
			array(),
			Version::PLUGIN . '-dark-storefront-card-media'
		);

		if ( function_exists( 'wp_add_inline_style' ) ) {
			wp_add_inline_style(
				self::STYLE_HANDLE,
				'.tcg-public-inventory {' . BrandingSettings::css_variable_string( Settings::all() ) . '}'
			);
		}

		if ( function_exists( 'wp_enqueue_script' ) ) {
			wp_enqueue_script(
				self::SCRIPT_HANDLE,
				$this->asset_url( 'assets/js/public-storefront-links.js' ),
				array(),
				Version::PLUGIN . '-storefront-links',
				true
			);
		}
	}

	/**
	 * @param array<string, mixed> $attributes Shortcode attributes.
	 * @return array<string, mixed>
	 */
	private function query_values( array $attributes ): array {
		return array(
			'q'             => $this->request_value( 'tcg_inventory_q', $attributes['query'] ?? '' ),
			'game'          => $this->request_value( 'tcg_inventory_game', $attributes['game'] ?? '' ),
			'set_filter'    => $this->request_value( 'tcg_inventory_set', $attributes['set'] ?? ( $attributes['set_filter'] ?? '' ) ),
			'raw_or_graded' => $this->request_value( 'tcg_inventory_type', $attributes['raw_or_graded'] ?? ( $attributes['product_type'] ?? 'raw' ) ),
			'sort'          => $this->request_value( 'tcg_inventory_sort', $attributes['sort'] ?? 'relevance' ),
			'visibility'    => 'public',
			'page'          => $this->request_positive_int( 'tcg_inventory_page', $attributes['page'] ?? 1, 1, 9999 ),
			'page_size'     => $this->request_positive_int( 'tcg_inventory_page_size', $attributes['limit'] ?? 24, 1, 48 ),
			'status'        => 'available',
		);
	}

	/**
	 * @param array<string, mixed> $values Query values.
	 */
	private function request_from_values( array $values ): \TCGStorePlatform\Inventory\InventorySearchRequest {
		$validation = ( new InventorySearchRequestParser() )->parse(
			array_merge(
				array(
					'q'             => '',
					'game'          => '',
					'set_filter'    => '',
					'raw_or_graded' => 'raw',
					'sort'          => 'relevance',
					'visibility'    => 'public',
					'page'          => 1,
					'page_size'     => 24,
				),
				$values
			)
		);

		if ( $validation->is_valid() && null !== $validation->request() ) {
			return $validation->request();
		}

		$fallback = ( new InventorySearchRequestParser() )->parse(
			array(
				'q'             => '',
				'game'          => '',
				'set_filter'    => '',
				'raw_or_graded' => 'raw',
				'sort'          => 'relevance',
				'visibility'    => 'public',
				'page'          => 1,
				'page_size'     => 24,
			)
		)->request();

		if ( null === $fallback ) {
			throw new \RuntimeException( 'Public inventory fallback request could not be created.' );
		}

		return $fallback;
	}

	private function request_value( string $key, mixed $fallback ): string {
		if ( isset( $_GET[ $key ] ) ) { // phpcs:ignore WordPress.Security.NonceVerification.Recommended
			$value = function_exists( 'wp_unslash' )
				? wp_unslash( $_GET[ $key ] ) // phpcs:ignore WordPress.Security.NonceVerification.Recommended
				: $_GET[ $key ]; // phpcs:ignore WordPress.Security.NonceVerification.Recommended

			return is_scalar( $value ) ? $this->clean_request_value( (string) $value ) : '';
		}

		return is_scalar( $fallback ) ? $this->clean_request_value( (string) $fallback ) : '';
	}

	private function request_positive_int( string $key, mixed $fallback, int $min, int $max ): int {
		$value = $this->request_value( $key, $fallback );
		$int   = (int) $value;

		return min( $max, max( $min, $int ) );
	}

	private function is_inventory_page_context(): bool {
		if (
			isset( $_GET['tcg_inventory_q'] )
			|| isset( $_GET['tcg_inventory_game'] )
			|| isset( $_GET['tcg_inventory_set'] )
			|| isset( $_GET['tcg_inventory_type'] )
			|| isset( $_GET['tcg_inventory_sort'] )
			|| isset( $_GET['tcg_inventory_page'] )
		) { // phpcs:ignore WordPress.Security.NonceVerification.Recommended
			return true;
		}

		if (
			( function_exists( 'is_front_page' ) && is_front_page() )
			|| ( function_exists( 'is_home' ) && is_home() )
		) {
			return true;
		}

		if ( ! function_exists( 'is_singular' ) || ! function_exists( 'get_queried_object' ) || ! function_exists( 'has_shortcode' ) ) {
			return false;
		}

		if ( ! is_singular() ) {
			return false;
		}

		if ( function_exists( 'is_page' ) && is_page( self::STOREFRONT_PAGE_SLUGS ) ) {
			return true;
		}

		$object = get_queried_object();

		return is_object( $object )
			&& isset( $object->post_content )
			&& (
				has_shortcode( (string) $object->post_content, self::SHORTCODE )
				|| has_shortcode( (string) $object->post_content, ProductShelfShortcode::SHORTCODE )
			);
	}

	private function send_inventory_no_cache_headers(): void {
		if ( function_exists( 'nocache_headers' ) ) {
			nocache_headers();
		}

		if ( headers_sent() ) {
			return;
		}

		header( 'Cache-Control: no-store, no-cache, must-revalidate, max-age=0', true );
		header( 'Pragma: no-cache', true );
		header( 'Expires: Wed, 11 Jan 1984 05:00:00 GMT', true );
		header( 'Surrogate-Control: no-store', true );
		header( 'X-Accel-Expires: 0', true );
		header( 'X-TCG-Inventory-Cache: bypass', true );
	}

	private function clean_request_value( string $value ): string {
		return function_exists( 'sanitize_text_field' )
			? sanitize_text_field( $value )
			: trim( strip_tags( $value ) );
	}

	private function asset_url( string $path ): string {
		if ( defined( 'TCG_STORE_PLATFORM_URL' ) ) {
			return rtrim( (string) TCG_STORE_PLATFORM_URL, '/' ) . '/' . ltrim( $path, '/' );
		}

		return function_exists( 'plugins_url' )
			? plugins_url( $path, dirname( __DIR__, 2 ) . '/tcg-store-platform.php' )
			: ltrim( $path, '/' );
	}
}
