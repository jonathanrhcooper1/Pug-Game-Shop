<?php
/**
 * Planned REST route registration metadata for POS/payment routes.
 *
 * @package TCGStorePlatform
 */

namespace TCGStorePlatform\Api\V1;

final class PosPaymentRouteRegistrationPlanner {
	private const LOCKED_PERMISSION_CALLBACK = '__return_false';

	private ?PosPaymentRoutePermissionCallbackFactory $permission_callback_factory;
	private ?PosPaymentController $controller;

	public function __construct(
		?PosPaymentRoutePermissionCallbackFactory $permission_callback_factory = null,
		?PosPaymentController $controller = null
	) {
		$this->permission_callback_factory = $permission_callback_factory;
		$this->controller                  = $controller;
	}

	/**
	 * @param null|list<array<string, mixed>> $route_contracts Planned route contracts.
	 * @return array<string, array<string, mixed>>
	 */
	public function planned_registration_args( ?array $route_contracts = null ): array {
		$plans           = array();
		$route_contracts = $route_contracts ?? PosPaymentRouteContracts::route_contracts();

		foreach ( $route_contracts as $route_contract ) {
			$plans[ PosPaymentRoutePermissionCallbackFactory::route_key( $route_contract ) ] = $this->route_plan(
				$route_contract
			);
		}

		return $plans;
	}

	/**
	 * @param null|list<array<string, mixed>> $route_contracts Planned route contracts.
	 * @return list<array<string, mixed>>
	 */
	public function enabled_registration_args( ?array $route_contracts = null ): array {
		return array_values(
			array_filter(
				$this->planned_registration_args( $route_contracts ),
				static fn ( array $route_plan ): bool => true === $route_plan['should_register']
			)
		);
	}

	/**
	 * @param array<string, mixed> $route_contract Planned route contract.
	 * @return array<string, mixed>
	 */
	private function route_plan( array $route_contract ): array {
		$permission_callback = $this->permission_callback( $route_contract );
		$permission_ready    = ! is_string( $permission_callback ) && is_callable( $permission_callback );
		$controller_callback = $this->controller_callback( $route_contract );
		$controller_ready    = is_array( $controller_callback );

		return array(
			'namespace'                            => $this->route_value( $route_contract, 'namespace' ),
			'path'                                 => $this->route_value( $route_contract, 'path' ),
			'methods'                              => strtoupper( $this->route_value( $route_contract, 'method' ) ),
			'callback'                             => $this->route_value( $route_contract, 'callback' ),
			'controller_callback'                  => $controller_callback,
			'permission'                           => $this->route_value( $route_contract, 'permission' ),
			'workflow'                             => $this->route_value( $route_contract, 'workflow' ),
			'permission_callback'                  => $permission_callback,
			'permission_callback_ready'            => $permission_ready,
			'controller_callback_ready'            => $controller_ready,
			'live_enabled_by_default'              => true === ( $route_contract['live_enabled_by_default'] ?? false ),
			'route_registration_deferred'          => true === ( $route_contract['route_registration_deferred'] ?? true ),
			'route_connected_reads_deferred'       => true === ( $route_contract['route_connected_reads_deferred'] ?? true ),
			'route_connected_writes_deferred'      => true === ( $route_contract['route_connected_writes_deferred'] ?? true ),
			'webhook_registration_deferred'        => true === ( $route_contract['webhook_registration_deferred'] ?? true ),
			'transaction_execution_deferred'       => true === ( $route_contract['transaction_execution_deferred'] ?? true ),
			'provider_capture_deferred'            => true === ( $route_contract['provider_capture_deferred'] ?? true ),
			'provider_inventory_write_deferred'    => true === ( $route_contract['provider_inventory_write_deferred'] ?? true ),
			'woocommerce_gateway_capture_deferred' => true === ( $route_contract['woocommerce_gateway_capture_deferred'] ?? true ),
			'should_register'                      => $this->should_register(
				$route_contract,
				$permission_ready,
				$controller_ready
			),
			'registration_block_reasons'           => $this->registration_block_reasons(
				$route_contract,
				$permission_ready,
				$controller_ready
			),
		);
	}

