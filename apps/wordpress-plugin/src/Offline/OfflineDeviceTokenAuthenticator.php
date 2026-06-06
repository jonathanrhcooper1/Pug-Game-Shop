<?php
/**
 * Offline device bearer-token authenticator.
 *
 * @package TCGStorePlatform
 */

namespace TCGStorePlatform\Offline;

final class OfflineDeviceTokenAuthenticator {
	private const HEADER_KEYS = array( 'authorization', 'http_authorization' );

	public function __construct(
		private ?OfflineDeviceAccessPolicy $policy = null
	) {
		$this->policy ??= new OfflineDeviceAccessPolicy();
	}

	/**
	 * @param array<string, mixed> $headers REST request headers.
	 * @param array<string, mixed> $device_row Stored device row.
	 */
	public function authenticate(
		array $headers,
		array $device_row,
		string $required_scope,
		string $now_utc
	): OfflineDeviceAccessDecision {
		$parsed_token      = $this->parse_bearer_token( $headers );
		$errors            = $parsed_token['errors'];
		$offline_device_id = $this->positive_int( $device_row['offline_device_id'] ?? null );

		if ( null === $offline_device_id ) {
			$errors[] = 'offline_device_id_invalid';
		}

		if ( array() !== $errors ) {
			return OfflineDeviceAccessDecision::rejected( array_values( array_unique( $errors ) ) );
		}

		$stored_token_hash = strtolower( trim( (string) ( $device_row['token_hash'] ?? '' ) ) );

		if ( 1 !== preg_match( '/^[a-f0-9]{64}$/', $stored_token_hash ) ) {
			return OfflineDeviceAccessDecision::rejected( array( 'device_token_hash_invalid' ) );
		}

		if ( ! hash_equals( $stored_token_hash, self::token_hash( $parsed_token['token'] ) ) ) {
			return OfflineDeviceAccessDecision::rejected( array( 'device_token_mismatch' ) );
		}

		$decision = $this->policy->authorize( $device_row, $required_scope, $now_utc );

		if ( ! $decision->is_allowed() ) {
			return $decision;
		}

		$context                         = $decision->context();
		$context['offline_device_id']    = $offline_device_id;
		$context['auth_type']            = 'device_bearer';
		$context['token_verified']       = true;
		$context['authenticated_at_utc'] = trim( $now_utc );

		return OfflineDeviceAccessDecision::accepted( $context );
	}

	public static function token_hash( string $device_token ): string {
		return hash( 'sha256', trim( $device_token ) );
	}

	/**
	 * @param array<string, mixed> $headers REST request headers.
	 * @return array{token:string,errors:list<string>}
	 */
	private function parse_bearer_token( array $headers ): array {
		$header_value = $this->authorization_header( $headers );

		if ( '' === $header_value ) {
			return array(
				'token'  => '',
				'errors' => array( 'authorization_header_required' ),
			);
		}

		if ( 1 !== preg_match( '/^Bearer\s+(.+)$/i', $header_value, $matches ) ) {
			return array(
				'token'  => '',
				'errors' => array( 'authorization_header_invalid' ),
			);
		}

		$device_token = trim( (string) $matches[1] );

		if ( 1 !== preg_match( '/^[a-zA-Z0-9._:-]{32,256}$/', $device_token ) ) {
			return array(
				'token'  => '',
				'errors' => array( 'device_token_invalid' ),
			);
		}

		return array(
			'token'  => $device_token,
			'errors' => array(),
		);
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

	private function positive_int( mixed $value ): ?int {
		if ( is_int( $value ) && $value > 0 ) {
			return $value;
		}

		if ( is_string( $value ) && 1 === preg_match( '/^\d+$/', $value ) && (int) $value > 0 ) {
			return (int) $value;
		}

		return null;
	}
}
