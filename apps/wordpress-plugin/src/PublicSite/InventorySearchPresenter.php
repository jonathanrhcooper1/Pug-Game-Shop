<?php
/**
 * Customer-facing inventory search presentation.
 *
 * @package TCGStorePlatform
 */

namespace TCGStorePlatform\PublicSite;

use TCGStorePlatform\Inventory\InventorySearchRequest;
use TCGStorePlatform\Settings\BrandingSettings;

final class InventorySearchPresenter {
	/**
	 * @param list<array<string, mixed>> $rows Customer-visible inventory rows.
	 * @param array<string, mixed>       $context Runtime context.
	 * @return array<string, mixed>
	 */
	public function present( InventorySearchRequest $request, array $rows, int $total, array $context = array() ): array {
		$total     = max( 0, $total );
		$page      = max( 1, $request->page() );
		$page_size = max( 1, $request->page_size() );

		return array(
			'resource'      => 'public_inventory_search',
			'brand'         => BrandingSettings::public_config( $context['settings'] ?? BrandingSettings::defaults() ),
			'query'         => $request->query(),
			'game'          => $request->game(),
			'set_filter'    => $request->set_filter(),
			'sort'          => $request->sort(),
			'page'          => $page,
			'page_size'     => $page_size,
			'total_pages'   => max( 1, (int) ceil( $total / $page_size ) ),
			'has_next_page' => ( $page * $page_size ) < $total,
			'total'         => $total,
			'visible_count' => count( $rows ),
			'groups'        => array_values( $this->groups( $rows, $context ) ),
			'status'        => (string) ( $context['status'] ?? 'ready' ),
			'message'       => (string) ( $context['message'] ?? '' ),
		);
	}

	/**
	 * @param array<string, mixed> $payload Presented payload.
	 */
	public function render_html( array $payload ): string {
		$brand  = is_array( $payload['brand']['company'] ?? null ) ? $payload['brand']['company'] : array();
		$groups = is_array( $payload['groups'] ?? null ) ? $payload['groups'] : array();
		$query  = (string) ( $payload['query'] ?? '' );
		$game   = (string) ( $payload['game'] ?? '' );
		$set_filter = (string) ( $payload['set_filter'] ?? '' );
		$sort   = (string) ( $payload['sort'] ?? 'relevance' );
		$page   = max( 1, (int) ( $payload['page'] ?? 1 ) );
		$page_size = max( 1, (int) ( $payload['page_size'] ?? 24 ) );

		$html  = '<div class="tcg-public-inventory" data-resource="public_inventory_search">';
		$html .= '<section class="tcg-public-inventory__hero">';
		$html .= $this->brand_mark_html( $brand );
		$html .= '<div><p class="tcg-public-inventory__eyebrow">' . $this->esc_html( (string) ( $brand['short_name'] ?? 'The Pug' ) ) . '</p>';
		$html .= '<h2>' . $this->esc_html( 'Browse The Pug inventory' ) . '</h2>';
		$html .= '<p>' . $this->esc_html( 'Search live card inventory with images, condition, quantity, and online pricing.' ) . '</p></div>';
		$html .= '</section>';
		$html .= $this->render_form( $query, $game, $set_filter, $sort, $page_size );

		if ( 'blocked' === (string) ( $payload['status'] ?? '' ) ) {
			$html .= '<p class="tcg-public-inventory__notice">' . $this->esc_html( (string) ( $payload['message'] ?? 'Inventory search is temporarily unavailable.' ) ) . '</p>';
		} elseif ( array() === $groups ) {
			$html .= '<section class="tcg-public-inventory__empty" aria-live="polite">';
			$html .= '<p class="tcg-public-inventory__empty-kicker">' . $this->esc_html( 'Inventory syncing' ) . '</p>';
			$html .= '<h3>' . $this->esc_html( 'No singles are live online yet.' ) . '</h3>';
			$html .= '<p>' . $this->esc_html( 'Cards will appear here after inventory is added with online visibility set to visible and status set to available.' ) . '</p>';
			$html .= '<div class="tcg-public-inventory__empty-actions">';
			$html .= '<a href="/shop/">' . $this->esc_html( 'Browse all products' ) . '</a>';
			$html .= '<a href="/contact/">' . $this->esc_html( 'Ask about a card' ) . '</a>';
			$html .= '</div>';
			$html .= '</section>';
		} else {
			$html .= '<div class="tcg-public-inventory__toolbar"><span>' . $this->esc_html( $this->result_range_label( $payload ) ) . '</span></div>';
			$html .= '<div class="tcg-public-inventory__grid">';

			foreach ( $groups as $group ) {
				if ( is_array( $group ) ) {
					$html .= $this->render_group( $group );
				}
			}

			$html .= '</div>';
			$html .= $this->render_pagination( $payload, $query, $game, $set_filter, $sort, $page );
		}

		$html .= '</div>';

		return $html;
	}

