<?php
/**
 * Inventory route bootstrapper tests.
 *
 * @package TCGStorePlatform
 */

namespace TCGStorePlatform\Tests\Unit;

use TCGStorePlatform\Api\V1\InventoryRouteBootstrapStatusPresenter;
use TCGStorePlatform\Api\V1\InventoryRouteBootstrapper;
use TCGStorePlatform\Tests\TestCase;

final class InventoryRouteBootstrapperTest extends TestCase {
	public function test_bootstrap_defers_registration_when_feature_flag_is_disabled(): void {
		$call_count = 0;
		$result     = $this->bootstrapper( $call_count )->bootstrap( false );

		$this->assert_same( 'blocked', $result['status'] );
		$this->assert_false( $result['feature_enabled'] );
		$this->assert_false( $result['should_register_routes'] );
		$this->assert_true( $result['registration_deferred'] );
		$this->assert_same( 16, $result['planned_route_count'] );
		$this->assert_same( 0, $result['registerable_route_count'] );
		$this->assert_same( 0, $result['registered_route_count'] );
		$this->assert_same( array(), $result['registered_route_keys'] );
		$this->assert_same(
			array( 'inventory_pricing_feature_disabled', 'no_registerable_inventory_routes' ),
			$result['bootstrap_block_reasons']
		);
		$this->assert_same( 0, $call_count );
	}

	public function test_bootstrap_defers_registration_when_feature_enabled_but_routes_are_not_ready(): void {
		$call_count = 0;
		$result     = $this->bootstrapper( $call_count )->bootstrap( true );

		$this->assert_same( 'gated', $result['status'] );
		$this->assert_true( $result['feature_enabled'] );
		$this->assert_false( $result['should_register_routes'] );
		$this->assert_true( $result['registration_deferred'] );
		$this->assert_same( 0, $result['registerable_route_count'] );
		$this->assert_same( 0, $result['registered_route_count'] );
		$this->assert_same( array(), $result['registered_route_keys'] );
		$this->assert_same( array( 'no_registerable_inventory_routes' ), $result['bootstrap_block_reasons'] );
		$this->assert_same( 0, $call_count );
	}

	public function test_bootstrap_invokes_registrar_for_ready_future_inventory_search_route(): void {
		$call_count = 0;
		$result     = $this->bootstrapper( $call_count )->bootstrap_from_registration_args(
			true,
			array(
				'GET /inventory/search' => $this->registerable_route_plan(),
			)
		);

		$this->assert_same( 'ready', $result['status'] );
		$this->assert_true( $result['should_register_routes'] );
		$this->assert_false( $result['registration_deferred'] );
		$this->assert_same( 1, $result['registered_route_count'] );
		$this->assert_same( array( 'GET /inventory/search' ), $result['registered_route_keys'] );
		$this->assert_same( array(), $result['bootstrap_block_reasons'] );
		$this->assert_same( 1, $call_count );
	}

	public function test_bootstrap_blocks_ready_future_route_when_feature_flag_is_disabled(): void {
		$call_count = 0;
		$result     = $this->bootstrapper( $call_count )->bootstrap_from_registration_args(
			false,
			array(
				'GET /inventory/search' => $this->registerable_route_plan(),
			)
		);

		$this->assert_same( 'blocked', $result['status'] );
		$this->assert_false( $result['should_register_routes'] );
		$this->assert_true( $result['registration_deferred'] );
		$this->assert_same( 1, $result['registerable_route_count'] );
		$this->assert_same( 0, $result['registered_route_count'] );
		$this->assert_same( array(), $result['registered_route_keys'] );
		$this->assert_same( array( 'inventory_pricing_feature_disabled' ), $result['bootstrap_block_reasons'] );
		$this->assert_same( 0, $call_count );
	}

	public function test_status_presenter_summarizes_blocked_inventory_bootstrap(): void {
		$summary = ( new InventoryRouteBootstrapStatusPresenter() )->admin_summary( false );

		$this->assert_same( 'blocked', $summary['status'] );
		$this->assert_contains( '0 / 16 registerable', $summary['value'] );
		$this->assert_contains( 'inventory_pricing_feature_disabled', $summary['value'] );
	}

	private function bootstrapper( int &$call_count ): InventoryRouteBootstrapper {
		return new InventoryRouteBootstrapper(
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
			'namespace'                            => 'tcg-store/v1',
			'path'                                 => '/inventory/search',
			'methods'                              => 'GET',
			'callback'                             => 'search_inventory_items',
			'permission'                           => 'public_or_staff_inventory_fields',
			'permission_callback_ready'            => true,
			'controller_callback_ready'            => true,
			'live_enabled_by_default'              => true,
			'route_registration_deferred'          => false,
			'route_connected_reads_deferred'       => false,
			'route_connected_writes_deferred'      => true,
			'woocommerce_projection_deferred'      => true,
			'square_inventory_projection_deferred' => true,
			'label_print_deferred'                 => true,
			'should_register'                      => true,
			'registration_block_reasons'           => array(),
		);
	}
}
