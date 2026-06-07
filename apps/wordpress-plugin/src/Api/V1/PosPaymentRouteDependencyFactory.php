<?php
/**
 * Staged POS/payment route dependency assembly.
 *
 * @package TCGStorePlatform
 */

namespace TCGStorePlatform\Api\V1;

final class PosPaymentRouteDependencyFactory {
	private const HANDLER_CALLBACKS = array(
		'ingest_pos_event',
		'get_pos_event_status',
		'run_pos_reconciliation',
		'list_pos_reconciliation_conflicts',
		'resolve_pos_reconciliation_conflict',
		'receive_payment_provider_webhook',
		'list_payment_fee_snapshots',
		'create_payment_fee_snapshot',
	);

	private mixed $capability_checker;
	private mixed $webhook_signature_verifier;
	private mixed $register_route_callback;

	/**
	 * @param array<string, callable(OfflineRestRequestData): array<string, mixed>> $handlers Route handlers.
	 * @param callable(string): bool|null                                            $capability_checker Capability checker.
	 * @param callable(mixed): bool|null                                             $webhook_signature_verifier Webhook verifier.
	 * @param callable(string, string, array<string, mixed>): mixed|null             $register_route_callback Route registrar.
	 */
	public function __construct(
		private ?OfflineRestRequestAdapter $request_adapter = null,
		private array $handlers = array(),
		?callable $capability_checker = null,
		?callable $webhook_signature_verifier = null,
		?callable $register_route_callback = null,
		private ?PosPaymentRouteValidationHandlerFactory $validation_handler_factory = null,
		private ?PosPaymentFeeSnapshotRouteHandlerFactory $fee_snapshot_handler_factory = null
	) {
		$this->capability_checker          = $capability_checker;
		$this->webhook_signature_verifier  = $webhook_signature_verifier;
		$this->register_route_callback     = $register_route_callback;
	}

	public function controller(): PosPaymentController {
		return new PosPaymentController(
			$this->request_adapter,
			$this->handlers()
		);
	}

	public function permission_callback_factory(): PosPaymentRoutePermissionCallbackFactory {
		return new PosPaymentRoutePermissionCallbackFactory(
			$this->capability_checker,
			$this->webhook_signature_verifier
		);
	}

	public function registration_planner(): PosPaymentRouteRegistrationPlanner {
		return new PosPaymentRouteRegistrationPlanner(
			$this->permission_callback_factory(),
			$this->controller()
		);
	}

	public function registrar(): PosPaymentRouteRegistrar {
		return new PosPaymentRouteRegistrar(
			$this->registration_planner(),
			is_callable( $this->register_route_callback ) ? $this->register_route_callback : null
		);
	}