	/**
	 * @param list<array<string, mixed>> $rows Customer-visible inventory rows.
	 * @param array<string, mixed>       $context Runtime context.
	 * @return array<string, array<string, mixed>>
	 */
	private function groups( array $rows, array $context ): array {
		$groups = array();

		foreach ( $rows as $row ) {
			$key = implode(
				'|',
				array(
					$this->clean_string( $row['game'] ?? '' ),
					$this->clean_string( $row['card_name'] ?? '' ),
					$this->clean_string( $row['set_name'] ?? '' ),
					$this->clean_string( $row['printed_number'] ?? ( $row['card_number'] ?? '' ) ),
					$this->clean_string( $row['condition_code'] ?? '' ),
					$this->money( $row['sale_price'] ?? '0.00' ),
					$this->clean_string( $row['front_image_remote_url'] ?? '' ),
				)
			);

			if ( ! isset( $groups[ $key ] ) ) {
				$product_url = $this->product_url( $row['woocommerce_product_id'] ?? null, $context );
				$groups[ $key ] = array(
					'name'          => $this->clean_string( $row['card_name'] ?? '' ),
					'game'          => $this->clean_string( $row['game'] ?? '' ),
					'set_name'      => $this->clean_string( $row['set_name'] ?? '' ),
					'set_code'      => $this->clean_string( $row['set_code'] ?? '' ),
					'printed_number' => $this->clean_string( $row['printed_number'] ?? ( $row['card_number'] ?? '' ) ),
					'condition'     => strtoupper( $this->clean_string( $row['condition_code'] ?? '' ) ),
					'variant'       => $this->clean_string( $row['variant'] ?? ( $row['finish'] ?? '' ) ),
					'image_url'     => $this->clean_url( $row['front_image_remote_url'] ?? '' ),
					'price'         => $this->money( $row['sale_price'] ?? '0.00' ),
					'currency'      => strtoupper( $this->clean_string( $row['sale_currency'] ?? 'USD' ) ),
					'quantity'      => 0,
					'product_url'   => $product_url,
				);
			}

			++$groups[ $key ]['quantity'];
		}

		return $groups;
	}

	private function render_form( string $query, string $game, string $set_filter, string $sort, int $page_size ): string {
		$html  = '<form class="tcg-public-inventory__search" method="get">';
		$html .= '<label><span>' . $this->esc_html( 'Search' ) . '</span><input type="search" name="tcg_inventory_q" value="' . $this->esc_attr( $query ) . '" placeholder="' . $this->esc_attr( 'Card name, set, or number' ) . '" /></label>';
		$html .= '<label><span>' . $this->esc_html( 'Game' ) . '</span><select name="tcg_inventory_game">';
		foreach ( array( '' => 'All games', 'pokemon' => 'Pokemon', 'magic' => 'Magic', 'lorcana' => 'Lorcana', 'one-piece' => 'One Piece' ) as $value => $label ) {
			$html .= '<option value="' . $this->esc_attr( $value ) . '"' . ( $game === $value ? ' selected' : '' ) . '>' . $this->esc_html( $label ) . '</option>';
		}
		$html .= '</select></label>';
		$html .= '<label><span>' . $this->esc_html( 'Set / Expansion' ) . '</span><input type="search" name="tcg_inventory_set" value="' . $this->esc_attr( $set_filter ) . '" placeholder="' . $this->esc_attr( 'Base Set, TDM, or expansion code' ) . '" /></label>';
		$html .= '<label><span>' . $this->esc_html( 'Sort' ) . '</span><select name="tcg_inventory_sort">';
		foreach ( array( 'relevance' => 'Relevance', 'price_asc' => 'Price low', 'price_desc' => 'Price high', 'name_asc' => 'Name' ) as $value => $label ) {
			$html .= '<option value="' . $this->esc_attr( $value ) . '"' . ( $sort === $value ? ' selected' : '' ) . '>' . $this->esc_html( $label ) . '</option>';
		}
		$html .= '</select></label>';
		$html .= '<input type="hidden" name="tcg_inventory_page" value="1" />';
		$html .= '<input type="hidden" name="tcg_inventory_page_size" value="' . $this->esc_attr( (string) max( 1, $page_size ) ) . '" />';
		$html .= '<input type="hidden" name="tcg_inventory_cache_bust" value="" data-tcg-inventory-cache-bust="1" />';
		$html .= '<button type="submit">' . $this->esc_html( 'Search Inventory' ) . '</button>';
		$html .= '</form>';
		$html .= '<script>(function(){var forms=document.querySelectorAll(".tcg-public-inventory__search");for(var i=0;i<forms.length;i++){forms[i].addEventListener("submit",function(){var field=this.querySelector("[data-tcg-inventory-cache-bust]");if(field){field.value=String(Date.now());}});}})();</script>';

		return $html;
	}

