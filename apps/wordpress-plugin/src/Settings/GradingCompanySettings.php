<?php
/**
 * Graded card intake settings.
 *
 * @package TCGStorePlatform
 */

namespace TCGStorePlatform\Settings;

final class GradingCompanySettings {
	public const KEY = 'grading_companies';

	/**
	 * @return array<string, mixed>
	 */
	public static function defaults(): array {
		return array(
			'companies' => array( 'PSA', 'CGC', 'Beckett/BGS', 'SGC', 'TAG', 'Other' ),
		);
	}

	/**
	 * @param mixed                $value Submitted settings.
	 * @param array<string, mixed> $fallback Existing safe settings.
	 * @return array<string, mixed>
	 */
	public static function sanitize( mixed $value, array $fallback = array() ): array {
		$value    = is_array( $value ) ? $value : array();
		$fallback = array() === $fallback ? self::defaults() : $fallback;
		$raw      = $value['companies'] ?? ( $fallback['companies'] ?? self::defaults()['companies'] );

		if ( is_string( $raw ) ) {
			$raw = preg_split( '/[\r\n,]+/', $raw );
		}

		$companies = array();
		foreach ( is_array( $raw ) ? $raw : array() as $company ) {
			$company = trim( preg_replace( '/\s+/', ' ', (string) $company ) ?? '' );
			$company = substr( $company, 0, 64 );

			if ( '' !== $company ) {
				$companies[] = $company;
			}
		}

		$companies = array_values( array_unique( $companies ) );

		if ( array() === $companies ) {
			$companies = self::defaults()['companies'];
		}

		if ( ! in_array( 'Other', $companies, true ) ) {
			$companies[] = 'Other';
		}

		return array(
			'companies' => $companies,
		);
	}

	/**
	 * @param array<string, mixed> $settings Platform settings.
	 * @return list<string>
	 */
	public static function companies_from_settings( array $settings ): array {
		$settings = self::sanitize( $settings[ self::KEY ] ?? array() );

		return $settings['companies'];
	}

	private function __construct() {
	}
}
