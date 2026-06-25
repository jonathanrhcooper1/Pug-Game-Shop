<?php
/**
 * Public WooCommerce product shelf shortcode.
 *
 * @package TCGStorePlatform
 */

namespace TCGStorePlatform\PublicSite;

use TCGStorePlatform\Version;

final class ProductShelfShortcode {
	public const SHORTCODE    = 'tcg_product_shelf';
	public const STYLE_HANDLE = InventorySearchShortcode::STYLE_HANDLE;

	private mixed $product_provider;

	public function __construct( ?callable $product_provider = null ) {
		$this->product_provider = $product_provider ?? array( $this, 'default_product_provider' );
	}

	public function register(): void {
		add_shortcode( self::SHORTCODE, array( $this, 'render_product_shelf' ) );
		add_action( 'wp_enqueue_scripts', array( $this, 'enqueue_assets' ) );
	}

	/**
	 * @return list<array{type:string,hook:string,callback:string}>
	 */
	public static function hook_contracts(): array {
		return array(
			array(
				'type'     => 'shortcode',
				'hook'     => self::SHORTCODE,
				'callback' => 'render_product_shelf',
			),
			array(
				'type'     => 'action',
				'hook'     => 'wp_enqueue_scripts',
				'callback' => 'enqueue_assets',
			),
		);
	}

	/**
	 * @param array<string, mixed>|string $attributes Shortcode attributes.
	 */
	public function render_product_shelf( array|string $attributes = array() ): string {
		$this->enqueue_assets();

		$attributes = $this->normalize_attributes( is_array( $attributes ) ? $attributes : array() );
		$provider   = is_callable( $this->product_provider ) ? $this->product_provider : array( $this, 'default_product_provider' );
		$products   = $provider( $attributes );
		$products   = is_array( $products ) ? array_values( array_filter( $products, 'is_array' ) ) : array();

		$html  = '<section class="tcg-product-shelf" data-resource="product_shelf" data-category="' . $this->esc_attr( $attributes['category'] ) . '">';
		$html .= '<div class="tcg-product-shelf__toolbar">';
		$html .= '<span>' . $this->esc_html( $this->toolbar_label( $attributes, count( $products ) ) ) . '</span>';
		$html .= '</div>';

		if ( array() === $products ) {
			$html .= $this->render_empty_state( $attributes );
		} else {
			$html .= '<div class="tcg-product-shelf__grid">';
			foreach ( array_slice( $products, 0, (int) $attributes['limit'] ) as $product ) {
				$html .= $this->render_product_card( $product );
			}
			$html .= '</div>';
		}

		$html .= '</section>';

		return $html;
	}

	public function enqueue_assets(): void {
		if ( ! function_exists( 'wp_enqueue_style' ) ) {
			return;
		}

		wp_enqueue_style(
			self::STYLE_HANDLE,
			$this->asset_url( 'assets/css/public-inventory.css' ),
			array(),
			Version::PLUGIN . '-product-shelf'
		);
	}

	/**
	 * @param array<string, mixed> $attributes Shortcode attributes.
	 * @return list<array<string, mixed>>
	 */
	public function default_product_provider( array $attributes ): array {
		if ( ! function_exists( 'wc_get_products' ) ) {
			return array();
		}

		$wc_products = wc_get_products(
			array(
				'status'  => 'publish',
				'limit'   => (int) $attributes['limit'],
				'category' => array( (string) $attributes['category'] ),
				'orderby' => 'date',
				'order'   => 'DESC',
			)
		);

		$products = array();

		foreach ( is_array( $wc_products ) ? $wc_products : array() as $product ) {
			if ( ! is_object( $product ) ) {
				continue;
			}

			$id = method_exists( $product, 'get_id' ) ? (int) $product->get_id() : 0;

			$products[] = array(
				'name'        => method_exists( $product, 'get_name' ) ? (string) $product->get_name() : '',
				'url'         => function_exists( 'get_permalink' ) && $id > 0 ? (string) get_permalink( $id ) : '',
				'image_html'  => method_exists( $product, 'get_image' ) ? (string) $product->get_image( 'woocommerce_thumbnail', array( 'loading' => 'lazy' ) ) : '',
				'price_html'  => method_exists( $product, 'get_price_html' ) ? (string) $product->get_price_html() : '',
				'stock_label' => $this->stock_label( $product ),
				'summary'     => method_exists( $product, 'get_short_description' ) ? (string) $product->get_short_description() : '',
			);
		}

		return $products;
	}

	/**
	 * @param array<string, mixed> $attributes Raw shortcode attributes.
	 * @return array{category:string,limit:int,label:string,empty_title:string,empty_message:string}
	 */
	private function normalize_attributes( array $attributes ): array {
		$category = $this->clean_slug( $attributes['category'] ?? 'sealed-products' );
		$limit    = max( 1, min( 48, (int) ( $attributes['limit'] ?? 24 ) ) );
		$label    = $this->clean_text( $attributes['label'] ?? $this->category_label( $category ) );

		return array(
			'category'      => $category,
			'limit'         => $limit,
			'label'         => $label,
			'empty_title'   => $this->clean_text( $attributes['empty_title'] ?? 'No ' . strtolower( $label ) . ' are live online yet.' ),
			'empty_message' => $this->clean_text( $attributes['empty_message'] ?? 'This shelf is connected to WooCommerce and will fill automatically when products are published in the ' . $label . ' category.' ),
		);
	}

