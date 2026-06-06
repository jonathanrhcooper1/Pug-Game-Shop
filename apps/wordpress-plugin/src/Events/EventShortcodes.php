<?php
/**
 * Public event shortcodes.
 *
 * @package TCGStorePlatform
 */

namespace TCGStorePlatform\Events;

use DateTimeImmutable;

final class EventShortcodes {
	public function register(): void {
		add_shortcode( 'tcg_events', array( $this, 'render_events' ) );
		add_shortcode( 'tcg_event_detail', array( $this, 'render_event_detail' ) );
	}

	/**
	 * @param array<string, mixed>|string $attributes Shortcode attributes.
	 */
	public function render_events( array|string $attributes = array() ): string {
		$attributes = is_array( $attributes ) ? $attributes : array();
		$filters    = EventFilters::from_array( $attributes );
		$limit      = isset( $attributes['limit'] ) ? (int) $attributes['limit'] : 12;
		$events     = $this->repository()->list_public( $filters, min( 50, max( 1, $limit ) ) );

		if ( array() === $events ) {
			return '<div class="tcg-events tcg-events-empty">' . esc_html__( 'No upcoming events are currently posted.', 'tcg-store-platform' ) . '</div>';
		}

		$html = '<div class="tcg-events" data-tcg-events="list">';

		foreach ( $events as $row ) {
			$html .= $this->render_card( EventPresenter::present( $row, new DateTimeImmutable( 'now' ) ) );
		}

		$html .= '</div>';

		return $html;
	}

	/**
	 * @param array<string, mixed>|string $attributes Shortcode attributes.
	 */
	public function render_event_detail( array|string $attributes = array() ): string {
		$attributes = is_array( $attributes ) ? $attributes : array();
		$slug       = EventFilters::from_array( array( 'event_type' => $attributes['slug'] ?? '' ) )->get_string( 'event_type' ) ?? '';

		if ( '' === $slug ) {
			return '';
		}

		$row = $this->repository()->get_public_by_slug( $slug );

		if ( null === $row ) {
			return '<div class="tcg-event-detail tcg-event-detail-empty">' . esc_html__( 'Event not found.', 'tcg-store-platform' ) . '</div>';
		}

		return $this->render_detail( EventPresenter::present( $row, new DateTimeImmutable( 'now' ) ) );
	}

	/**
	 * @param array<string, mixed> $event Public event.
	 */
	private function render_card( array $event ): string {
		$html = '<article class="tcg-event-card">';

		if ( '' !== $event['header_image'] ) {
			$html .= '<img class="tcg-event-card__image" src="' . esc_url( $event['header_image'] ) . '" alt="" loading="lazy" />';
		}

		$html .= '<h3>' . esc_html( $event['title'] ) . '</h3>';
		$html .= '<p>' . esc_html( $this->summary_line( $event ) ) . '</p>';
		$html .= '<p>' . esc_html( $this->capacity_line( $event ) ) . '</p>';
		$html .= $this->render_badges( $event['badges'] );

		if ( '' !== $event['register_url'] ) {
			$html .= '<a class="button" href="' . esc_url( $event['register_url'] ) . '" rel="noopener noreferrer">' . esc_html__( 'Register', 'tcg-store-platform' ) . '</a>';
		}

		if ( ! empty( $event['topdeck']['attribution'] ) && '' !== $event['topdeck']['event_url'] ) {
			$html .= '<p class="tcg-event-card__attribution"><a href="' . esc_url( $event['topdeck']['event_url'] ) . '" rel="noopener noreferrer">' . esc_html__( 'Powered by TopDeck', 'tcg-store-platform' ) . '</a></p>';
		}

		$html .= '</article>';

		return $html;
	}

	/**
	 * @param array<string, mixed> $event Public event.
	 */
	private function render_detail( array $event ): string {
		$html = '<article class="tcg-event-detail">';
		$html .= '<h2>' . esc_html( $event['title'] ) . '</h2>';
		$html .= '<p>' . esc_html( $this->summary_line( $event ) ) . '</p>';
		$html .= '<p>' . esc_html( $this->capacity_line( $event ) ) . '</p>';
		$html .= $this->render_badges( $event['badges'] );

		if ( '' !== $event['description'] ) {
			$html .= '<div class="tcg-event-detail__description">' . wp_kses_post( wpautop( $event['description'] ) ) . '</div>';
		}

		if ( '' !== $event['what_to_bring'] ) {
			$html .= '<h3>' . esc_html__( 'What to bring', 'tcg-store-platform' ) . '</h3>';
			$html .= '<div class="tcg-event-detail__bring">' . wp_kses_post( wpautop( $event['what_to_bring'] ) ) . '</div>';
		}

		if ( '' !== $event['register_url'] ) {
			$html .= '<a class="button" href="' . esc_url( $event['register_url'] ) . '" rel="noopener noreferrer">' . esc_html__( 'Register', 'tcg-store-platform' ) . '</a>';
		}

		$html .= '</article>';

		return $html;
	}

	/**
	 * @param array<string, mixed> $event Public event.
	 */
	private function summary_line( array $event ): string {
		return trim(
			(string) $event['game'] . ' / '
			. (string) $event['format'] . ' / '
			. (string) $event['start_datetime'] . ' / '
			. ( $event['is_free'] ? __( 'Free', 'tcg-store-platform' ) : (string) $event['entry_fee'] . ' ' . (string) $event['currency'] )
		);
	}

	/**
	 * @param array<string, mixed> $event Public event.
	 */
	private function capacity_line( array $event ): string {
		if ( null === $event['player_cap'] ) {
			return __( 'No player cap posted.', 'tcg-store-platform' );
		}

		return sprintf(
			/* translators: 1: seats remaining, 2: player cap */
			__( '%1$d of %2$d seats remaining.', 'tcg-store-platform' ),
			(int) $event['seats_remaining'],
			(int) $event['player_cap']
		);
	}

	/**
	 * @param list<string> $badges Event badges.
	 */
	private function render_badges( array $badges ): string {
		$html = '<ul class="tcg-event-badges">';

		foreach ( $badges as $badge ) {
			$html .= '<li>' . esc_html( ucwords( str_replace( '_', ' ', $badge ) ) ) . '</li>';
		}

		$html .= '</ul>';

		return $html;
	}

	private function repository(): EventRepository {
		global $wpdb;

		return new EventRepository( $wpdb );
	}
}