	/**
	 * @param array<string, mixed> $route_contract Planned route contract.
	 * @return array{PosPaymentController, string}|null
	 */
	private function controller_callback( array $route_contract ): ?array {
		if ( null === $this->controller ) {
			return null;
		}

		$callback = $this->route_value( $route_contract, 'callback' );

		if ( '' === $callback || ! method_exists( $this->controller, $callback ) ) {
			return null;
		}

		if ( ! $this->controller->has_handler( $callback ) ) {
			return null;
		}

		return array( $this->controller, $callback );
	}

	/**
	 * @param array<string, mixed> $route_contract Planned route contract.
	 * @return callable|string
	 */
	private function permission_callback( array $route_contract ): callable|string {
		if ( null === $this->permission_callback_factory ) {
			return self::LOCKED_PERMISSION_CALLBACK;
		}

		$callback = $this->permission_callback_factory->callback_for_route_contract( $route_contract );

		if ( null === $callback ) {
			return self::LOCKED_PERMISSION_CALLBACK;
		}

		return $callback;
	}

	/**
	 * @param array<string, mixed> $route_contract Planned route contract.
	 */
	private function should_register(
		array $route_contract,
		bool $permission_ready,
		bool $controller_ready
	): bool {
		return array() === $this->registration_block_reasons(
			$route_contract,
			$permission_ready,
			$controller_ready
		);
	}

	/**
	 * @param array<string, mixed> $route_contract Planned route contract.
	 * @return list<string>
	 */
	private function registration_block_reasons(
		array $route_contract,
		bool $permission_ready,
		bool $controller_ready
	): array {
		$reasons = array();

		if ( true !== ( $route_contract['live_enabled_by_default'] ?? false ) ) {
			$reasons[] = 'route_disabled_by_default';
		}

		if ( true === ( $route_contract['route_registration_deferred'] ?? true ) ) {
			$reasons[] = 'route_registration_deferred';
		}

		if ( $this->is_read_route( $route_contract ) && true === ( $route_contract['route_connected_reads_deferred'] ?? true ) ) {
			$reasons[] = 'route_connected_reads_deferred';
		}

		if ( $this->is_write_route( $route_contract ) && true === ( $route_contract['route_connected_writes_deferred'] ?? true ) ) {
			$reasons[] = 'route_connected_writes_deferred';
		}

		if ( $this->is_webhook_route( $route_contract ) && true === ( $route_contract['webhook_registration_deferred'] ?? true ) ) {
			$reasons[] = 'webhook_registration_deferred';
		}

		if ( ! $permission_ready ) {
			$reasons[] = 'permission_callback_not_ready';
		}

		if ( ! $controller_ready ) {
			$reasons[] = 'controller_callback_not_ready';
		}

		return array_values( array_unique( $reasons ) );
	}

	/**
	 * @param array<string, mixed> $route_contract Planned route contract.
	 */
	private function is_write_route( array $route_contract ): bool {
		return 'GET' !== strtoupper( $this->route_value( $route_contract, 'method' ) );
	}

	/**
	 * @param array<string, mixed> $route_contract Planned route contract.
	 */
	private function is_read_route( array $route_contract ): bool {
		return 'GET' === strtoupper( $this->route_value( $route_contract, 'method' ) );
	}

	/**
	 * @param array<string, mixed> $route_contract Planned route contract.
	 */
	private function is_webhook_route( array $route_contract ): bool {
		return 'signed_provider_webhook' === strtolower( $this->route_value( $route_contract, 'permission' ) );
	}

	/**
	 * @param array<string, mixed> $route_contract Planned route contract.
	 */
	private function route_value( array $route_contract, string $key ): string {
		return trim( (string) ( $route_contract[ $key ] ?? '' ) );
	}
}
