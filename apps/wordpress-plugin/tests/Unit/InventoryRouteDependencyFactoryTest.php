<?php
/**
 * Inventory route dependency factory tests.
 *
 * @package TCGStorePlatform
 */

namespace TCGStorePlatform\Tests\Unit;

use TCGStorePlatform\Api\V1\InventoryCapabilityPermissionCallbackAdapter;
use TCGStorePlatform\Api\V1\InventoryPublicReadPermissionCallbackAdapter;
use TCGStorePlatform\Api\V1\InventoryPublicReadRateLimitPolicy;
use TCGStorePlatform\Api\V1\InventoryRouteDependencyFactory;
use TCGStorePlatform\Api\V1\InventoryRouteDependencyStatusPresenter;
use TCGStorePlatform\Api\V1\InventoryRouteContracts;
use TCGStorePlatform\Api\V1\InventoryRouteRuntimeConfigurator;
use TCGStorePlatform\Api\V1\OfflineRestRequestData;
use TCGStorePlatform\Tests\TestCase;

final class InventoryRouteDependencyFactoryTest extends TestCase {
	public function test_default_factory_reports_blocked_dependency_state_without_live_routes(): void {
		$summary = ( new InventoryRouteDependencyFactory() )->readiness_summary();

		$this->assert_false( $summary['configured'] );
		$this->assert_true( $summary['route_dependency_factory_ready'] );
		$this->assert_same( 16, $summary['route_contract_count'] );
		$this->assert_same( 2, $summary['staged_handler_route_count'] );
		$this->assert_same( 0, $summary['controller_handler_count'] );
		$this->assert_false( $summary['controller_handlers_configured'] );
		$this->assert_same( 0, $summary['permission_callback_count'] );
		$this->assert_same( 8, $summary['capability_permission_route_count'] );
		$this->assert_false( $summary['capability_permission_callbacks_configured'] );
		$this->assert_same( 5, $summary['public_read_route_count'] );
		$this->assert_same( 1, $summary['public_rate_limited_route_count'] );
		$this->assert_false( $summary['public_read_routes_enabled'] );
		$this->assert_false( $summary['public_rate_limiter_configured'] );
		$this->assert_false( $summary['public_read_permission_callbacks_configured'] );
		$this->assert_true( $summary['registration_planner_ready'] );
		$this->assert_true( $summary['registrar_ready'] );
		$this->assert_true( $summary['bootstrapper_ready'] );
		$this->assert_true( $summary['inventory_search_route_handler_factory_ready'] );
		$this->assert_false( $summary['inventory_search_route_handler_ready'] );
		$this->assert_true( $summary['inventory_search_route_reads_deferred'] );
		$this->assert_true( $summary['inventory_intake_route_handler_factory_ready'] );
		$this->assert_false( $summary['inventory_intake_route_handler_ready'] );
		$this->assert_true( $summary['inventory_intake_route_writes_deferred'] );
		$this->assert_same( 0, $summary['registerable_route_count'] );
		$this->assert_true( $summary['route_registration_deferred'] );
		$this->assert_true( $summary['route_connected_reads_deferred'] );
		$this->assert_true( $summary['route_connected_writes_deferred'] );
		$this->assert_false( $summary['route_connected_reads_ready'] );
		$this->assert_false( $summary['route_connected_writes_ready'] );
		$this->assert_same(
			array(
				'inventory_route_handlers_not_configured',
				'inventory_capability_permission_callbacks_not_configured',
				'inventory_public_read_routes_not_enabled',
				'inventory_public_read_permission_callbacks_not_configured',
			),
			$summary['configuration_issues']
		);
	}

	public function test_configured_factory_assembles_controller_permissions_and_registrar(): void {
		$factory = new InventoryRouteDependencyFactory(
			null,
			$this->handlers_for_staged_routes(),
			static fn (): bool => true,
			static fn (): bool => true,
			true,
			null,
			null,
			null,
			$this->rate_limit_policy()
		);
		$summary = $factory->readiness_summary();

		$this->assert_true( $factory->is_configured() );
		$this->assert_true( $summary['configured'] );
		$this->assert_same( 2, $summary['controller_handler_count'] );
		$this->assert_true( $summary['controller_handlers_configured'] );
		$this->assert_same( 13, $summary['permission_callback_count'] );
		$this->assert_true( $summary['capability_permission_callbacks_configured'] );
		$this->assert_true( $summary['public_read_permission_callbacks_configured'] );
		$this->assert_true( $summary['public_rate_limiter_configured'] );
		$this->assert_same( 0, $summary['registerable_route_count'] );
		$this->assert_true( $summary['route_registration_deferred'] );
		$this->assert_same( array(), $summary['configuration_issues'] );
		$this->assert_true( $factory->controller()->has_handler( 'search_inventory_items' ) );
		$this->assert_true( $factory->controller()->has_handler( 'create_inventory_item' ) );
		$this->assert_false( $factory->controller()->has_handler( 'reserve_inventory_item' ) );
		$this->assert_same( 0, $factory->registrar()->register_enabled_routes() );
		$this->assert_same( 'gated', $factory->bootstrapper()->bootstrap( true )['status'] );
	}

