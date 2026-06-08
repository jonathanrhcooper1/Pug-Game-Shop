<?php
/**
 * Staged inventory route dependency assembly.
 *
 * @package TCGStorePlatform
 */

namespace TCGStorePlatform\Api\V1;

use TCGStorePlatform\Settings\InventoryRouteRuntimeSettings;

final class InventoryRouteDependencyFactory {
	private const HANDLER_CALLBACKS = array(
		'search_inventory_items',
		'create_inventory_item',
	);

	private mixed $capability_checker;
	private mixed $register_route_callback;

	/**
	 * @param array<string, callable(OfflineRestRequestData): array<string, mixed>> $handlers Route handlers.
	 * @param callable(string): bool|null                                            $capability_checker Capability checker.
	 * @param callable(string, string, array<string, mixed>): mixed|null             $register_route_callback Route registrar.
	 */
	public function __construct(
		private ?OfflineRestRequestAdapter $request_adapter = null,
		private array $handlers = array(),
		?callable $capability_checker = null,
		?callable $register_route_callback = null,
		private bool $public_read_routes_enabled = false,
		private ?InventorySearchRouteHandlerFactory $search_handler_factory = null,
		private ?InventoryIntakeRouteHandlerFactory $intake_handler_factory = null,
		private ?array $route_contracts = null,
		private ?InventoryPublicReadRateLimitPolicy $public_read_rate_limit_policy = null
	) {
		$this->capability_checker      = $capability_checker;
		$this->register_route_callback = $register_route_callback;
	}

	/**
	 * @param array<string, mixed> $settings Full platform settings.
	 * @param callable(string): bool|null $capability_checker Capability checker.
	 * @param callable(string, string, array<string, mixed>): mixed|null $register_route_callback Route registrar.
	 */
	public static function from_settings(
		array $settings,
		?callable $capability_checker = null,
		?callable $register_route_callback = null
	): self {
		return self::from_runtime_settings(
			InventoryRouteRuntimeSettings::from_settings( $settings ),
			$capability_checker,
			$register_route_callback
		);
	}

	/**
	 * @param array<string, mixed> $runtime_settings Runtime route settings.
	 * @param callable(string): bool|null $capability_checker Capability checker.
	 * @param callable(string, string, array<string, mixed>): mixed|null $register_route_callback Route registrar.
	 */
	public static function from_runtime_settings(
		array $runtime_settings,
		?callable $capability_checker = null,
		?callable $register_route_callback = null
	): self {
		$configurator = new InventoryRouteRuntimeConfigurator();
		$settings     = InventoryRouteRuntimeSettings::sanitize( $runtime_settings );

		return new self(
			null,
			array(),
			$capability_checker,
			$register_route_callback,
			$configurator->public_read_routes_enabled( $settings ),
			new InventorySearchRouteHandlerFactory( null, $configurator->route_connected_reads_enabled( $settings ) ),
			new InventoryIntakeRouteHandlerFactory( null, $configurator->route_connected_writes_enabled( $settings ) ),
			$configurator->route_contracts( $settings ),
			InventoryPublicReadRateLimitPolicy::for_wordpress_transients()
		);
	}

	public function controller(): InventoryController {
		return new InventoryController(
			$this->request_adapter,
			$this->handlers()
		);
	}

	public function permission_callback_factory(): InventoryRoutePermissionCallbackFactory {
		return new InventoryRoutePermissionCallbackFactory(
			$this->capability_checker,
			$this->public_read_routes_enabled,
			$this->public_read_rate_limit_policy
		);
	}

	public function registration_planner(): InventoryRouteRegistrationPlanner {
		return new InventoryRouteRegistrationPlanner(
			$this->permission_callback_factory(),
			$this->controller(),
			$this->route_contracts()
		);
	}

	public function registrar(): InventoryRouteRegistrar {
		return new InventoryRouteRegistrar(
			$this->registration_planner(),
			is_callable( $this->register_route_callback ) ? $this->register_route_callback : null
		);
	}

	public function bootstrapper(): InventoryRouteBootstrapper {
		return new InventoryRouteBootstrapper(
			$this->bootstrap_status_presenter(),
			function ( ?array $route_contracts, array $payload ): array {
				$registered_count = $this->registrar()->register_enabled_routes( $route_contracts );
				$route_keys       = array_slice(
					$this->list_values( $payload['registerable_route_keys'] ?? array() ),
					0,
					$registered_count
				);

				return array_fill_keys( $route_keys, array( 'registered' => true ) );
			}
		);
	}

