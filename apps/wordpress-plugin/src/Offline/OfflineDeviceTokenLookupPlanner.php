<?php
/**
 * Offline device token lookup planner.
 *
 * @package TCGStorePlatform
 */

namespace TCGStorePlatform\Offline;

final class OfflineDeviceTokenLookupPlanner {
	private const HEADER_KEYS = array( 'authorization', 'http_authorization' );

	/**
	 * @param array<string, mixed> $headers REST request headers.
	 */
	public function plan( array $headers ): OfflineDeviceTokenLookupPlan {
		$header_value = $this->authorization_header( $headers );

		if ( '' === $header_value ) {
			return OfflineDeviceTokenLookupPlan::rejected( array( 'authorization_header_required' ) );
		}

		if ( 1 !== preg_match( '/^Bearer\s+(.+)$/i', $header_value, $matches ) ) {
			return OfflineDeviceTokenLookupPlan::rejected( array( 'authorization_header_invalid' ) );
		}

		$device_token = trim( (string) $matches[1] );

		if ( 1 !== preg_match( '/^[a-zA-Z0-9._:-]{32,256}$/', $device_token ) ) {
			return OfflineDeviceTokenLookupPlan::rejected( array( 'device_token_invalid' ) );
		}

		return OfflineDeviceTokenLookupPlan::accepted( self::token_hash( $device_token ) );
	}

	public static function token_hash( string $device_token ): string {
		return hash( 'sha256', trim( $device_token ) );
	}

	/**
	 * @param array<string, mixed> $headers REST request headers.
	 */
	private function authorization_header( array $headers ): string {
		foreach ( $headers as $key => $value ) {
			$normalized_key = strtolower( str_replace( '-', '_', trim( (string) $key ) ) );

			if ( ! in_array( $normalized_key, self::HEADER_KEYS, true ) ) {
				continue;
			}

			return $this->first_header_value( $value );
		}

		return '';
	}

	private function first_header_value( mixed $value ): string {
		if ( is_array( $value ) ) {
			$value = reset( $value );
		}

		return trim( (string) $value );
	}
}
