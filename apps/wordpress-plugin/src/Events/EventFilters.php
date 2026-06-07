<?php
/**
 * Public event listing filter sanitization.
 *
 * @package TCGStorePlatform
 */

namespace TCGStorePlatform\Events;

final class EventFilters {
	private const ALLOWED_FREE_PAID = array( 'free', 'paid' );
	private const ALLOWED_TONE      = array( 'competitive', 'casual' );

	/**
	 * @var array<string, string|bool>
	 */
	private array $values;

	/**
	 * @param array<string, string|bool> $values Sanitized values.
	 */
	private function __construct( array $values ) {
		$this->values = $values;
	}

	/**
	 * @param array<string, mixed> $raw Raw query or shortcode values.
	 */
	public static function from_array( array $raw ): self {
		$values = array();

		foreach ( array( 'game', 'format', 'event_type', 'registration_status' ) as $key ) {
			$value = self::clean_token( $raw[ $key ] ?? '' );

			if ( '' !== $value ) {
				$values[ $key ] = $value;
			}
		}

		$date_from = self::clean_date( $raw['date_from'] ?? '' );
		$date_to   = self::clean_date( $raw['date_to'] ?? '' );

		if ( '' !== $date_from ) {
			$values['date_from'] = $date_from;
		}

		if ( '' !== $date_to ) {
			$values['date_to'] = $date_to;
		}

		$free_paid = self::clean_token( $raw['free_paid'] ?? '' );

		if ( in_array( $free_paid, self::ALLOWED_FREE_PAID, true ) ) {
			$values['free_paid'] = $free_paid;
		}

		$tone = self::clean_token( $raw['tone'] ?? '' );

		if ( in_array( $tone, self::ALLOWED_TONE, true ) ) {
			$values['tone'] = $tone;
		}

		if ( self::is_truthy( $raw['featured'] ?? false ) ) {
			$values['featured'] = true;
		}

		return new self( $values );
	}

	/**
	 * @return array<string, string|bool>
	 */
	public function to_array(): array {
		return $this->values;
	}

	public function get_string( string $key ): ?string {
		$value = $this->values[ $key ] ?? null;

		return is_string( $value ) ? $value : null;
	}

	public function get_bool( string $key ): bool {
		return true === ( $this->values[ $key ] ?? false );
	}

	private static function clean_token( mixed $value ): string {
		$value = strtolower( trim( (string) $value ) );
		$value = preg_replace( '/[^a-z0-9_-]+/', '-', $value ) ?? '';
		$value = trim( $value, '-' );

		return substr( $value, 0, 100 );
	}

	private static function clean_date( mixed $value ): string {
		$value = trim( (string) $value );

		if ( 1 !== preg_match( '/^\d{4}-\d{2}-\d{2}$/', $value ) ) {
			return '';
		}

		return $value;
	}

	private static function is_truthy( mixed $value ): bool {
		if ( is_bool( $value ) ) {
			return $value;
		}

		return in_array( strtolower( trim( (string) $value ) ), array( '1', 'true', 'yes', 'on' ), true );
	}
}