	public function bootstrap_status_presenter(): InventoryRouteBootstrapStatusPresenter {
		return new InventoryRouteBootstrapStatusPresenter(
			new InventoryRouteBootstrapPlanner( $this->registration_planner() )
		);
	}

	/**
	 * @return array<string, callable(OfflineRestRequestData): array<string, mixed>>
	 */
	public function handlers(): array {
		$search_handlers = $this->search_handler_factory()->handlers();
		$intake_handlers = $this->intake_handler_factory()->handlers();

		return array_intersect_key(
			array_filter( array_merge( $search_handlers, $intake_handlers, $this->handlers ), 'is_callable' ),
			array_flip( self::HANDLER_CALLBACKS )
		);
	}

	public function is_configured(): bool {
		return true === $this->readiness_summary()['configured'];
	}

	/**
	 * @return array<string, mixed>
	 */
	public function readiness_summary(): array {
		$route_contracts          = $this->route_contracts();
		$route_plans              = $this->registration_planner()->planned_registration_args( $route_contracts );
		$permission_callbacks     = $this->permission_callback_factory()->callbacks_for_contracts( $route_contracts );
		$capability_route_keys    = array_keys( InventoryRoutePermissionCallbackFactory::capability_map( $route_contracts ) );
		$public_read_route_keys   = InventoryRoutePermissionCallbackFactory::public_read_route_keys( $route_contracts );
		$rate_limited_route_keys  = InventoryRoutePermissionCallbackFactory::public_rate_limited_route_keys( $route_contracts );
		$handler_keys             = array_keys( $this->handlers() );
		$registerable_route_keys  = array_keys(
			array_filter(
				$route_plans,
				static fn ( array $route_plan ): bool => true === $route_plan['should_register']
			)
		);
		$search_summary           = $this->search_handler_factory_summary();
		$intake_summary           = $this->intake_handler_factory_summary();
		$capability_configured    = $this->all_keys_present( $capability_route_keys, $permission_callbacks );
		$public_callbacks_present = $this->all_keys_present( $public_read_route_keys, $permission_callbacks );
		$rate_limiter_configured  = $this->permission_callback_factory()->public_rate_limiter_configured();
		$handlers_configured      = $this->all_keys_present( self::HANDLER_CALLBACKS, array_fill_keys( $handler_keys, true ) );
		$issues                   = array();

		if ( ! $handlers_configured ) {
			$issues[] = 'inventory_route_handlers_not_configured';
		}

		if ( ! $capability_configured ) {
			$issues[] = 'inventory_capability_permission_callbacks_not_configured';
		}

		if ( ! $this->public_read_routes_enabled ) {
			$issues[] = 'inventory_public_read_routes_not_enabled';
		}

		if ( $this->public_read_routes_enabled && ! $rate_limiter_configured ) {
			$issues[] = 'inventory_public_rate_limiter_not_configured';
		}

		if ( ! $public_callbacks_present ) {
			$issues[] = 'inventory_public_read_permission_callbacks_not_configured';
		}

		return array(
			'configured'                                   => array() === $issues,
			'route_dependency_factory_ready'               => true,
			'route_contract_count'                         => count( $route_contracts ),
			'staged_handler_route_count'                   => count( self::HANDLER_CALLBACKS ),
			'controller_ready'                             => method_exists( InventoryController::class, 'has_handler' ),
			'controller_handler_count'                     => count( $handler_keys ),
			'controller_handler_callbacks'                 => $handler_keys,
			'controller_handlers_configured'               => $handlers_configured,
			'permission_factory_ready'                     => true,
			'permission_callback_count'                    => count( $permission_callbacks ),
			'capability_permission_route_count'            => count( $capability_route_keys ),
			'capability_permission_callbacks_configured'   => $capability_configured,
			'public_read_route_count'                      => count( $public_read_route_keys ),
			'public_rate_limited_route_count'              => count( $rate_limited_route_keys ),
			'public_read_routes_enabled'                   => $this->public_read_routes_enabled,
			'public_rate_limiter_configured'               => $rate_limiter_configured,
			'public_read_permission_callbacks_configured'  => $public_callbacks_present,
			'registration_planner_ready'                   => method_exists( InventoryRouteRegistrationPlanner::class, 'planned_registration_args' ),
			'registrar_ready'                              => method_exists( InventoryRouteRegistrar::class, 'register_enabled_routes' ),
			'bootstrapper_ready'                           => method_exists( InventoryRouteBootstrapper::class, 'bootstrap_current_routes' ),
			'inventory_search_route_handler_factory_ready' => true === ( $search_summary['handler_factory_ready'] ?? false ),
			'inventory_search_route_handler_ready'         => true === ( $search_summary['route_connected_handler_ready'] ?? false ),
			'inventory_search_route_reads_deferred'        => true === ( $search_summary['route_connected_reads_deferred'] ?? true ),
			'inventory_search_route_dependency_issues'     => $this->list_values( $search_summary['configuration_issues'] ?? array() ),
			'inventory_intake_route_handler_factory_ready' => true === ( $intake_summary['handler_factory_ready'] ?? false ),
			'inventory_intake_route_handler_ready'         => true === ( $intake_summary['route_connected_handler_ready'] ?? false ),
			'inventory_intake_route_writes_deferred'       => true === ( $intake_summary['route_connected_writes_deferred'] ?? true ),
			'inventory_intake_route_dependency_issues'     => $this->list_values( $intake_summary['configuration_issues'] ?? array() ),
			'woocommerce_projection_planner_ready'         => true === ( $intake_summary['woocommerce_projection_planner_ready'] ?? false ),
			'square_inventory_projection_planner_ready'    => true === ( $intake_summary['square_inventory_projection_planner_ready'] ?? false ),
			'square_inventory_sync_request_planner_ready'  => true === ( $intake_summary['square_inventory_sync_request_planner_ready'] ?? false ),
			'external_projection_planning_deferred'        => true === ( $intake_summary['external_projection_planning_deferred'] ?? true ),
			'planned_route_count'                          => count( $route_plans ),
			'registerable_route_count'                     => count( $registerable_route_keys ),
			'registerable_route_keys'                      => $registerable_route_keys,
			'route_registration_deferred'                  => $this->any_route_flag( $route_plans, 'route_registration_deferred' ),
			'route_connected_reads_deferred'               => $this->any_route_flag( $route_plans, 'route_connected_reads_deferred' ),
			'route_connected_writes_deferred'              => $this->any_route_flag( $route_plans, 'route_connected_writes_deferred' ),
			'woocommerce_projection_deferred'              => true,
			'square_inventory_projection_deferred'         => true,
			'label_print_deferred'                         => true,
			'route_connected_reads_ready'                  => false,
			'route_connected_writes_ready'                 => false,
			'configuration_issues'                         => array_values( array_unique( $issues ) ),
		);
	}

