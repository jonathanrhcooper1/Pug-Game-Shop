<?php
/**
 * Offline device registration credential issuer tests.
 *
 * @package TCGStorePlatform
 */

namespace TCGStorePlatform\Tests\Unit;

use InvalidArgumentException;
use TCGStorePlatform\Offline\OfflineDeviceRegistrationCredentialIssuer;
use TCGStorePlatform\Offline\OfflineDeviceTokenLookupPlanner;
use TCGStorePlatform\Tests\TestCase;

final class OfflineDeviceRegistrationCredentialIssuerTest extends TestCase {
	public function test_issuer_generates_registration_credentials_with_secret_free_audit(): void {
		$issuer      = new OfflineDeviceRegistrationCredentialIssuer(
			$this->byte_queue(
				array(
					hex2bin( '00112233445566778899aabbccddeeff' ),
					str_repeat( "\xab", 32 ),
				)
			)
		);
		$credentials = $issuer->issue( '2026-06-06T18:30:00Z' );
		$audit       = $credentials->audit_payload();
		$token_hash  = OfflineDeviceTokenLookupPlanner::token_hash( $credentials->device_token() );

		$this->assert_same( '00112233-4455-4677-8899-aabbccddeeff', $credentials->device_id() );
		$this->assert_same( str_repeat( 'ab', 32 ), $credentials->device_token() );
		$this->assert_same( $token_hash, $credentials->device_token_hash() );
		$this->assert_same( '2026-06-06T18:30:00Z', $credentials->issued_at_utc() );
		$this->assert_same( '2026-06-07T18:30:00Z', $credentials->token_expires_at_utc() );
		$this->assert_same( 86400, $credentials->token_ttl_seconds() );
		$this->assert_same( 'offline_device_registration_credentials_issued', $audit['action'] );
		$this->assert_same( $credentials->device_id(), $audit['device_id'] );
		$this->assert_same( substr( $token_hash, 0, 12 ), $audit['device_token_fingerprint'] );
		$this->assert_not_contains( $credentials->device_token(), (string) json_encode( $audit ) );
		$this->assert_not_contains( $credentials->device_token_hash(), (string) json_encode( $audit ) );
		$this->assert_false( array_key_exists( 'device_token', $audit ) );
		$this->assert_false( array_key_exists( 'device_token_hash', $audit ) );
	}

	public function test_issuer_accepts_custom_ttl(): void {
		$issuer      = new OfflineDeviceRegistrationCredentialIssuer(
			$this->byte_queue(
				array(
					hex2bin( 'ffffffffffffffffffffffffffffffff' ),
					str_repeat( "\xcd", 32 ),
				)
			),
			7200
		);
		$credentials = $issuer->issue( '2026-06-06T18:30:00Z', 3600 );

		$this->assert_same( 'ffffffff-ffff-4fff-bfff-ffffffffffff', $credentials->device_id() );
		$this->assert_same( 3600, $credentials->token_ttl_seconds() );
		$this->assert_same( '2026-06-06T19:30:00Z', $credentials->token_expires_at_utc() );
	}

	public function test_issuer_rejects_invalid_ttl_time_and_byte_lengths(): void {
		$this->assert_exception_message(
			static fn (): OfflineDeviceRegistrationCredentialIssuer => new OfflineDeviceRegistrationCredentialIssuer( null, 299 ),
			'token TTL must be between 300 seconds and 365 days.'
		);

		$issuer = new OfflineDeviceRegistrationCredentialIssuer(
			$this->byte_queue(
				array(
					str_repeat( "\x00", 16 ),
					str_repeat( "\x00", 32 ),
				)
			)
		);

		$this->assert_exception_message(
			static fn () => $issuer->issue( 'not-now' ),
			'issued_at_utc must be an ISO-8601 UTC timestamp.'
		);

		$bad_bytes = new OfflineDeviceRegistrationCredentialIssuer(
			static fn ( int $length ): string => str_repeat( "\x00", $length - 1 )
		);

		$this->assert_exception_message(
			static fn () => $bad_bytes->issue( '2026-06-06T18:30:00Z' ),
			'byte_generator must return the requested byte length.'
		);
	}

	/**
	 * @param list<string|false> $items Byte strings.
	 * @return callable(int): string
	 */
	private function byte_queue( array $items ): callable {
		return static function ( int $length ) use ( &$items ): string {
			unset( $length );

			$item = array_shift( $items );

			return is_string( $item ) ? $item : '';
		};
	}

	private function assert_exception_message( callable $callback, string $message ): void {
		try {
			$callback();
		} catch ( InvalidArgumentException $exception ) {
			$this->assert_same( $message, $exception->getMessage() );

			return;
		}

		$this->assert_true( false, 'Expected InvalidArgumentException.' );
	}
}