	public function test_factory_controller_dispatches_injected_search_and_create_handlers(): void {
		$controller = ( new InventoryRouteDependencyFactory(
			null,
			$this->handlers_for_staged_routes()
		) )->controller();

		$search = $controller->search_inventory_items(
			array(
				'query' => array(
					'q' => 'pikachu',
				),
			)
		);
		$create = $controller->create_inventory_item(
			array(
				'headers' => array(
					'idempotency-key' => 'route-dependency-test',
				),
			)
		);
		$locked = $controller->reserve_inventory_item( array() );

		$this->assert_same( 'ready', $search['status'] );
		$this->assert_same( 'pikachu', $search['query'] );
		$this->assert_same( 'ready', $create['status'] );
		$this->assert_same( 'route-dependency-test', $create['idempotency_key'] );
		$this->assert_same( 'disabled', $locked['status'] );
		$this->assert_true( $locked['route_connected_writes_deferred'] );
	}

	public function test_permission_factory_builds_expected_inventory_callback_types(): void {
		$callbacks = ( new InventoryRouteDependencyFactory(
			null,
			array(),
			static fn (): bool => true,
			null,
			true,
			null,
			null,
			null,
			$this->rate_limit_policy()
		) )->permission_callback_factory()->callbacks_for_contracts();

		$this->assert_true( $callbacks['POST /inventory'] instanceof InventoryCapabilityPermissionCallbackAdapter );
		$this->assert_true( $callbacks['GET /inventory/search'] instanceof InventoryPublicReadPermissionCallbackAdapter );
	}

	public function test_public_read_routes_enabled_without_limiter_reports_blocked_state(): void {
		$summary = ( new InventoryRouteDependencyFactory(
			null,
			$this->handlers_for_staged_routes(),
			static fn (): bool => true,
			null,
			true
		) )->readiness_summary();

		$this->assert_false( $summary['configured'] );
		$this->assert_true( $summary['public_read_permission_callbacks_configured'] );
		$this->assert_false( $summary['public_rate_limiter_configured'] );
		$this->assert_true(
			in_array(
				'inventory_public_rate_limiter_not_configured',
				$summary['configuration_issues'],
				true
			)
		);
	}

	public function test_registrar_uses_injected_dependencies_for_future_ready_inventory_routes(): void {
		$calls   = array();
		$factory = new InventoryRouteDependencyFactory(
			null,
			$this->handlers_for_staged_routes(),
			static fn (): bool => true,
			static function ( string $route_namespace, string $route, array $args ) use ( &$calls ): bool {
				$calls[] = array(
					'namespace' => $route_namespace,
					'route'     => $route,
					'args'      => $args,
				);

				return true;
			},
			true
		);

		$this->assert_same( 1, $factory->registrar()->register_enabled_routes( $this->future_enabled_search_route() ) );
		$this->assert_same( 1, count( $calls ) );
		$this->assert_same( '/inventory/search', $calls[0]['route'] );
		$this->assert_same( 'GET', $calls[0]['args']['methods'] );
		$this->assert_true( is_callable( $calls[0]['args']['callback'] ) );
		$this->assert_true( is_callable( $calls[0]['args']['permission_callback'] ) );
	}

	public function test_runtime_enabled_staff_search_contract_registers_when_dependencies_are_ready(): void {
		$calls           = array();
		$route_contracts = ( new InventoryRouteRuntimeConfigurator() )->route_contracts(
			array( 'staff_search_route_enabled' => true )
		);
		$factory         = new InventoryRouteDependencyFactory(
			null,
			$this->handlers_for_staged_routes(),
			static fn ( string $capability ): bool => 'view_inventory' === $capability,
			static function ( string $route_namespace, string $route, array $args ) use ( &$calls ): bool {
				$calls[] = array(
					'namespace' => $route_namespace,
					'route'     => $route,
					'args'      => $args,
				);

				return true;
			},
			false,
			null,
			null,
			$route_contracts
		);
		$summary         = $factory->readiness_summary();
		$bootstrap       = $factory->bootstrapper()->bootstrap( true );

		$this->assert_same( 1, $summary['registerable_route_count'] );
		$this->assert_same( array( 'GET /inventory/search' ), $summary['registerable_route_keys'] );
		$this->assert_same( 'ready', $bootstrap['status'] );
		$this->assert_same( 1, $bootstrap['registered_route_count'] );
		$this->assert_same( array( 'GET /inventory/search' ), $bootstrap['registered_route_keys'] );
		$this->assert_same( 1, count( $calls ) );
		$this->assert_same( '/inventory/search', $calls[0]['route'] );
		$this->assert_same( 'GET', $calls[0]['args']['methods'] );
	}

