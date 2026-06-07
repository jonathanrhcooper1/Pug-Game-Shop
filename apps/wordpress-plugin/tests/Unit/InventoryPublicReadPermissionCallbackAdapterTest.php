<?php
/**
 * Inventory public-read permission callback tests.
 *
 * @package TCGStorePlatform
 */

namespace TCGStorePlatform\Tests\Unit;

use TCGStorePlatform\Api\V1\InventoryPublicReadPermissionCallbackAdapter;
use TCGStorePlatform\Api\V1\InventoryPublicReadRateLimitPolicy;
use TCGStorePlatform\Tests\TestCase;

final class InventoryPublicReadPermissionCallbackAdapterTest extends TestCase {
	public function test_public_read_requires_configured_rate_limiter_for_public_users(): void {
		$adapter = new InventoryPublicReadPermissionCallbackAdapter(
			'public_rate_limited',
			true
		);

		$this->assert_false( $adapter->is_configured() );
		$this->assert_false( $adapter->authorize( $this->request_from_ip( '203.0.113.10' ) ) );
		$this->assert_same( 'denied', $adapter->last_audit_payload()['status'] );
		$this->assert_true(
			in_array(
				'public_rate_limiter_not_configured',
				$adapter->last_audit_payload()['errors'],
				true
			)
		);
	}

	public function test_public_read_authorizes_until_rate_limit_is_exceeded(): void {
		$adapter = new InventoryPublicReadPermissionCallbackAdapter(
			'public_rate_limited',
			true,
			null,
			'view_inventory',
			$this->rate_limit_policy( 2, 60 )
		);
		$request = $this->request_from_ip( '203.0.113.11' );

		$this->assert_true( $adapter->is_configured() );
		$this->assert_true( $adapter->authorize( $request ) );
		$this->assert_same( 'public_read_rate_limited', $adapter->last_audit_payload()['strategy'] );
		$this->assert_same( 1, $adapter->last_audit_payload()['public_rate_limit']['remaining'] );

		$this->assert_true( $adapter->authorize( $request ) );
		$this->assert_same( 0, $adapter->last_audit_payload()['public_rate_limit']['remaining'] );

		$this->assert_false( $adapter->authorize( $request ) );
		$this->assert_true(
			in_array(
				'public_rate_limit_exceeded',
				$adapter->last_audit_payload()['errors'],
				true
			)
		);
	}

	public function test_staff_fallback_can_authorize_when_public_limiter_is_missing(): void {
		$adapter = new InventoryPublicReadPermissionCallbackAdapter(
			'public_or_staff_inventory_fields',
			true,
			static fn ( string $capability ): bool => 'view_inventory' === $capability
		);

		$this->assert_true( $adapter->is_configured() );
		$this->assert_true( $adapter->authorize( $this->request_from_ip( '203.0.113.12' ) ) );
		$this->assert_same( 'authorized', $adapter->last_audit_payload()['status'] );
		$this->assert_same( 'fallback_capability', $adapter->last_audit_payload()['strategy'] );
		$this->assert_false( $adapter->last_audit_payload()['public_rate_limiter_configured'] );
	}

	public function test_public_reads_disabled_falls_back_to_staff_capability(): void {
		$adapter = new InventoryPublicReadPermissionCallbackAdapter(
			'public_or_staff_inventory_fields',
			false,
			static fn ( string $capability ): bool => 'view_inventory' === $capability
		);

		$this->assert_true( $adapter->is_configured() );
		$this->assert_true( $adapter->authorize( $this->request_from_ip( '203.0.113.13' ) ) );
		$this->assert_same( 'fallback_capability', $adapter->last_audit_payload()['strategy'] );
		$this->assert_same( array(), $adapter->last_audit_payload()['errors'] );
	}

	public function test_rate_limit_policy_resets_after_window_expires(): void {
		$now     = 1000;
		$policy  = $this->rate_limit_policy( 1, 60, $now );
		$allowed = $policy->authorize( '203.0.113.14' );
		$blocked = $policy->authorize( '203.0.113.14' );

		$now   = 1061;
		$reset = $policy->authorize( '203.0.113.14' );

		$this->assert_true( $allowed['allowed'] );
		$this->assert_false( $blocked['allowed'] );
		$this->assert_true( $reset['allowed'] );
	}

	/**
	 * @return array{headers:array<string, string>,server:array<string, string>}
	 */
	private function request_from_ip( string $ip ): array {
		return array(
			'headers' => array(
				'X-Forwarded-For' => $ip . ', 10.0.0.1',
				'User-Agent'      => 'Pug-Test-Agent',
			),
			'server'  => array(
				'REMOTE_ADDR' => '198.51.100.1',
			),
		);
	}

	private function rate_limit_policy(
		int $limit,
		int $window_seconds,
		?int &$now = null
	): InventoryPublicReadRateLimitPolicy {
		if ( null === $now ) {
			$now = 1000;
		}

		$store = array();

		return new InventoryPublicReadRateLimitPolicy(
			$limit,
			$window_seconds,
			static function ( string $key ) use ( &$store ): mixed {
				return $store[ $key ] ?? false;
			},
			static function ( string $key, array $state, int $ttl ) use ( &$store ): bool {
				unset( $ttl );

				$store[ $key ] = $state;

				return true;
			},
			static function () use ( &$now ): int {
				return $now;
			}
		);
	}
}
