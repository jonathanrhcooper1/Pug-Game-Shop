<?php
/**
 * Staging-only safety controls.
 *
 * @package TCGStorePlatform
 */

namespace TCGStorePlatform\Staging;

use TCGStorePlatform\Settings\BrandingSettings;
use TCGStorePlatform\Settings\Settings;

final class StagingSafety {
	private const MODE_CONSTANT           = 'TCG_STORE_PLATFORM_STAGING_MODE';
	private const BANNER_CONSTANT         = 'TCG_STORE_PLATFORM_STAGING_BANNER';
	private const ALLOW_EMAILS_CONSTANT   = 'TCG_STORE_PLATFORM_STAGING_ALLOW_EMAILS';
	private const ALLOW_INDEXING_CONSTANT = 'TCG_STORE_PLATFORM_STAGING_ALLOW_INDEXING';

	/** @var callable(): string|null */
	private $environment_provider;

	/** @var callable(string): bool|null */
	private $capability_checker;

	/** @var callable(string): mixed|null */
	private $constant_reader;

	/**
	 * @param callable(): string|null $environment_provider Optional environment provider.
	 * @param callable(string): bool|null $capability_checker Optional capability checker.
	 * @param callable(string): mixed|null $constant_reader Optional constant reader.
	 */
	public function __construct(
		?callable $environment_provider = null,
		?callable $capability_checker = null,
		?callable $constant_reader = null
	) {
		$this->environment_provider = $environment_provider;
		$this->capability_checker   = $capability_checker;
		$this->constant_reader      = $constant_reader;
	}

	public function register(): void {
		if ( function_exists( 'add_action' ) ) {
			add_action( 'wp_head', array( $this, 'render_noindex_meta' ), 1 );
			add_action( 'admin_head', array( $this, 'render_noindex_meta' ), 1 );
			add_action( 'wp_footer', array( $this, 'render_staging_banner' ), 999 );
			add_action( 'admin_footer', array( $this, 'render_staging_banner' ), 999 );
			add_action( 'admin_notices', array( $this, 'render_admin_notice' ) );
			add_action( 'send_headers', array( $this, 'send_noindex_header' ) );
		}

		if ( function_exists( 'add_filter' ) ) {
			add_filter( 'wp_headers', array( $this, 'filter_noindex_headers' ) );
			add_filter( 'robots_txt', array( $this, 'filter_robots_txt' ), 10, 2 );
			add_filter( 'pre_wp_mail', array( $this, 'filter_staging_email' ), 10, 2 );
		}
	}

	public function is_active(): bool {
		return 'staging' === $this->environment()
			|| $this->constant_enabled( self::MODE_CONSTANT )
			|| $this->constant_enabled( self::BANNER_CONSTANT );
	}

	public function blocks_public_indexing(): bool {
		return $this->is_active() && ! $this->constant_enabled( self::ALLOW_INDEXING_CONSTANT );
	}

	public function blocks_real_emails(): bool {
		return $this->is_active() && ! $this->constant_enabled( self::ALLOW_EMAILS_CONSTANT );
	}

	/**
	 * @return array<string, mixed>
	 */
	public function health_summary(): array {
		return array(
			'status'                          => $this->is_active() ? 'staging' : 'inactive',
			'environment'                     => $this->environment(),
			'staging_mode_active'             => $this->is_active(),
			'public_indexing_blocked'         => $this->blocks_public_indexing(),
			'real_customer_emails_disabled'   => $this->blocks_real_emails(),
			'payment_capture_deferred'        => true,
			'provider_inventory_deferred'     => true,
			'staff_banner_visible'            => $this->should_show_banner(),
			'explicit_email_override'         => $this->constant_enabled( self::ALLOW_EMAILS_CONSTANT ),
			'explicit_indexing_override'      => $this->constant_enabled( self::ALLOW_INDEXING_CONSTANT ),
			'production_side_effects_blocked' => $this->is_active()
				&& $this->blocks_public_indexing()
				&& $this->blocks_real_emails(),
		);
	}

	/**
	 * @param array<string, string> $headers Existing headers.
	 * @return array<string, string>
	 */
	public function filter_noindex_headers( array $headers ): array {
		if ( $this->blocks_public_indexing() ) {
			$headers['X-Robots-Tag'] = 'noindex, nofollow, noarchive';
		}

		return $headers;
	}

	public function send_noindex_header(): void {
		if (
			! $this->blocks_public_indexing()
			|| headers_sent()
			|| ! function_exists( 'header' )
		) {
			return;
		}

		header( 'X-Robots-Tag: noindex, nofollow, noarchive' );
	}

	public function noindex_meta_tag(): string {
		if ( ! $this->blocks_public_indexing() ) {
			return '';
		}

		return '<meta name="robots" content="noindex,nofollow,noarchive" />';
	}