	/**
	 * @return array<string, mixed>
	 */
	private function search_handler_factory_summary(): array {
		return $this->search_handler_factory()->readiness_summary();
	}

	/**
	 * @return array<string, mixed>
	 */
	private function intake_handler_factory_summary(): array {
		return $this->intake_handler_factory()->readiness_summary();
	}

	private function search_handler_factory(): InventorySearchRouteHandlerFactory {
		if ( null === $this->search_handler_factory ) {
			$this->search_handler_factory = new InventorySearchRouteHandlerFactory();
		}

		return $this->search_handler_factory;
	}

	private function intake_handler_factory(): InventoryIntakeRouteHandlerFactory {
		if ( null === $this->intake_handler_factory ) {
			$this->intake_handler_factory = new InventoryIntakeRouteHandlerFactory();
		}

		return $this->intake_handler_factory;
	}

	/**
	 * @return list<array<string, mixed>>
	 */
	private function route_contracts(): array {
		return $this->route_contracts ?? InventoryRouteContracts::route_contracts();
	}

	/**
	 * @param list<string>         $expected_keys Expected route keys.
	 * @param array<string, mixed> $values Current values.
	 */
	private function all_keys_present( array $expected_keys, array $values ): bool {
		if ( array() === $expected_keys ) {
			return true;
		}

		foreach ( $expected_keys as $expected_key ) {
			if ( ! array_key_exists( $expected_key, $values ) ) {
				return false;
			}
		}

		return true;
	}

	/**
	 * @param array<string, array<string, mixed>> $route_plans Route plans.
	 */
	private function any_route_flag( array $route_plans, string $flag ): bool {
		foreach ( $route_plans as $route_plan ) {
			if ( true === ( $route_plan[ $flag ] ?? false ) ) {
				return true;
			}
		}

		return false;
	}

	/**
	 * @return list<string>
	 */
	private function list_values( mixed $values ): array {
		if ( ! is_array( $values ) ) {
			return array();
		}

		return array_values(
			array_filter(
				array_map(
					static fn ( mixed $value ): string => ( is_array( $value ) || is_object( $value ) )
						? ''
						: trim( (string) $value ),
					$values
				),
				static fn ( string $value ): bool => '' !== $value
			)
		);
	}
}
