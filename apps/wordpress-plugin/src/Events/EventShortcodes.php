<?php
/**
 * Public event shortcodes.
 *
 * @package TCGStorePlatform
 */

namespace TCGStorePlatform\Events;

use DateTimeImmutable;
use TCGStorePlatform\Settings\BrandingSettings;
use TCGStorePlatform\Settings\Settings;
use TCGStorePlatform\Version;

final class EventShortcodes {
	public const STYLE_HANDLE = 'tcg-store-public-events';

	public function register(): void {
		add_shortcode( 'tcg_events', array( $this, 'render_events' ) );
		add_shortcode( 'tcg_event_detail', array( $this, 'render_event_detail' ) );
		add_action( 'wp_enqueue_scripts', array( $this, 'enqueue_assets' ) );
	}

	/**
	 * @return list<array{type:string,hook:string,callback:string}>
	 */
	public static function hook_contracts(): array {
		return array(
			array(
				'type'     => 'shortcode',
				'hook'     => 'tcg_events',
				'callback' => 'render_events',
			),
			array(
				'type'     => 'shortcode',
				'hook'     => 'tcg_event_detail',
				'callback' => 'render_event_detail',
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
	public function render_events( array|string $attributes = array() ): string {
		$this->enqueue_assets();

		$detail_slug = $this->query_event_slug();
		if ( '' !== $detail_slug ) {
			return $this->render_event_detail( array( 'slug' => $detail_slug ) );
		}

		$attributes = is_array( $attributes ) ? $attributes : array();
		$filters    = EventFilters::from_array( $attributes );
		$limit      = isset( $attributes['limit'] ) ? (int) $attributes['limit'] : 12;
		$events     = $this->repository()->list_public( $filters, min( 50, max( 1, $limit ) ) );

		if ( array() === $events ) {
			return '<div class="tcg-events tcg-events-empty">' . esc_html__( 'No upcoming events are currently posted.', 'tcg-store-platform' ) . '</div>';
		}

		$html = '<div class="tcg-events" data-tcg-events="list">';

		foreach ( $events as $row ) {
			$event = EventPresenter::present( $row, new DateTimeImmutable( 'now' ) );
			$html .= $this->render_card( $event );
		}

		$html .= '</div>';

		return $html;
	}

	/**
	 * @param array<string, mixed>|string $attributes Shortcode attributes.
	 */
	public function render_event_detail( array|string $attributes = array() ): string {
		$this->enqueue_assets();

		$attributes = is_array( $attributes ) ? $attributes : array();
		$slug       = EventFilters::from_array( array( 'event_type' => $attributes['slug'] ?? '' ) )->get_string( 'event_type' ) ?? '';

		if ( '' === $slug ) {
			return '';
		}

		$row = $this->repository()->get_public_by_slug( $slug );

		if ( null === $row ) {
			return '<div class="tcg-event-detail tcg-event-detail-empty">' . esc_html__( 'Event not found.', 'tcg-store-platform' ) . '</div>';
		}

		$event  = EventPresenter::present( $row, new DateTimeImmutable( 'now' ) );
		$notice = $this->handle_registration_submission();

		return $this->render_detail( $event, $notice && $notice['slug'] === $event['slug'] ? $notice : null );
	}

	/**
	 * @param array<string, mixed> $event Public event.
	 */
	private function render_card( array $event ): string {
		$title = (string) ( $event['title'] ?? __( 'Event', 'tcg-store-platform' ) );
		$label = sprintf(
			/* translators: %s: event title */
			__( 'View event details and registration for %s', 'tcg-store-platform' ),
			$title
		);

		$html  = '<article class="tcg-event-card tcg-event-card--' . esc_attr( $this->game_slug( $event ) ) . '">';
		$html .= '<a class="tcg-event-card__link" href="' . esc_url( $this->event_detail_url( $event ) ) . '" aria-label="' . esc_attr( $label ) . '">';

		$html .= $this->render_event_header( $event, 'card' );
		$html .= $this->render_event_stats( $event );
		$html .= $this->render_badges( $event['badges'] );
		$html .= '<span class="tcg-event-card__cta">' . esc_html__( 'View & Register', 'tcg-store-platform' ) . '</span>';
		$html .= '</a>';
		$html .= '</article>';

		return $html;
	}

	/**
	 * @param array<string, mixed> $event Public event.
	 * @param array<string, mixed>|null $notice Registration notice.
	 */
	private function render_detail( array $event, ?array $notice = null ): string {
		$html  = '<article class="tcg-event-detail">';
		$html .= '<a class="tcg-event-detail__back" href="' . esc_url( $this->events_list_url() ) . '">' . esc_html__( 'All events', 'tcg-store-platform' ) . '</a>';
		$html .= $this->render_event_header( $event, 'detail' );
		$html .= $this->render_event_stats( $event );
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

		$html .= $this->render_registration_form( $event, $notice );

		$html .= '</article>';

		return $html;
	}

	public function enqueue_assets(): void {
		if ( ! function_exists( 'wp_enqueue_style' ) ) {
			return;
		}

		wp_enqueue_style(
			self::STYLE_HANDLE,
			$this->asset_url( 'assets/css/public-events.css' ),
			array(),
			Version::PLUGIN . '-events-empty-state-grid-contained-counts'
		);

		if ( function_exists( 'wp_add_inline_style' ) ) {
			wp_add_inline_style(
				self::STYLE_HANDLE,
				'.tcg-events, .tcg-event-detail {' . BrandingSettings::css_variable_string( Settings::all() ) . '}'
			);
		}
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

	/**
	 * @param array<string, mixed> $event Public event.
	 */
	private function render_event_header( array $event, string $context ): string {
		$date_label = $this->date_label( $event );
		$time_label = $this->time_label( $event );
		$tag        = 'detail' === $context ? 'h2' : 'h3';

		$html  = '<div class="tcg-event-hero tcg-event-hero--' . esc_attr( $this->game_slug( $event ) ) . '">';
		$html .= '<div class="tcg-event-hero__game">';
		$html .= '<span class="tcg-event-game-mark tcg-event-game-mark--' . esc_attr( $this->game_slug( $event ) ) . '" aria-hidden="true">' . esc_html( $this->game_mark( $event ) ) . '</span>';
		$html .= '<span>' . esc_html( $this->game_label( $event ) ) . '</span>';
		$html .= '</div>';

		if ( '' !== $event['header_image'] ) {
			$html .= '<img class="tcg-event-card__image" src="' . esc_url( $event['header_image'] ) . '" alt="" loading="lazy" />';
		}

		$html .= '<' . $tag . '>' . esc_html( $event['title'] ) . '</' . $tag . '>';
		$html .= '<p class="tcg-event-hero__meta">' . esc_html( implode( ' / ', array_filter( array( $date_label, $time_label, $this->format_label( $event ) ) ) ) ) . '</p>';
		$html .= '</div>';

		return $html;
	}

	/**
	 * @param array<string, mixed> $event Public event.
	 */
	private function render_event_stats( array $event ): string {
		$stats = array(
			array(
				'label' => __( 'Date', 'tcg-store-platform' ),
				'value' => $this->date_label( $event ),
			),
			array(
				'label' => __( 'Time', 'tcg-store-platform' ),
				'value' => $this->time_label( $event ),
			),
			array(
				'label' => __( 'Cost', 'tcg-store-platform' ),
				'value' => $this->money_label( $event ),
			),
			array(
				'label' => __( 'Seats', 'tcg-store-platform' ),
				'value' => $this->capacity_line( $event ),
			),
		);

		$html = '<div class="tcg-event-stats">';

		foreach ( $stats as $stat ) {
			$html .= '<div class="tcg-event-stat">';
			$html .= '<span>' . esc_html( $stat['label'] ) . '</span>';
			$html .= '<strong>' . esc_html( $stat['value'] ) . '</strong>';
			$html .= '</div>';
		}

		$html .= '</div>';

		return $html;
	}

	/**
	 * @param array<string, mixed> $event Public event.
	 */
	private function event_datetime( array $event ): ?DateTimeImmutable {
		$value = $event['start_datetime'] ?? null;

		if ( ! is_string( $value ) || '' === trim( $value ) ) {
			return null;
		}

		try {
			return new DateTimeImmutable( $value );
		} catch ( \Exception ) {
			return null;
		}
	}

	/**
	 * @param array<string, mixed> $event Public event.
	 */
	private function date_label( array $event ): string {
		$datetime = $this->event_datetime( $event );

		if ( null === $datetime ) {
			return __( 'Date pending', 'tcg-store-platform' );
		}

		if ( function_exists( 'wp_date' ) ) {
			return wp_date( 'M j, Y', $datetime->getTimestamp(), $datetime->getTimezone() );
		}

		return $datetime->format( 'M j, Y' );
	}

	/**
	 * @param array<string, mixed> $event Public event.
	 */
	private function time_label( array $event ): string {
		$datetime = $this->event_datetime( $event );

		if ( null === $datetime ) {
			return __( 'Time pending', 'tcg-store-platform' );
		}

		if ( function_exists( 'wp_date' ) ) {
			return wp_date( 'g:i A', $datetime->getTimestamp(), $datetime->getTimezone() );
		}

		return $datetime->format( 'g:i A' );
	}

	/**
	 * @param array<string, mixed> $event Public event.
	 */
	private function money_label( array $event ): string {
		if ( ! empty( $event['is_free'] ) ) {
			return __( 'Free', 'tcg-store-platform' );
		}

		return '$' . number_format( (float) ( $event['entry_fee'] ?? 0 ), 2 );
	}

	/**
	 * @param array<string, mixed> $event Public event.
	 */
	private function format_label( array $event ): string {
		$format = trim( (string) ( $event['format'] ?? '' ) );

		if ( '' !== $format ) {
			return $format;
		}

		$type = trim( (string) ( $event['event_type'] ?? '' ) );

		return '' !== $type ? ucwords( str_replace( array( '-', '_' ), ' ', $type ) ) : __( 'Store event', 'tcg-store-platform' );
	}

	/**
	 * @param array<string, mixed> $event Public event.
	 */
	private function game_label( array $event ): string {
		$game       = strtolower( trim( (string) ( $event['game'] ?? '' ) ) );
		$normalized = preg_replace( '/[^a-z0-9]+/', '', $game ) ?? '';

		return match ( $normalized ) {
			'mtg', 'magic', 'magicthegathering' => 'Magic: The Gathering',
			'pokemon' => 'Pokemon',
			'lorcana' => 'Lorcana',
			'onepiece' => 'One Piece',
			'riftbound' => 'Riftbound',
			default => '' !== $game ? ucwords( str_replace( array( '-', '_' ), ' ', $game ) ) : __( 'Trading Card Event', 'tcg-store-platform' ),
		};
	}

	/**
	 * @param array<string, mixed> $event Public event.
	 */
	private function game_mark( array $event ): string {
		$game       = strtolower( trim( (string) ( $event['game'] ?? '' ) ) );
		$normalized = preg_replace( '/[^a-z0-9]+/', '', $game ) ?? '';

		return match ( $normalized ) {
			'mtg', 'magic', 'magicthegathering' => 'MTG',
			'pokemon' => 'PKMN',
			'lorcana' => 'LOR',
			'onepiece' => 'OP',
			'riftbound' => 'RIFT',
			default => $this->game_initials( $this->game_label( $event ) ),
		};
	}

	private function game_initials( string $label ): string {
		$split_words = preg_split( '/[^A-Za-z0-9]+/', trim( $label ) );
		$words       = false !== $split_words ? $split_words : array();
		$mark        = '';

		foreach ( $words as $word ) {
			if ( '' === $word ) {
				continue;
			}

			$mark .= strtoupper( substr( $word, 0, 1 ) );

			if ( 4 <= strlen( $mark ) ) {
				break;
			}
		}

		return '' !== $mark ? $mark : 'TCG';
	}

	/**
	 * @param array<string, mixed> $event Public event.
	 */
	private function game_slug( array $event ): string {
		$slug       = strtolower( trim( (string) ( $event['game'] ?? '' ) ) );
		$normalized = preg_replace( '/[^a-z0-9]+/', '', $slug ) ?? '';

		if ( in_array( $normalized, array( 'mtg', 'magic', 'magicthegathering' ), true ) ) {
			return 'magic-the-gathering';
		}

		$slug = preg_replace( '/[^a-z0-9]+/', '-', $slug ) ?? '';

		$slug = trim( $slug, '-' );

		return '' !== $slug ? $slug : 'store-event';
	}

	/**
	 * @param array<string, mixed> $event Public event.
	 * @param array<string, mixed>|null $notice Registration notice.
	 */
	private function render_registration_form( array $event, ?array $notice ): string {
		if ( ! in_array( (string) ( $event['registration_status'] ?? '' ), array( 'open', 'waitlist', 'almost_full' ), true ) ) {
			return '<p class="tcg-event-registration tcg-event-registration--closed">' . esc_html__( 'Registration is not currently open.', 'tcg-store-platform' ) . '</p>';
		}

		$slug = (string) ( $event['slug'] ?? '' );
		if ( '' === $slug ) {
			return '';
		}

		$html = '<form id="tcg-event-register-' . esc_attr( $slug ) . '" class="tcg-event-registration" method="post">';

		if ( null !== $notice ) {
			$html .= '<p class="tcg-event-registration__notice tcg-event-registration__notice--' . esc_attr( (string) $notice['status'] ) . '">';
			$html .= esc_html( (string) $notice['message'] );
			$html .= '</p>';
		}

		$html .= '<input type="hidden" name="tcg_event_register_slug" value="' . esc_attr( $slug ) . '" />';
		$html .= '<input type="hidden" name="tcg_event_idempotency_key" value="' . esc_attr( $this->idempotency_key( $slug ) ) . '" />';
		$html .= '<input type="hidden" name="payment_preference" value="' . esc_attr( ! empty( $event['is_free'] ) ? 'not_required' : 'pay_at_store' ) . '" />';

		if ( function_exists( 'wp_nonce_field' ) ) {
			$html .= wp_nonce_field( 'tcg_event_register_' . $slug, 'tcg_event_register_nonce', true, false );
		}

		$html .= '<div class="tcg-event-registration__fields">';
		$html .= '<label><span>' . esc_html__( 'First name', 'tcg-store-platform' ) . '</span><input name="first_name" autocomplete="given-name" required /></label>';
		$html .= '<label><span>' . esc_html__( 'Last name', 'tcg-store-platform' ) . '</span><input name="last_name" autocomplete="family-name" required /></label>';
		$html .= '<label><span>' . esc_html__( 'Email', 'tcg-store-platform' ) . '</span><input type="email" name="email" autocomplete="email" required /></label>';
		$html .= '<label><span>' . esc_html__( 'Phone', 'tcg-store-platform' ) . '</span><input name="phone" autocomplete="tel" /></label>';
		$html .= '</div>';
		$html .= '<div class="tcg-event-registration__payment">';
		$html .= '<span>' . esc_html__( 'Payment', 'tcg-store-platform' ) . '</span>';
		$html .= '<strong>' . esc_html( ! empty( $event['is_free'] ) ? __( 'No payment needed', 'tcg-store-platform' ) : __( 'Pay at store', 'tcg-store-platform' ) ) . '</strong>';
		$html .= '<small>' . esc_html( ! empty( $event['is_free'] ) ? __( 'Your seat will be held when registration is accepted.', 'tcg-store-platform' ) : __( 'We will collect the event cost at the counter when you arrive.', 'tcg-store-platform' ) ) . '</small>';
		$html .= '</div>';
		$html .= '<button type="submit">' . esc_html__( 'Register for Event', 'tcg-store-platform' ) . '</button>';
		$html .= '</form>';

		return $html;
	}

	/**
	 * @return array<string, mixed>|null
	 */
	private function handle_registration_submission(): ?array {
		if ( 'POST' !== strtoupper( (string) ( $_SERVER['REQUEST_METHOD'] ?? 'GET' ) ) ) {
			return null;
		}

		$slug = $this->clean_slug( $this->request_value( 'tcg_event_register_slug' ) );
		if ( '' === $slug ) {
			return null;
		}

		if (
			function_exists( 'wp_verify_nonce' )
			&& ! wp_verify_nonce( $this->request_value( 'tcg_event_register_nonce' ), 'tcg_event_register_' . $slug )
		) {
			return array(
				'slug'    => $slug,
				'status'  => 'error',
				'message' => __( 'Registration could not be verified. Please refresh and try again.', 'tcg-store-platform' ),
			);
		}

		$input  = EventRegistrationInput::from_array(
			array(
				'first_name'      => $this->request_value( 'first_name' ),
				'last_name'       => $this->request_value( 'last_name' ),
				'email'           => $this->request_value( 'email' ),
				'phone'           => $this->request_value( 'phone' ),
				'idempotency_key' => $this->request_value( 'tcg_event_idempotency_key' ),
			)
		);
		$result = $this->registration_service()->register_by_slug( $slug, $input );
		$body   = $result->to_response();

		return array(
			'slug'    => $slug,
			'status'  => $result->is_success() ? 'success' : 'error',
			'message' => (string) ( $body['message'] ?? __( 'Registration could not be completed.', 'tcg-store-platform' ) ),
		);
	}

	private function idempotency_key( string $slug ): string {
		return 'web-' . $slug . '-' . bin2hex( random_bytes( 8 ) );
	}

	private function request_value( string $key ): string {
		$value = $_POST[ $key ] ?? ''; // phpcs:ignore WordPress.Security.NonceVerification.Missing
		$value = function_exists( 'wp_unslash' ) ? wp_unslash( $value ) : $value;

		return is_scalar( $value ) ? $this->clean_text( (string) $value ) : '';
	}

	private function clean_text( string $value ): string {
		return function_exists( 'sanitize_text_field' )
			? sanitize_text_field( $value )
			: trim( strip_tags( $value ) );
	}

	private function clean_slug( string $slug ): string {
		$slug = strtolower( trim( $slug ) );
		$slug = preg_replace( '/[^a-z0-9_-]+/', '-', $slug ) ?? '';

		return trim( substr( $slug, 0, 191 ), '-' );
	}

	private function query_event_slug(): string {
		$value = $_GET['tcg_event'] ?? ''; // phpcs:ignore WordPress.Security.NonceVerification.Recommended
		$value = function_exists( 'wp_unslash' ) ? wp_unslash( $value ) : $value;

		return is_scalar( $value ) ? $this->clean_slug( (string) $value ) : '';
	}

	/**
	 * @param array<string, mixed> $event Public event.
	 */
	private function event_detail_url( array $event ): string {
		$slug = $this->clean_slug( (string) ( $event['slug'] ?? '' ) );

		if ( function_exists( 'add_query_arg' ) ) {
			return add_query_arg( 'tcg_event', rawurlencode( $slug ) );
		}

		return '?tcg_event=' . rawurlencode( $slug );
	}

	private function events_list_url(): string {
		if ( function_exists( 'remove_query_arg' ) ) {
			return remove_query_arg( 'tcg_event' );
		}

		$request_uri = (string) ( $_SERVER['REQUEST_URI'] ?? '' );
		$path        = strtok( $request_uri, '?' );

		return false !== $path && '' !== $path ? $path : '?';
	}

	private function repository(): EventRepository {
		global $wpdb;

		return new EventRepository( $wpdb );
	}

	private function registration_service(): EventRegistrationService {
		global $wpdb;

		return new EventRegistrationService( new EventRegistrationRepository( $wpdb ) );
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
