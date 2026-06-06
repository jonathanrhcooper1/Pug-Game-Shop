<?php
/**
 * Structured log redaction.
 *
 * @package TCGStorePlatform
 */

namespace TCGStorePlatform\Logging;

final class Redactor {
	private const REDACTED = '[redacted]';

	/**
	 * @param mixed $value Value to redact.
	 * @return mixed
	 */
	public static function redact( mixed $value, ?string $key = null ): mixed {
		if ( null !== $key && self::is_sensitive_key( $key ) ) {
			return self::REDACTED;
		}

		if ( is_array( $value ) ) {
			$redacted = array();

			foreach ( $value as $child_key => $child_value ) {
				$redacted[ $child_key ] = self::redact( $child_value, (string) $child_key );
			}

			return $redacted;
		}

		if ( is_object( $value ) ) {
			return self::redact( get_object_vars( $value ), $key );
		}

		if ( is_string( $value ) ) {
			return self::redact_string( $value );
		}

		return $value;
	}

	private static function is_sensitive_key( string $key ): bool {
		$normalized = strtolower( str_replace( array( '-', ' ' ), '_', $key ) );

		return 1 === preg_match(
			'/(^|_)(authorization|cookie|password|passwd|secret|api_key|access_token|refresh_token|device_token|signature|manager_pin|pin)($|_)/',
			$normalized
		);
	}

	private static function redact_string( string $value ): string {
		$value = preg_replace( '/\bBearer\s+[A-Za-z0-9._~+\/=-]+/i', 'Bearer ' . self::REDACTED, $value ) ?? $value;
		$value = preg_replace(
			'/([?&](?:api[_-]?key|token|signature|secret)=)[^&\s]+/i',
			'$1' . self::REDACTED,
			$value
		) ?? $value;

		return $value;
	}

	private function __construct() {
	}
}