	/**
	 * @param array{category:string,limit:int,label:string,empty_title:string,empty_message:string} $attributes Normalized attributes.
	 */
	private function render_empty_state( array $attributes ): string {
		$html  = '<section class="tcg-product-shelf__empty" aria-live="polite">';
		$html .= '<p class="tcg-product-shelf__empty-kicker">' . $this->esc_html( 'Shelf connected' ) . '</p>';
		$html .= '<h3>' . $this->esc_html( $attributes['empty_title'] ) . '</h3>';
		$html .= '<p>' . $this->esc_html( $attributes['empty_message'] ) . '</p>';
		$html .= '<div class="tcg-product-shelf__empty-actions">';
		$html .= '<a href="/shop-singles/">' . $this->esc_html( 'Browse singles' ) . '</a>';
		$html .= '<a href="/contact/">' . $this->esc_html( 'Ask the shop' ) . '</a>';
		$html .= '</div>';
		$html .= '</section>';

		return $html;
	}

	/**
	 * @param array<string, mixed> $product Product view model.
	 */
	private function render_product_card( array $product ): string {
		$url        = $this->clean_url( $product['url'] ?? '' );
		$name       = $this->clean_text( $product['name'] ?? '' );
		$price_html = $this->safe_html( (string) ( $product['price_html'] ?? '' ) );
		$image_html = $this->safe_html( (string) ( $product['image_html'] ?? '' ) );
		$stock      = $this->clean_text( $product['stock_label'] ?? '' );
		$summary    = $this->clean_text( $product['summary'] ?? '' );

		$html  = '<article class="tcg-product-shelf__card">';
		$html .= '<a class="tcg-product-shelf__media" href="' . $this->esc_url( $url ) . '" aria-label="' . $this->esc_attr( $name ) . '">';
		$html .= $this->has_real_product_image( $image_html ) ? $image_html : '<span class="tcg-product-shelf__image-placeholder"><strong>PUG</strong><small>Cards, games, and more</small></span>';
		$html .= '</a>';
		$html .= '<div class="tcg-product-shelf__body">';
		$html .= '<p class="tcg-product-shelf__category">' . $this->esc_html( 'The Pug shelf' ) . '</p>';
		$html .= '<h3><a href="' . $this->esc_url( $url ) . '">' . $this->esc_html( $name ) . '</a></h3>';

		if ( '' !== $summary ) {
			$html .= '<p class="tcg-product-shelf__summary">' . $this->esc_html( $summary ) . '</p>';
		}

		$html .= '<div class="tcg-product-shelf__meta">';
		$html .= '<strong>' . ( '' !== $price_html ? $price_html : $this->esc_html( 'See details' ) ) . '</strong>';

		if ( '' !== $stock ) {
			$html .= '<span>' . $this->esc_html( $stock ) . '</span>';
		}

		$html .= '</div>';
		$html .= '<a class="tcg-product-shelf__button" href="' . $this->esc_url( $url ) . '">' . $this->esc_html( 'View product' ) . '</a>';
		$html .= '</div></article>';

		return $html;
	}

	/**
	 * @param array{category:string,limit:int,label:string,empty_title:string,empty_message:string} $attributes Normalized attributes.
	 */
	private function toolbar_label( array $attributes, int $count ): string {
		if ( 0 === $count ) {
			return $attributes['label'] . ' shelf ready for products';
		}

		return 'Showing ' . $count . ' ' . strtolower( $attributes['label'] ) . ( 1 === $count ? '' : ' items' );
	}

	private function stock_label( object $product ): string {
		if ( method_exists( $product, 'is_in_stock' ) && ! $product->is_in_stock() ) {
			return 'Out of stock';
		}

		if ( method_exists( $product, 'get_stock_quantity' ) ) {
			$quantity = $product->get_stock_quantity();
			if ( null !== $quantity ) {
				return max( 0, (int) $quantity ) . ' available';
			}
		}

		return 'In stock';
	}

	private function category_label( string $category ): string {
		return match ( $category ) {
			'sealed-products' => 'Sealed Products',
			'graded-cards' => 'Graded Cards',
			'accessories' => 'Accessories',
			default => ucwords( str_replace( '-', ' ', $category ) ),
		};
	}

	private function clean_slug( mixed $value ): string {
		$value = strtolower( trim( (string) $value ) );
		$value = preg_replace( '/[^a-z0-9_-]+/', '-', $value ) ?? '';

		return trim( $value, '-' ) ?: 'sealed-products';
	}

	private function clean_text( mixed $value ): string {
		return trim(
			function_exists( 'wp_strip_all_tags' )
				? wp_strip_all_tags( (string) $value )
				: strip_tags( (string) $value )
		);
	}

	private function clean_url( mixed $value ): string {
		return trim( filter_var( (string) $value, FILTER_SANITIZE_URL ) );
	}

	private function safe_html( string $html ): string {
		$html = preg_replace( '#<script\\b[^>]*>.*?</script>#is', '', $html ) ?? '';

		return function_exists( 'wp_kses_post' ) ? wp_kses_post( $html ) : $html;
	}

	private function has_real_product_image( string $image_html ): bool {
		if ( '' === trim( $image_html ) ) {
			return false;
		}

		return ! preg_match( '/woocommerce-placeholder|placeholder(?:-[0-9x]+)?\.(?:png|jpe?g|webp|gif)/i', $image_html );
	}

	private function esc_html( string $value ): string {
		return function_exists( 'esc_html' ) ? esc_html( $value ) : htmlspecialchars( $value, ENT_QUOTES, 'UTF-8' );
	}

	private function esc_attr( string $value ): string {
		return function_exists( 'esc_attr' ) ? esc_attr( $value ) : htmlspecialchars( $value, ENT_QUOTES, 'UTF-8' );
	}

	private function esc_url( string $value ): string {
		return function_exists( 'esc_url' ) ? esc_url( $value ) : htmlspecialchars( $value, ENT_QUOTES, 'UTF-8' );
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
