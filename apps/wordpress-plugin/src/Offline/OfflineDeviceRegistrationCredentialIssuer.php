<?php
/**
 * Offline device registration credential issuer.
 *
 * @package TCGStorePlatform
 */

namespace TCGStorePlatform\Offline;

use DateTimeImmutable;
use DateTimeZone;
use InvalidArgumentException;

final class OfflineDeviceRegistrationCredentialIssuer {
	public const DEFAULT_TOKEN_TTL_SECONDS = 86400;
	private const MIN_TOKEN_TTL_SECONDS    = 300;
	private const MAX_TOKEN_TTL_SECONDS    = 31536000;
	private const DEVICE_ID_BYTE_LENGTH     = 16;
	private const DEVICE_TOKEN_BYTE_LENGTH  = 32;

	/**
	 * @var callable(int): string
	 */
	private $byte_generator;

	public function __construct(
		?callable $byte_generator = null,
		private int $default_token_ttl_seconds = self::DEFAULT_TOKEN_TTL_SECONDS
	) {
		$this->assert_ttl( $default_token_ttl_seconds );
		$this->byte_generator = $byte_generator ?? static fn ( int $length ): string => random_bytes( $length );
	}

	public function issue(
		string $issued_at_utc = '',
		?int $token_ttl_seconds = null
	): OfflineDeviceRegistrationCredentials {
		$ttl_seconds = $token_ttl_seconds ?? $this->default_token_ttl_seconds;
		$this->assert_ttl( $ttl_seconds );

		$issued_at        = $this->issued_at( $issued_at_utc );
		$token_expires_at = $issued_at->modify( '+' . (string) $ttl_seconds . ' seconds' );
		$device_id        = $this->uuid_from_bytes( $this->bytes( self::DEVICE_ID_BYTE_LENGTH ) );
		$device_token     = bin2hex( $this->bytes( self::DEVICE_TOKEN_BYTE_LENGTH ) );
		$token_hash       = OfflineDeviceTokenLookupPlanner::token_hash( $device_token );
		$issued_at_utc    = $this->format_utc( $issued_at );
		$expires_at_utc   = $this->format_utc( $token_expires_at );

		return new OfflineDeviceRegistrationCredentials(
			$device_id,
			$device_token,
			$token_hash,
			$issued_at_utc,
			$expires_at_utc,
			$ttl_seconds,
			array(
				'action'                   => 'offline_device_registration_credentials_issued',
				'device_id'                => $device_id,
				'issued_at_utc'            => $issued_at_utc,
				'token_expires_at_utc'     => $expires_at_utc,
				'token_ttl_seconds'        => $ttl_seconds,
				'device_token_fingerprint' => substr( $token_hash, 0, 12 ),
			)
		);
	}

	private function bytes( int $length ): string {
		$generator = $this->byte_generator;
		$bytes     = $generator( $length );

		if ( ! is_string( $bytes ) || strlen( $bytes ) !== $length ) {
			throw new InvalidArgumentException( 'byte_generator must return the requested byte length.' );
		}

		return $bytes;
	}

	private function issued_at( string $issued_at_utc ): DateTimeImmutable {
		$issued_at_utc = trim( $issued_at_utc );

		if ( '' === $issued_at_utc ) {
			return new DateTimeImmutable( 'now', new DateTimeZone( 'UTC' ) );
		}

		if ( 1 !== preg_match( '/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d+)?Z$/', $issued_at_utc ) ) {
			throw new InvalidArgumentException( 'issued_at_utc must be an ISO-8601 UTC timestamp.' );
		}

		return new DateTimeImmutable( $issued_at_utc );
	}

	private function format_utc( DateTimeImmutable $date_time ): string {
		return $date_time->setTimezone( new DateTimeZone( 'UTC' ) )->format( 'Y-m-d\TH:i:s\Z' );
	}

	private function uuid_from_bytes( string $bytes ): string {
		$bytes[6] = chr( ( ord( $bytes[6] ) & 0x0f ) | 0x40 );
		$bytes[8] = chr( ( ord( $bytes[8] ) & 0x3f ) | 0x80 );

		return vsprintf( '%s%s-%s-%s-%s-%s%s%s', str_split( bin2hex( $bytes ), 4 ) );
	}

	private function assert_ttl( int $ttl_seconds ): void {
		if (
			$ttl_seconds < self::MIN_TOKEN_TTL_SECONDS
			|| $ttl_seconds > self::MAX_TOKEN_TTL_SECONDS
		) {
			throw new InvalidArgumentException( 'token TTL must be between 300 seconds and 365 days.' );
		}
	}
}
