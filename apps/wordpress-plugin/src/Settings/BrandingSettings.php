<?php
/**
 * White-label company branding settings.
 *
 * @package TCGStorePlatform
 */

namespace TCGStorePlatform\Settings;

final class BrandingSettings {
	private const COLOR_KEYS = array(
		'primary_color'        => '#0F766E',
		'accent_color'         => '#F97316',
		'background_color'     => '#FFFFFF',
		'surface_color'        => '#F8FAFC',
		'text_color'           => '#111827',
		'success_color'        => '#15803D',
		'warning_color'        => '#B45309',
		'danger_color'         => '#B91C1C',
		'staging_banner_color' => '#FACC15',
	);

	/**
	 * @return array<string, mixed>
	 */
	public static function defaults(): array {
		return array_merge(
			array(
				'company_name'       => 'TCG Store Platform',
				'company_short_name' => 'TCG Store',
				'logo_url'           => '',
				'support_url'        => '',
				'receipt_footer'     => '',
			),
			self::COLOR_KEYS
		);
	}

	/**
	 * @param mixed                $value Submitted branding collection.
	 * @param array<string, mixed> $existing Existing branding collection.
	 * @return array<string, mixed>
	 */
	public static function sanitize( mixed $value, array $existing = array() ): array {
		$value    = is_array( $value ) ? $value : array();
		$existing = array_merge( self::defaults(), $existing );

		$branding = array(
			'company_name'       => self::clean_text(
				$value['company_name'] ?? $existing['company_name'],
				self::defaults()['company_name'],
				100
			),
			'company_short_name' => self::clean_text(
				$value['company_short_name'] ?? $existing['company_short_name'],
				self::defaults()['company_short_name'],
				40
			),
			'logo_url'           => self::clean_https_url(
				$value['logo_url'] ?? $existing['logo_url'],
				(string) $existing['logo_url'],
				true
			),
			'support_url'        => self::clean_https_url(
				$value['support_url'] ?? $existing['support_url'],
				(string) $existing['support_url'],
				true
			),
			'receipt_footer'     => self::clean_text(
				$value['receipt_footer'] ?? $existing['receipt_footer'],
				'',
				160
			),
		);

		foreach ( self::COLOR_KEYS as $key => $default ) {
			$branding[ $key ] = self::clean_hex_color(
				$value[ $key ] ?? $existing[ $key ],
				self::clean_hex_color( $existing[ $key ] ?? $default, $default )
			);
		}

		return $branding;
	}

	/**
	 * @param array<string, mixed> $settings Full plugin settings or branding settings.
	 * @return array<string, mixed>
	 */
	public static function from_settings( array $settings ): array {
		$branding = $settings['branding'] ?? $settings;

		return self::sanitize( $branding );
	}

	/**
	 * @param array<string, mixed> $settings Full plugin settings or branding settings.
	 * @return array<string, string>
	 */
	public static function css_variables( array $settings ): array {
		$branding  = self::from_settings( $settings );
		$variables = array();

		foreach ( array_keys( self::COLOR_KEYS ) as $key ) {
			$css_key = str_replace( '_color', '', $key );
			$css_key = str_replace( '_', '-', $css_key );

			$variables[ "--tcg-{$css_key}" ] = (string) $branding[ $key ];
		}

		return $variables;
	}

	/**
	 * @param array<string, mixed> $settings Full plugin settings or branding settings.
	 */
	public static function css_variable_string( array $settings ): string {
		$parts = array();

		foreach ( self::css_variables( $settings ) as $key => $value ) {
			$parts[] = "{$key}: {$value};";
		}

		return implode( ' ', $parts );
	}

	/**
	 * @param array<string, mixed> $settings Full plugin settings or branding settings.
	 * @return array<string, mixed>
	 */
	public static function public_config( array $settings ): array {
		$branding = self::from_settings( $settings );

		return array(
			'company'       => array(
				'name'           => $branding['company_name'],
				'short_name'     => $branding['company_short_name'],
				'logo_url'       => $branding['logo_url'],
				'support_url'    => $branding['support_url'],
				'receipt_footer' => $branding['receipt_footer'],
			),
			'theme'         => array_intersect_key( $branding, self::COLOR_KEYS ),
			'css_variables' => self::css_variables( $branding ),
		);
	}

	/**
	 * @return array<string, string>
	 */
	public static function color_defaults(): array {
		return self::COLOR_KEYS;
	}

	private static function clean_text( mixed $value, string $fallback, int $max_length ): string {
		$text = trim( preg_replace( '/\s+/', ' ', (string) $value ) ?? '' );

		if ( '' === $text ) {
			$text = $fallback;
		}

		if ( strlen( $text ) > $max_length ) {
			$text = substr( $text, 0, $max_length );
		}

		return $text;
	}

	private static function clean_https_url( mixed $value, string $fallback, bool $allow_empty ): string {
		$url = trim( (string) $value );

		if ( '' === $url && $allow_empty ) {
			return '';
		}

		if ( false === filter_var( $url, FILTER_VALIDATE_URL ) || ! str_starts_with( $url, 'https://' ) ) {
			return str_starts_with( $fallback, 'https://' ) ? $fallback : '';
		}

		return $url;
	}

	private static function clean_hex_color( mixed $value, string $fallback ): string {
		$color = strtoupper( trim( (string) $value ) );

		if ( 1 === preg_match( '/^#[0-9A-F]{6}$/', $color ) ) {
			return $color;
		}

		if ( 1 === preg_match( '/^#[0-9A-F]{3}$/', $color ) ) {
			return '#' . $color[1] . $color[1] . $color[2] . $color[2] . $color[3] . $color[3];
		}

		return $fallback;
	}

	private function __construct() {
	}
}
