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

		$attributes = is_array( $attributes ) ? $attributes : array();
		$filters    = EventFilters::from_array( $attributes );
		$limit      = isset( $attributes['limit'] ) ? (int) $attributes['limit'] : 12;
		$events     = $this->repository()->list_public( $filters, min( 50, max( 1, $limit ) ) );
		$notice     = $this->handle_registration_submission();

		if ( array() === $events ) {
			return '<div class="tcg-events tcg-events-empty">' . esc_html__( 'No upcoming events are currently posted.', 'tcg-store-platform' ) . '</div>';
		}

		$html = '<div class="tcg-events" data-tcg-events="list">';

		foreach ( $events as $row ) {
			$event = EventPresenter::present( $row, new DateTimeImmutable( 'now' ) );
			$html .= $this->render_card(
				$event,
				$notice && $notice['slug'] === $event['slug'] ? $notice : null
			);
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
	 * @param array<string, mixed>|null $notice Registration notice.
	 */
	private function render_card( array $event, ?array $notice = null ): string {
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

		$html .= $this->render_registration_form( $event, $notice );

		$html .= '</article>';

		return $html;
	}

	/**
	 * @param array<string, mixed> $event Public event.
	 * @param array<string, mixed>|null $notice Registration notice.
	 */
	private function render_detail( array $event, ?array $notice = null ): string {
		$html  = '<article class="tcg-event-detail">';
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
			Version::PLUGIN . '-events-empty-state'
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

		if ( function_exists( 'wp_nonce_field' ) ) {
			$html .= wp_nonce_field( 'tcg_event_register_' . $slug, 'tcg_event_register_nonce', true, false );
		}

		$html .= '<div class="tcg-event-registration__fields">';
		$html .= '<label><span>' . esc_html__( 'First name', 'tcg-store-platform' ) . '</span><input name="first_name" autocomplete="given-name" required /></label>';
		$html .= '<label><span>' . esc_html__( 'Last name', 'tcg-store-platform' ) . '</span><input name="last_name" autocomplete="family-name" required /></label>';
		$html .= '<label><span>' . esc_html__( 'Email', 'tcg-store-platform' ) . '</span><input type="email" name="email" autocomplete="email" required /></label>';
		$html .= '<label><span>' . esc_html__( 'Phone', 'tcg-store-platform' ) . '</span><input name="phone" autocomplete="tel" /></label>';
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