	public function render_noindex_meta(): void {
		$tag = $this->noindex_meta_tag();

		if ( '' !== $tag ) {
			echo $tag . "\n"; // phpcs:ignore WordPress.Security.EscapeOutput.OutputNotEscaped
		}
	}

	public function filter_robots_txt( string $output, bool $is_public ): string {
		unset( $is_public );

		if ( ! $this->blocks_public_indexing() ) {
			return $output;
		}

		return "User-agent: *\nDisallow: /\n";
	}

	/**
	 * @param mixed                $short_circuit Short-circuit return value.
	 * @param array<string, mixed> $atts Mail arguments.
	 */
	public function filter_staging_email( mixed $short_circuit, array $atts = array() ): mixed {
		unset( $atts );

		if ( $this->blocks_real_emails() ) {
			return true;
		}

		return $short_circuit;
	}

	/**
	 * @param array<string, mixed>|null $settings Full settings or branding settings.
	 */
	public function banner_html( ?array $settings = null ): string {
		if ( ! $this->should_show_banner() ) {
			return '';
		}

		$branding = BrandingSettings::from_settings( $settings ?? $this->settings() );
		$label    = sprintf(
			'%s STAGING',
			strtoupper( (string) $branding['company_short_name'] )
		);
		$color    = (string) $branding['staging_banner_color'];

		return sprintf(
			'<div class="tcg-store-staging-banner" role="status" aria-live="polite" style="position:fixed;z-index:99999;left:0;right:0;bottom:0;padding:8px 12px;background:%1$s;color:#111827;text-align:center;font-weight:700;letter-spacing:0;font-size:13px;box-shadow:0 -1px 8px rgba(0,0,0,.18);">%2$s</div>',
			$this->escape_attr( $color ),
			$this->escape_html( $label )
		);
	}

	public function render_staging_banner(): void {
		$html = $this->banner_html();

		if ( '' !== $html ) {
			echo $html; // phpcs:ignore WordPress.Security.EscapeOutput.OutputNotEscaped
		}
	}

	/**
	 * @param array<string, mixed>|null $settings Full settings or branding settings.
	 */
	public function admin_notice_html( ?array $settings = null ): string {
		if ( ! $this->should_show_banner() ) {
			return '';
		}

		$branding = BrandingSettings::from_settings( $settings ?? $this->settings() );
		$message  = sprintf(
			'%s staging safeguards are active: public indexing is blocked, customer emails are disabled, payment capture stays delegated/deferred, and provider inventory writes remain disabled unless an explicit sandbox override is enabled.',
			(string) $branding['company_name']
		);

		return '<div class="notice notice-warning"><p><strong>STAGING</strong> '
			. $this->escape_html( $message )
			. '</p></div>';
	}

	public function render_admin_notice(): void {
		$html = $this->admin_notice_html();

		if ( '' !== $html ) {
			echo $html; // phpcs:ignore WordPress.Security.EscapeOutput.OutputNotEscaped
		}
	}

	private function should_show_banner(): bool {
		if ( ! $this->is_active() ) {
			return false;
		}

		foreach ( array( 'manage_options', 'manage_settings', 'view_reports', 'view_inventory' ) as $capability ) {
			if ( $this->current_user_can( $capability ) ) {
				return true;
			}
		}

		return false;
	}

	private function environment(): string {
		if ( is_callable( $this->environment_provider ) ) {
			return $this->clean_environment( ( $this->environment_provider )() );
		}

		if ( function_exists( 'wp_get_environment_type' ) ) {
			return $this->clean_environment( wp_get_environment_type() );
		}

		return 'production';
	}

	private function clean_environment( mixed $environment ): string {
		$environment = strtolower( trim( (string) $environment ) );

		return in_array( $environment, array( 'local', 'development', 'staging', 'production' ), true )
			? $environment
			: 'production';
	}

	private function current_user_can( string $capability ): bool {
		if ( is_callable( $this->capability_checker ) ) {
			return true === ( $this->capability_checker )( $capability );
		}

		return function_exists( 'current_user_can' ) && current_user_can( $capability );
	}

	private function constant_enabled( string $name ): bool {
		$value = null;

		if ( is_callable( $this->constant_reader ) ) {
			$value = ( $this->constant_reader )( $name );
		} elseif ( defined( $name ) ) {
			$value = constant( $name );
		}

		return true === $value
			|| 1 === $value
			|| '1' === $value
			|| 'true' === strtolower( (string) $value );
	}

	/**
	 * @return array<string, mixed>
	 */
	private function settings(): array {
		return Settings::all();
	}

	private function escape_html( string $value ): string {
		return function_exists( 'esc_html' )
			? esc_html( $value )
			: htmlspecialchars( $value, ENT_QUOTES, 'UTF-8' );
	}

	private function escape_attr( string $value ): string {
		return function_exists( 'esc_attr' )
			? esc_attr( $value )
			: htmlspecialchars( $value, ENT_QUOTES, 'UTF-8' );
	}
}