	public function bootstrapper(): PosPaymentRouteBootstrapper {
		return new PosPaymentRouteBootstrapper(
			new PosPaymentRouteBootstrapStatusPresenter(
				new PosPaymentRouteBootstrapPlanner( $this->registration_planner() )
			),
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

	/**
	 * @return array<string, callable(OfflineRestRequestData): array<string, mixed>>
	 */
	public function handlers(): array {
		$handlers = array() === $this->handlers
			? $this->validation_handler_factory()->handlers()
			: $this->handlers;
		$fee_snapshot_handlers = null !== $this->fee_snapshot_handler_factory
			? $this->fee_snapshot_handler_factory->handlers()
			: array();

		return array_intersect_key(
			array_filter( array_merge( $handlers, $fee_snapshot_handlers ), 'is_callable' ),
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
		$route_contracts         = PosPaymentRouteContracts::route_contracts();
		$route_plans            = $this->registration_planner()->planned_registration_args( $route_contracts );
		$permission_callbacks   = $this->permission_callback_factory()->callbacks_for_contracts( $route_contracts );
		$validation_summary     = $this->validation_handler_factory()->readiness_summary();
		$fee_snapshot_summary   = $this->fee_snapshot_handler_factory_summary();
		$capability_route_keys  = array_keys( PosPaymentRoutePermissionCallbackFactory::capability_map( $route_contracts ) );
		$webhook_route_keys     = PosPaymentRoutePermissionCallbackFactory::webhook_route_keys( $route_contracts );
		$handler_keys           = array_keys( $this->handlers() );
		$registerable_route_keys = array_keys(
			array_filter(
				$route_plans,
				static fn ( array $route_plan ): bool => true === $route_plan['should_register']
			)
		);
		$capability_callbacks_configured = $this->all_keys_present( $capability_route_keys, $permission_callbacks );
		$webhook_callbacks_configured    = $this->all_keys_present( $webhook_route_keys, $permission_callbacks );
		$handlers_configured             = count( self::HANDLER_CALLBACKS ) === count( $handler_keys );
		$issues                          = array();

		if ( ! $handlers_configured ) {
			$issues[] = 'pos_payment_route_handlers_not_configured';
		}

		if ( ! $capability_callbacks_configured ) {
			$issues[] = 'pos_payment_capability_permission_callbacks_not_configured';
		}

		if ( ! is_callable( $this->webhook_signature_verifier ) ) {
			$issues[] = 'pos_payment_webhook_signature_verifier_not_configured';
		}

		return array(
			'configured'                                      => array() === $issues,
			'route_dependency_factory_ready'                  => true,
			'route_contract_count'                            => count( $route_contracts ),
			'controller_ready'                                => method_exists( PosPaymentController::class, 'has_handler' ),
			'controller_handler_count'                        => count( $handler_keys ),
			'controller_handler_callbacks'                    => $handler_keys,
			'controller_handlers_configured'                  => $handlers_configured,
			'permission_factory_ready'                        => true,
			'permission_callback_count'                       => count( $permission_callbacks ),
			'capability_permission_route_count'               => count( $capability_route_keys ),
			'capability_permission_callbacks_configured'      => $capability_callbacks_configured,
			'webhook_route_count'                             => count( $webhook_route_keys ),
			'webhook_signature_verifier_configured'           => is_callable( $this->webhook_signature_verifier ),
			'webhook_permission_callbacks_configured'         => $webhook_callbacks_configured,
			'registration_planner_ready'                      => method_exists( PosPaymentRouteRegistrationPlanner::class, 'planned_registration_args' ),
			'registrar_ready'                                 => method_exists( PosPaymentRouteRegistrar::class, 'register_enabled_routes' ),
			'bootstrapper_ready'                              => method_exists( PosPaymentRouteBootstrapper::class, 'bootstrap_current_routes' ),
			'parser_validation_factory_ready'                 => true === ( $validation_summary['parser_validation_factory_ready'] ?? false ),
			'fee_snapshot_query_planner_ready'                => true === ( $validation_summary['fee_snapshot_query_planner_ready'] ?? false ),
			'fee_snapshot_query_builder_ready'                => true === ( $validation_summary['fee_snapshot_query_builder_ready'] ?? false ),
			'fee_snapshot_repository_configured'              => true === ( $validation_summary['fee_snapshot_repository_configured'] ?? false ),
			'fee_snapshot_repository_adapter_ready'           => true === ( $validation_summary['fee_snapshot_repository_adapter_ready'] ?? false ),
			'fee_snapshot_repository_deferred'                => true,
			'fee_snapshot_route_connected_reads_deferred'     => true === ( $fee_snapshot_summary['route_connected_reads_deferred'] ?? true ),
			'fee_snapshot_route_handler_factory_ready'        => true === ( $fee_snapshot_summary['handler_factory_ready'] ?? false ),
			'fee_snapshot_route_execution_enabled'            => true === ( $fee_snapshot_summary['route_connected_reads_enabled'] ?? false ),
			'fee_snapshot_route_handler_ready'                => true === ( $fee_snapshot_summary['route_connected_handler_ready'] ?? false ),
			'fee_snapshot_route_handler_deferred'             => true === ( $fee_snapshot_summary['route_connected_handler_deferred'] ?? true ),
			'fee_snapshot_route_database_configured'          => true === ( $fee_snapshot_summary['database_configured'] ?? false ),
			'fee_snapshot_route_dependency_issues'            => $this->list_values( $fee_snapshot_summary['configuration_issues'] ?? array() ),
			'planned_route_count'                             => count( $route_plans ),
			'registerable_route_count'                        => count( $registerable_route_keys ),
			'registerable_route_keys'                         => $registerable_route_keys,
			'route_registration_deferred'                     => true,
			'route_connected_reads_deferred'                  => $this->any_route_flag( $route_plans, 'route_connected_reads_deferred' ),
			'route_connected_writes_deferred'                 => true,
			'transaction_execution_deferred'                  => true,
			'provider_capture_deferred'                       => true,
			'provider_inventory_write_deferred'               => true,
			'webhook_registration_deferred'                   => true,
			'woocommerce_gateway_capture_deferred'            => true,
			'route_connected_reads_ready'                     => false,
			'route_connected_writes_ready'                    => false,
			'configuration_issues'                            => array_values( array_unique( $issues ) ),
		);
	}

	/**
	 * @return array<string, mixed>
	 */
	private function fee_snapshot_handler_factory_summary(): array {
		if ( null === $this->fee_snapshot_handler_factory ) {
			return array(
				'handler_factory_ready'            => false,
				'route_connected_reads_enabled'    => false,
				'route_connected_handler_ready'    => false,
				'route_connected_handler_deferred' => true,
				'database_configured'              => false,
				'configuration_issues'             => array(),
			);
		}

		return $this->fee_snapshot_handler_factory->readiness_summary();
	}

	private function validation_handler_factory(): PosPaymentRouteValidationHandlerFactory {
		if ( null === $this->validation_handler_factory ) {
			$this->validation_handler_factory = new PosPaymentRouteValidationHandlerFactory();
		}

		return $this->validation_handler_factory;
	}

	/**
	 * @param list<string>          $expected_keys Expected route keys.
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