	/**
	 * @param array<string, mixed> $payload Presented payload.
	 */
	private function render_pagination( array $payload, string $query, string $game, string $set_filter, string $sort, int $page ): string {
		$total_pages = max( 1, (int) ( $payload['total_pages'] ?? 1 ) );
		$page_size   = max( 1, (int) ( $payload['page_size'] ?? 24 ) );

		if ( $total_pages <= 1 ) {
			return '';
		}

		$html = '<nav class="tcg-public-inventory__pagination" aria-label="' . $this->esc_attr( 'Inventory pages' ) . '">';

		if ( $page > 1 ) {
			$html .= '<a href="' . $this->esc_url( $this->page_url( $query, $game, $set_filter, $sort, $page - 1, $page_size ) ) . '">' . $this->esc_html( 'Previous' ) . '</a>';
		}

		$html .= '<span>' . $this->esc_html( 'Page ' . $page . ' of ' . $total_pages ) . '</span>';

		if ( true === (bool) ( $payload['has_next_page'] ?? false ) ) {
			$html .= '<a href="' . $this->esc_url( $this->page_url( $query, $game, $set_filter, $sort, $page + 1, $page_size ) ) . '">' . $this->esc_html( 'Next page' ) . '</a>';
		}

		$html .= '</nav>';

		return $html;
	}

	/**
	 * @param array<string, mixed> $group Inventory group.
	 */
	private function render_group( array $group ): string {
		$details = array_filter(
			array(
				(string) ( $group['set_name'] ?? '' ),
				(string) ( $group['printed_number'] ?? '' ),
				(string) ( $group['condition'] ?? '' ),
				(string) ( $group['variant'] ?? '' ),
			)
		);
		$price   = $this->display_money( $group['price'] ?? '0.00', $group['currency'] ?? 'USD' );
		$html    = '<article class="tcg-public-inventory__card">';
		$html   .= '<div class="tcg-public-inventory__media">';

		if ( '' !== (string) ( $group['image_url'] ?? '' ) ) {
			$html .= '<img src="' . $this->esc_url( (string) $group['image_url'] ) . '" alt="" loading="lazy" />';
		} else {
			$html .= '<div class="tcg-public-inventory__image-placeholder"></div>';
		}

		$html .= '</div>';
		$html .= '<div class="tcg-public-inventory__card-body">';
		$html .= '<p class="tcg-public-inventory__game">' . $this->esc_html( (string) ( $group['game'] ?? '' ) ) . '</p>';
		$html .= '<h3>' . $this->esc_html( (string) ( $group['name'] ?? '' ) ) . '</h3>';
		$html .= '<p>' . $this->esc_html( implode( ' / ', $details ) ) . '</p>';
		$html .= $this->render_attribute_chips( $group );
		$html .= '<div class="tcg-public-inventory__card-meta">';
		$html .= '<strong>' . $this->esc_html( $price ) . '</strong>';
		$html .= '<span>' . $this->esc_html( (int) ( $group['quantity'] ?? 0 ) . ' in stock' ) . '</span>';
		$html .= '</div>';

		if ( '' !== (string) ( $group['product_url'] ?? '' ) ) {
			$html .= '<a class="tcg-public-inventory__button" href="' . $this->esc_url( (string) $group['product_url'] ) . '">' . $this->esc_html( 'View card' ) . '</a>';
		}

		$html .= '</div></article>';

		return $html;
	}

