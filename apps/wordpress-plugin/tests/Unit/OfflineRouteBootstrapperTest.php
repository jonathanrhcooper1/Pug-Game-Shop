<?php
/**
 * Offline route bootstrapper tests.
 *
 * @package TCGStorePlatform
 */

namespace TCGStorePlatform\Tests\Unit;

use TCGStorePlatform\Api\V1\OfflineRouteBootstrapper;
use TCGStorePlatform\Tests\TestCase;

final class OfflineRouteBootstrapperTest extends TestCase {
	public function test_bootstrap_defers_registration_when_feature_flag_is_disabled(): void {
		$call_count = 0;
		$result     = $this->bootstrapper( $call_count )->bootstrap( false );

		$this->assert_same( 'blocked', $result['status'] );
		$this->assert_false( $result['should_register_routes'] );
		$this->assert_true( $result['registration_deferred'] );
		$this->assert_same( 0, $result['registered_route_count'] );
		$this->assert_same( array(), $result['registered_route_keys'] );
		$this->assert_same(
			array( 'offline_sync_feature_disabled', 'no_registerable_offline_routes' ),
			$result['bootstrap_block_reasons']
		);
		$this->assert_same( 0, $call_count );
	}

	public function test_bootstrap_defers_registration_when_feature_enabled_but_routes_are_not_ready(): void {
		$call_count = 0;
		$result     = $this->bootstrapper( $call_count )->bootstrap( true );

		$this->assert_same( 'gated', $result['status'] );
		$this->assert_false( $result['should_register_routes'] );
		$this->assert_true( $result['registration_deferred'] );
		$this->assert_same( 0, $result['registered_route_count'] );
		$this->assert_same( array(), $result['registered_route_keys'] );
		$this->assert_same( array( 'no_registerable_offline_routes' ), $result['bootstrap_block_reasons'] );
		$this->assert_same( 0, $call_count );
	}

	public function test_bootstrap_invokes_registrar_for_ready_future_plan(): void {
		$call_count = 0;
		$result     = $this->bootstrapper( $call_count )->bootstrap_from_registration_args(
			true,
			array(
				'POST /offline/pull' => $this->registerable_route_plan(),
			)
		);

		$this->assert_same( 'ready', $result['status'] );
		$this->assert_true( $result['should_register_routes'] );
		$this->assert_false( $result['registration_deferred'] );
		$this->assert_same( 1, $result['registered_route_count'] );
		$this->assert_same( array( 'POST /offline/pull' ), $result['registered_route_keys'] );
		$this->assert_same( array(), $result['bootstrap_block_reasons'] );
		$this->assert_same( 1, $call_count );
	}

	public function test_bootstrap_blocks_ready_future_plan_when_feature_flag_is_disabled(): void {
		$call_count = 0;
		$result     = $this->bootstrapper( $call_count )->bootstrap_from_registration_args(
			false,
			array(
				'POST /offline/pull' => $this->registerable_route_plan(),
			)
		);

		$this->assert_same( 'blocked', $result['status'] );
		$this->assert_false( $result['should_register_routes'] );
		$this->assert_true( $result['registration_deferred'] );
		$this->assert_same( 1, $result['registerable_route_count'] );
		$this->assert_same( 0, $result['registered_route_count'] );
		$this->assert_same( array(), $result['registered_route_keys'] );
		$this->assert_same( array( 'offline_sync_feature_disabled' ), $result['bootstrap_block_reasons'] );
		$this->assert_same( 0, $call_count );
	}

	private function bootstrapper( int &$call_count ): OfflineRouteBootstrapper {
		return new OfflineRouteBootstrapper(
			null,
			static function ( ?array $route_contracts, array $payload ) use ( &$call_count ): array {
				unset( $route_contracts );

				++$call_count;

				return array_fill_keys( $payload['registerable_route_keys'], array( 'registered' => true ) );
			}
		);
	}

	/**
	 * @return array<string, mixed>
	 */
	private function registerable_route_plan(): array {
		return array(
			'namespace'                  => 'tcg-store/v1',
			'path'                       => '/offline/pull',
			'methods'                    => 'POST',
			'callback'                   => 'pull_offline_changes',
			'permission'                 => 'registered offline device with offline_pull scope',
			'required_scope'             => 'offline_pull',
			'permission_strategy'        => 'registered_device_permission_callback',
			'permission_callback_ready'  => true,
			'controller_callback_ready'  => true,
			'live_enabled_by_default'    => true,
			'should_register'            => true,
			'registration_block_reasons' => array(),
		);
	}
}
