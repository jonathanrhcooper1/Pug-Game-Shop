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
	public const SHORTCODE    = 'tcg_inventory_search';
	public const STYLE_HANDLE = 'tcg-store-public-inventory';

	private InventorySearchPresenter $presenter;

	public function __construct( ?InventorySearchPresenter $presenter = null ) {
		$this->presenter = $presenter ?? new InventorySearchPresenter();
	}

	public function register(): void {
		add_shortcode( self::SHORTCODE, array( $this, 'render_inventory_search' ) );
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
				'callback' => 'render_inventory_search',
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
						'status'  => 'blocked',
						'message' => 'Inventory search is temporarily unavailable.',
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
						'status'  => 'blocked',
						'message' => 'Search filters need to be adjusted.',
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
						'status'  => 'blocked',
						'message' => 'Inventory search is temporarily unavailable.',
					)
				)
			);
		}

		return $this->presenter->render_html(
			$this->presenter->present(
				$request,
				$result->rows(),
				$result->total()
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
			Version::PLUGIN
		);

		if ( function_exists( 'wp_add_inline_style' ) ) {
			wp_add_inline_style(
				self::STYLE_HANDLE,
				'.tcg-public-inventory {' . BrandingSettings::css_variable_string( Settings::all() ) . '}'
			);
		}
	}

	/**
	 * @param array<string, mixed> $attributes Shortcode attributes.
	 * @return array<string, mixed>
	 */
	private function query_values( array $attributes ): array {
		return array(
			'q'         => $this->request_value( 'tcg_inventory_q', $attributes['query'] ?? '' ),
			'game'      => $this->request_value( 'tcg_inventory_game', $attributes['game'] ?? '' ),
			'sort'      => $this->request_value( 'tcg_inventory_sort', $attributes['sort'] ?? 'relevance' ),
			'visibility' => 'public',
			'page'      => 1,
			'page_size' => min( 48, max( 1, (int) ( $attributes['limit'] ?? 24 ) ) ),
			'status'    => 'available',
		);
	}

	/**
	 * @param array<string, mixed> $values Query values.
	 */
	private function request_from_values( array $values ): \TCGStorePlatform\Inventory\InventorySearchRequest {
		$validation = ( new InventorySearchRequestParser() )->parse(
			array_merge(
				array(
					'q'          => '',
					'game'       => '',
					'sort'       => 'relevance',
					'visibility' => 'public',
					'page'       => 1,
					'page_size'  => 24,
				),
				$values
			)
		);

		if ( $validation->is_valid() && null !== $validation->request() ) {
			return $validation->request();
		}

		$fallback = ( new InventorySearchRequestParser() )->parse(
			array(
				'q'          => '',
				'game'       => '',
				'sort'       => 'relevance',
				'visibility' => 'public',
				'page'       => 1,
				'page_size'  => 24,
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