	public function test_runtime_enabled_staff_create_contract_registers_when_dependencies_are_ready(): void {
		$calls           = array();
		$route_contracts = ( new InventoryRouteRuntimeConfigurator() )->route_contracts(
			array( 'staff_create_route_enabled' => true )
		);
		$factory         = new InventoryRouteDependencyFactory(
			null,
			$this->handlers_for_staged_routes(),
			static fn ( string $capability ): bool => 'create_inventory' === $capability,
			static function ( string $route_namespace, string $route, array $args ) use ( &$calls ): bool {
				$calls[] = array(
					'namespace' => $route_namespace,
					'route'     => $route,
					'args'      => $args,
				);

				return true;
			},
			false,
			null,
			null,
			$route_contracts
		);
		$summary         = $factory->readiness_summary();
		$bootstrap       = $factory->bootstrapper()->bootstrap( true );

		$this->assert_same( 1, $summary['registerable_route_count'] );
		$this->assert_same( array( 'POST /inventory' ), $summary['registerable_route_keys'] );
		$this->assert_true( $summary['route_connected_reads_deferred'] );
		$this->assert_true( $summary['route_connected_writes_deferred'] );
		$this->assert_same( 'ready', $bootstrap['status'] );
		$this->assert_same( 1, $bootstrap['registered_route_count'] );
		$this->assert_same( array( 'POST /inventory' ), $bootstrap['registered_route_keys'] );
		$this->assert_same( 1, count( $calls ) );
		$this->assert_same( '/inventory', $calls[0]['route'] );
		$this->assert_same( 'POST', $calls[0]['args']['methods'] );
	}

	public function test_dependency_status_presenter_reports_blocked_and_ready_states(): void {
		$blocked = ( new InventoryRouteDependencyStatusPresenter() )->health_payload();
		$ready   = ( new InventoryRouteDependencyStatusPresenter(
			new InventoryRouteDependencyFactory(
				null,
				$this->handlers_for_staged_routes(),
				static fn (): bool => true,
				null,
				true,
				null,
				null,
				null,
				$this->rate_limit_policy()
			)
		) )->admin_summary();

		$this->assert_same( 'blocked', $blocked['status'] );
		$this->assert_same( 'ready', $ready['status'] );
		$this->assert_contains( 'handlers 2 / 2', $ready['value'] );
		$this->assert_contains( 'public reads enabled', $ready['value'] );
	}

	/**
	 * @return array<string, callable(OfflineRestRequestData): array<string, mixed>>
	 */
	private function handlers_for_staged_routes(): array {
		return array(
			'search_inventory_items' => static function ( OfflineRestRequestData $data ): array {
				return array(
					'status' => 'ready',
					'query'  => (string) ( $data->query_params()['q'] ?? '' ),
				);
			},
			'create_inventory_item'  => static function ( OfflineRestRequestData $data ): array {
				return array(
					'status'          => 'ready',
					'idempotency_key' => (string) $data->idempotency_key(),
				);
			},
		);
	}

	private function rate_limit_policy(): InventoryPublicReadRateLimitPolicy {
		$store = array();

		return new InventoryPublicReadRateLimitPolicy(
			60,
			60,
			static function ( string $key ) use ( &$store ): mixed {
				return $store[ $key ] ?? false;
			},
			static function ( string $key, array $state, int $ttl ) use ( &$store ): bool {
				unset( $ttl );

				$store[ $key ] = $state;

				return true;
			},
			static fn (): int => 1000
		);
	}

	/**
	 * @return list<array<string, mixed>>
	 */
	private function future_enabled_search_route(): array {
		$routes = InventoryRouteContracts::route_contracts();

		foreach ( $routes as $index => $route ) {
			$is_target                                       = '/inventory/search' === $route['path']
				&& 'GET' === $route['method'];
			$routes[ $index ]['live_enabled_by_default']     = $is_target;
			$routes[ $index ]['route_registration_deferred'] = ! $is_target;
			$routes[ $index ]['route_connected_reads_deferred'] = ! $is_target;
		}

		return $routes;
	}
}