	/**
	 * @param array<string, mixed> $group Inventory group.
	 */
	private function render_attribute_chips( array $group ): string {
		$chips = array_filter(
			array(
				$this->clean_string( $group['condition'] ?? '' ),
				$this->clean_string( $group['variant'] ?? '' ),
				$this->clean_string( $group['set_code'] ?? '' ),
				$this->clean_string( $group['printed_number'] ?? '' ),
			)
		);

		if ( array() === $chips ) {
			return '';
		}

		$html = '<ul class="tcg-public-inventory__chips" aria-label="' . $this->esc_attr( 'Card details' ) . '">';

		foreach ( array_slice( $chips, 0, 4 ) as $chip ) {
			$html .= '<li>' . $this->esc_html( $chip ) . '</li>';
		}

		$html .= '</ul>';

		return $html;
	}

	/**
	 * @param array<string, mixed> $brand Brand payload.
	 */
	private function brand_mark_html( array $brand ): string {
		$logo = $this->clean_url( $brand['logo_url'] ?? '' );

		if ( '' === $logo ) {
			return '<div class="tcg-public-inventory__mark">PUG</div>';
		}

		return '<img class="tcg-public-inventory__logo" src="' . $this->esc_url( $logo ) . '" alt="" loading="lazy" />';
	}

	/**
	 * @param array<string, mixed> $context Runtime context.
	 */
	private function product_url( mixed $product_id, array $context ): string {
		if ( is_callable( $context['product_url_callback'] ?? null ) ) {
			return $this->clean_url( (string) $context['product_url_callback']( $product_id ) );
		}

		if ( function_exists( 'get_permalink' ) && (int) $product_id > 0 ) {
			return $this->clean_url( (string) get_permalink( (int) $product_id ) );
		}

		return '';
	}

	/**
	 * @param array<string, mixed> $payload Presented payload.
	 */
	private function result_range_label( array $payload ): string {
		$total         = max( 0, (int) ( $payload['total'] ?? 0 ) );
		$page          = max( 1, (int) ( $payload['page'] ?? 1 ) );
		$page_size     = max( 1, (int) ( $payload['page_size'] ?? 24 ) );
		$visible_count = max( 0, (int) ( $payload['visible_count'] ?? 0 ) );

		if ( 0 === $total || 0 === $visible_count ) {
			return $this->count_label( $total, 'matching item' );
		}

		$from = ( ( $page - 1 ) * $page_size ) + 1;
		$to   = min( $total, ( $from + $visible_count ) - 1 );

		return 'Showing ' . $from . '-' . $to . ' of ' . $this->count_label( $total, 'matching item' );
	}

	private function page_url( string $query, string $game, string $set_filter, string $sort, int $page, int $page_size ): string {
		$params = array(
			'tcg_inventory_q'         => $query,
			'tcg_inventory_game'      => $game,
			'tcg_inventory_set'       => $set_filter,
			'tcg_inventory_sort'      => $sort,
			'tcg_inventory_page'      => max( 1, $page ),
			'tcg_inventory_page_size' => max( 1, $page_size ),
			'tcg_inventory_cache_bust' => time(),
		);

		$params = array_filter(
			$params,
			static fn ( mixed $value ): bool => '' !== (string) $value
		);

		return '?' . http_build_query( $params, '', '&', PHP_QUERY_RFC3986 );
	}

	private function count_label( int $count, string $singular ): string {
		return $count . ' ' . $singular . ( 1 === $count ? '' : 's' );
	}

	private function display_money( mixed $value, mixed $currency ): string {
		return $this->money( $value ) . ' ' . strtoupper( $this->clean_string( $currency ) ?: 'USD' );
	}

	private function money( mixed $value ): string {
		return number_format( (float) $value, 2, '.', '' );
	}

	private function clean_string( mixed $value ): string {
		return trim(
			function_exists( 'wp_strip_all_tags' )
				? wp_strip_all_tags( (string) $value )
				: strip_tags( (string) $value )
		);
	}

	private function clean_url( mixed $value ): string {
		$value = trim( (string) $value );

		return 1 === preg_match( '#^https?://#i', $value ) ? $value : '';
	}

	private function esc_html( mixed $value ): string {
		return function_exists( 'esc_html' )
			? esc_html( (string) $value )
			: htmlspecialchars( (string) $value, ENT_QUOTES, 'UTF-8' );
	}

	private function esc_attr( mixed $value ): string {
		return function_exists( 'esc_attr' )
			? esc_attr( (string) $value )
			: htmlspecialchars( (string) $value, ENT_QUOTES, 'UTF-8' );
	}

	private function esc_url( mixed $value ): string {
		return function_exists( 'esc_url' )
			? esc_url( (string) $value )
			: htmlspecialchars( (string) $value, ENT_QUOTES, 'UTF-8' );
	}
}
