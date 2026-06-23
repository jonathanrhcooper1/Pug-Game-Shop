<?php
/**
 * ScryDex webhook signature verification.
 *
 * @package TCGStorePlatform
 */

namespace TCGStorePlatform\ScryDex;

final class ScryDexWebhookSignatureVerifier {
	private const DEFAULT_TOLERANCE_SECONDS = 300;

	public function __construct(
		private int $tolerance_seconds = self::DEFAULT_TOLERANCE_SECONDS
	) {
		$this->tolerance_seconds = max( 1, $this->tolerance_seconds );
	}

	/**
	 * @return array<string, mixed>
	 */
	public function verify( string $raw_body, string $signature_header, string $secret, ?int $now = null ): array {
		$now              = $now ?? time();
		$payload_hash     = hash( 'sha256', $raw_body );
		$signature_header = trim( $signature_header );
		$secret           = trim( $secret );
		$parts            = $this->signature_parts( $signature_header );
		$timestamp        = (int) ( $parts['t'] ?? 0 );
		$signature        = (string) ( $parts['v1'] ?? '' );
		$errors           = array();

		if ( '' === $secret ) {
			$errors[] = 'scrydex_webhook_secret_missing';
		}

		if ( '' === $signature_header ) {
			$errors[] = 'scrydex_webhook_signature_missing';
		}

		if ( 0 >= $timestamp ) {
			$errors[] = 'scrydex_webhook_signature_timestamp_missing';
		}

		if ( '' === $signature || 1 !== preg_match( '/^[a-f0-9]{64}$/i', $signature ) ) {
			$errors[] = 'scrydex_webhook_signature_v1_invalid';
		}

		if ( 0 < $timestamp && abs( $now - $timestamp ) > $this->tolerance_seconds ) {
			$errors[] = 'scrydex_webhook_signature_timestamp_outside_tolerance';
		}

		$expected = '';
		if ( array() === $errors ) {
			$expected = hash_hmac( 'sha256', $timestamp . '.' . $raw_body, $secret );

			if ( ! hash_equals( strtolower( $expected ), strtolower( $signature ) ) ) {
				$errors[] = 'scrydex_webhook_signature_mismatch';
			}
		}

		return array(
			'status'                     => array() === $errors ? 'verified' : 'rejected',
			'signature_status'           => array() === $errors ? 'verified' : 'invalid',
			'timestamp'                  => $timestamp,
			'tolerance_seconds'          => $this->tolerance_seconds,
			'payload_hash'               => $payload_hash,
			'signed_payload_format'      => 'timestamp.raw_body',
			'hmac_algorithm'             => 'sha256',
			'constant_time_compare_used' => true,
			'raw_body_required'          => true,
			'credential_values_redacted' => true,
			'errors'                     => array_values( array_unique( $errors ) ),
		);
	}

	/**
	 * @return array<string, string>
	 */
	private function signature_parts( string $signature_header ): array {
		$parts = array();

		foreach ( explode( ',', $signature_header ) as $part ) {
			$pair = explode( '=', trim( $part ), 2 );
			if ( 2 !== count( $pair ) ) {
				continue;
			}

			$key = trim( $pair[0] );
			if ( in_array( $key, array( 't', 'v1' ), true ) ) {
				$parts[ $key ] = trim( $pair[1] );
			}
		}

		return $parts;
	}
}
