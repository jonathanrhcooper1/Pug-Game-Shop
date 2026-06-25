<?php
/**
 * Rate-limit policy for public inventory read routes.
 *
 * @package TCGStorePlatform
 */

namespace TCGStorePlatform\Api\V1;

use Throwable;

final class InventoryPublicReadRateLimitPolicy {
	private const TRANSIENT_PREFIX = 'tcg_inventory_public_read_rate_';

	private int $limit;
	private int $window_seconds;
	private mixed $state_reader;
	private mixed $state_writer;
	private mixed $clock;

	/**
	 * @param callable(string): mixed|null               $state_reader Stored bucket reader.
	 * @param callable(string, array<string, int>, int): bool|null $state_writer Stored bucket writer.
	 * @param callable(): int|null                       $clock Current timestamp provider.
	 */
	public function __construct(
		int $limit = 60,
		int $window_seconds = 60,
		?callable $state_reader = null,
		?callable $state_writer = null,
		?callable $clock = null
	) {
		$this->limit          = max( 0, $limit );
		$this->window_seconds = max( 0, $window_seconds );
		$this->state_reader   = $state_reader;
		$this->state_writer   = $state_writer;
		$this->clock          = $clock;
	}

	public static function for_wordpress_transients( int $limit = 60, int $window_seconds = 60 ): ?self {
		if ( ! function_exists( 'get_transient' ) || ! function_exists( 'set_transient' ) ) {
			return null;
		}

		return new self(
			$limit,
			$window_seconds,
			static fn ( string $key ): mixed => get_transient( $key ),
			static fn ( string $key, array $state, int $ttl ): bool => false !== set_transient( $key, $state, $ttl )
		);
	}

	public function is_configured(): bool {
		return 0 < $this->limit
			&& 0 < $this->window_seconds
			&& is_callable( $this->state_reader )
			&& is_callable( $this->state_writer );
	}

	/**
	 * @return array<string, mixed>
	 */
	public function authorize( string $bucket ): array {
		$bucket = '' !== trim( $bucket ) ? trim( $bucket ) : 'anonymous';

		if ( ! $this->is_configured() ) {
			return $this->result(
				false,
				$bucket,
				0,
				0,
				array( 'public_rate_limiter_not_configured' )
			);
		}

		$now = $this->now();
		$key = $this->storage_key( $bucket );

		try {
			$stored = call_user_func( $this->state_reader, $key );
			$state  = $this->normalized_state( $stored, $now );
			$count  = (int) $state['count'] + 1;
			$reset  = (int) $state['reset_at'];
			$ttl    = max( 1, $reset - $now );

			$written = call_user_func(
				$this->state_writer,
				$key,
				array(
					'count'      => $count,
					'reset_at'   => $reset,
					'updated_at' => $now,
				),
				$ttl
			);

			if ( true !== $written ) {
				return $this->result(
					false,
					$bucket,
					0,
					$ttl,
					array( 'public_rate_limiter_store_failed' )
				);
			}

			$allowed = $count <= $this->limit;

			return $this->result(
				$allowed,
				$bucket,
				max( 0, $this->limit - $count ),
				$allowed ? 0 : $ttl,
				$allowed ? array() : array( 'public_rate_limit_exceeded' )
			);
		} catch ( Throwable ) {
			return $this->result(
				false,
				$bucket,
				0,
				$this->window_seconds,
				array( 'public_rate_limiter_store_failed' )
			);
		}
	}

	/**
	 * @return array<string, int>
	 */
	private function normalized_state( mixed $stored, int $now ): array {
		if ( ! is_array( $stored ) ) {
			return $this->fresh_state( $now );
		}

		$count    = max( 0, (int) ( $stored['count'] ?? 0 ) );
		$reset_at = max( 0, (int) ( $stored['reset_at'] ?? 0 ) );

		if ( $reset_at <= $now ) {
			return $this->fresh_state( $now );
		}

		return array(
			'count'    => $count,
			'reset_at' => $reset_at,
		);
	}

	/**
	 * @return array<string, int>
	 */
	private function fresh_state( int $now ): array {
		return array(
			'count'    => 0,
			'reset_at' => $now + $this->window_seconds,
		);
	}

	private function now(): int {
		if ( is_callable( $this->clock ) ) {
			return max( 0, (int) call_user_func( $this->clock ) );
		}

		return time();
	}

	private function storage_key( string $bucket ): string {
		return self::TRANSIENT_PREFIX . hash( 'sha256', $bucket );
	}

	/**
	 * @param list<string> $errors Rate-limit errors.
	 * @return array<string, mixed>
	 */
	private function result(
		bool $allowed,
		string $bucket,
		int $remaining,
		int $retry_after_seconds,
		array $errors
	): array {
		return array(
			'allowed'             => $allowed,
			'configured'          => $this->is_configured(),
			'bucket_hash'         => hash( 'sha256', $bucket ),
			'limit'               => $this->limit,
			'window_seconds'      => $this->window_seconds,
			'remaining'           => max( 0, $remaining ),
			'retry_after_seconds' => max( 0, $retry_after_seconds ),
			'errors'              => array_values( array_unique( $errors ) ),
		);
	}
}
