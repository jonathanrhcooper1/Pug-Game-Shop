<?php
/**
 * Staged readiness summary for planned POS/payment routes.
 *
 * @package TCGStorePlatform
 */

namespace TCGStorePlatform\Api\V1;

final class PosPaymentRouteReadinessPlanner {
	private const DEFAULT_DEPENDENCIES = array(
		'route_handlers_configured'              => false,
		'permission_callbacks_configured'        => false,
		'route_transaction_executor_configured'  => false,
		'webhook_verifier_configured'            => false,
		'sandbox_provider_credentials_configured' => false,
		'production_provider_credentials_configured' => false,
		'provider_capture_enabled'               => false,
		'provider_inventory_writes_enabled'      => false,
		'woocommerce_gateway_capture_enabled'    => false,
	);

	/**
	 * @param null|list<array<string, mixed>> $route_contracts Planned route contracts.
	 * @param array<string, mixed>            $dependency_overrides Dependency readiness overrides for tests/staging.
	 * @return array<string, mixed>
	 */
	public function plan(
		bool $pos_payments_feature_enabled = false,
		?array $route_contracts = null,
		array $dependency_overrides = array()
	): array {
		$dependencies   = $this->dependencies( $dependency_overrides );
		$route_contracts = $route_contracts ?? PosPaymentRouteContracts::route_contracts();
		$route_plans    = array();

		foreach ( $route_contracts as $route_contract ) {
			$route_plan = $this->route_plan( $route_contract, $dependencies );
			$route_plans[ $route_plan['route_key'] ] = $route_plan;
		}

		$registerable_route_keys = array_keys(
			array_filter(
				$route_plans,
				static fn ( array $route_plan ): bool => true === $route_plan['should_register']
			)
		);
		$should_register_routes  = $pos_payments_feature_enabled && array() !== $registerable_route_keys;
		$block_reasons           = $this->readiness_block_reasons(
			$pos_payments_feature_enabled,
			$registerable_route_keys
		);

		return array(
			'feature_enabled'                         => $pos_payments_feature_enabled,
			'status'                                  => $this->status_from_plan(
				$pos_payments_feature_enabled,
				$should_register_routes
			),
			'planned_route_count'                     => count( $route_plans ),
			'registerable_route_count'                => count( $registerable_route_keys ),
			'should_register_routes'                  => $should_register_routes,
			'registration_deferred'                   => ! $should_register_routes,
			'route_readiness_block_reasons'           => $block_reasons,
			'registerable_route_keys'                 => $registerable_route_keys,
			'route_registration_summary'              => $route_plans,
			'route_handlers_configured'               => true === $dependencies['route_handlers_configured'],
			'permission_callbacks_configured'         => true === $dependencies['permission_callbacks_configured'],
			'route_transaction_executor_configured'   => true === $dependencies['route_transaction_executor_configured'],
			'webhook_verifier_configured'             => true === $dependencies['webhook_verifier_configured'],
			'sandbox_provider_credentials_configured' => true === $dependencies['sandbox_provider_credentials_configured'],
			'production_provider_credentials_configured' => true === $dependencies['production_provider_credentials_configured'],
			'provider_capture_enabled'                => true === $dependencies['provider_capture_enabled'],
			'provider_inventory_writes_enabled'       => true === $dependencies['provider_inventory_writes_enabled'],
			'woocommerce_gateway_capture_enabled'     => true === $dependencies['woocommerce_gateway_capture_enabled'],
			'route_registration_deferred'             => $this->any_route_flag( $route_plans, 'route_registration_deferred' ),
			'route_connected_writes_deferred'         => $this->any_route_flag( $route_plans, 'route_connected_writes_deferred' ),
			'transaction_execution_deferred'          => $this->any_route_flag( $route_plans, 'transaction_execution_deferred' ),
			'provider_capture_deferred'               => $this->any_route_flag( $route_plans, 'provider_capture_deferred' )
				|| true !== $dependencies['provider_capture_enabled'],
			'provider_inventory_write_deferred'       => $this->any_route_flag( $route_plans, 'provider_inventory_write_deferred' )
				|| true !== $dependencies['provider_inventory_writes_enabled'],
			'webhook_registration_deferred'           => $this->any_route_flag( $route_plans, 'webhook_registration_deferred' ),
			'woocommerce_gateway_capture_deferred'    => $this->any_route_flag( $route_plans, 'woocommerce_gateway_capture_deferred' )
				|| true !== $dependencies['woocommerce_gateway_capture_enabled'],
			'production_safety_ready'                 => true !== $dependencies['production_provider_credentials_configured']
				&& true !== $dependencies['provider_capture_enabled']
				&& true !== $dependencies['provider_inventory_writes_enabled']
				&& true !== $dependencies['woocommerce_gateway_capture_enabled'],
		);
	}

	/**
	 * @param array<string, mixed> $route_contract Planned route contract.
	 * @param array<string, bool>  $dependencies Dependency readiness flags.
	 * @return array<string, mixed>
	 */
	private function route_plan( array $route_contract, array $dependencies ): array {
		$method                  = strtoupper( $this->route_value( $route_contract, 'method' ) );
		$path                    = $this->route_value( $route_contract, 'path' );
		$is_write_workflow       = 'GET' !== $method;
		$is_webhook_workflow     = str_starts_with( $path, '/payments/webhooks/' );
		$registration_deferred   = true === ( $route_contract['route_registration_deferred'] ?? false );
		$route_writes_deferred   = true === ( $route_contract['route_connected_writes_deferred'] ?? false );
		$transaction_deferred    = true === ( $route_contract['transaction_execution_deferred'] ?? false );
		$webhook_deferred        = true === ( $route_contract['webhook_registration_deferred'] ?? false );
		$live_enabled_by_default = true === ( $route_contract['live_enabled_by_default'] ?? false );
		$block_reasons           = $this->route_block_reasons(
			$live_enabled_by_default,
			$registration_deferred,
			$is_write_workflow,
			$is_webhook_workflow,
			$route_writes_deferred,
			$transaction_deferred,
			$webhook_deferred,
			$dependencies
		);
		$safety_reasons          = $this->route_safety_reasons( $route_contract, $dependencies );

		return array(
			'route_key'                         => $method . ' ' . $path,
			'namespace'                         => $this->route_value( $route_contract, 'namespace' ),
			'path'                              => $path,
			'method'                            => $method,
			'methods'                           => $method,
			'callback'                          => $this->route_value( $route_contract, 'callback' ),
			'permission'                        => $this->route_value( $route_contract, 'permission' ),
			'workflow'                          => $this->route_value( $route_contract, 'workflow' ),
			'write_workflow'                    => $is_write_workflow,
			'webhook_workflow'                  => $is_webhook_workflow,
			'permission_callback_ready'         => true === $dependencies['permission_callbacks_configured'],
			'controller_callback_ready'         => true === $dependencies['route_handlers_configured'],
			'transaction_executor_ready'        => true === $dependencies['route_transaction_executor_configured'],
			'webhook_verifier_ready'            => true === $dependencies['webhook_verifier_configured'],
			'live_enabled_by_default'           => $live_enabled_by_default,
			'route_registration_deferred'       => $registration_deferred,
			'route_connected_writes_deferred'   => $route_writes_deferred,
			'transaction_execution_deferred'    => $transaction_deferred,
			'provider_capture_deferred'         => true === ( $route_contract['provider_capture_deferred'] ?? false ),
			'provider_inventory_write_deferred' => true === ( $route_contract['provider_inventory_write_deferred'] ?? false ),
			'webhook_registration_deferred'     => $webhook_deferred,
			'woocommerce_gateway_capture_deferred' => true === ( $route_contract['woocommerce_gateway_capture_deferred'] ?? false ),
			'should_register'                   => array() === $block_reasons,
			'registration_block_reasons'        => $block_reasons,
			'safety_block_reasons'              => $safety_reasons,
		);
	}

	/**
	 * @param array<string, bool> $dependencies Dependency readiness flags.
	 * @return list<string>
	 */
	private function route_block_reasons(
		bool $live_enabled_by_default,
		bool $registration_deferred,
		bool $is_write_workflow,
		bool $is_webhook_workflow,
		bool $route_writes_deferred,
		bool $transaction_deferred,
		bool $webhook_deferred,
		array $dependencies
	): array {
		$reasons = array();

		if ( ! $live_enabled_by_default ) {
			$reasons[] = 'route_disabled_by_default';
		}

		if ( $registration_deferred ) {
			$reasons[] = 'route_registration_deferred';
		}

		if ( true !== $dependencies['route_handlers_configured'] ) {
			$reasons[] = 'route_handlers_not_configured';
		}

		if ( true !== $dependencies['permission_callbacks_configured'] ) {
			$reasons[] = 'permission_callbacks_not_configured';
		}

		if ( $is_webhook_workflow && $webhook_deferred ) {
			$reasons[] = 'webhook_registration_deferred';
		}

		if ( $is_webhook_workflow && true !== $dependencies['webhook_verifier_configured'] ) {
			$reasons[] = 'webhook_verifier_not_configured';
		}

		if ( $is_write_workflow && $route_writes_deferred ) {
			$reasons[] = 'route_connected_writes_deferred';
		}

		if ( $is_write_workflow && $transaction_deferred ) {
			$reasons[] = 'transaction_execution_deferred';
		}

		if ( $is_write_workflow && true !== $dependencies['route_transaction_executor_configured'] ) {
			$reasons[] = 'route_transaction_executor_not_configured';
		}

		return array_values( array_unique( $reasons ) );
	}

	/**
	 * @param array<string, mixed> $route_contract Planned route contract.
	 * @param array<string, bool>  $dependencies Dependency readiness flags.
	 * @return list<string>
	 */
	private function route_safety_reasons( array $route_contract, array $dependencies ): array {
		$reasons = array();

		if (
			true === ( $route_contract['provider_capture_deferred'] ?? false )
			|| true !== $dependencies['provider_capture_enabled']
		) {
			$reasons[] = 'provider_capture_deferred';
		}

		if (
			true === ( $route_contract['provider_inventory_write_deferred'] ?? false )
			|| true !== $dependencies['provider_inventory_writes_enabled']
		) {
			$reasons[] = 'provider_inventory_write_deferred';
		}

		if (
			true === ( $route_contract['woocommerce_gateway_capture_deferred'] ?? false )
			|| true !== $dependencies['woocommerce_gateway_capture_enabled']
		) {
			$reasons[] = 'woocommerce_gateway_capture_deferred';
		}

		if ( true !== $dependencies['sandbox_provider_credentials_configured'] ) {
			$reasons[] = 'sandbox_provider_credentials_not_configured';
		}

		if ( true !== $dependencies['production_provider_credentials_configured'] ) {
			$reasons[] = 'production_provider_credentials_disabled';
		}

		return array_values( array_unique( $reasons ) );
	}

	/**
	 * @param array<string, mixed> $dependency_overrides Dependency readiness overrides.
	 * @return array<string, bool>
	 */
	private function dependencies( array $dependency_overrides ): array {
		$dependencies = self::DEFAULT_DEPENDENCIES;

		foreach ( $dependency_overrides as $key => $value ) {
			if ( array_key_exists( $key, $dependencies ) ) {
				$dependencies[ $key ] = true === $value;
			}
		}

		return $dependencies;
	}

	/**
	 * @param list<string> $registerable_route_keys Registerable route keys.
	 * @return list<string>
	 */
	private function readiness_block_reasons(
		bool $pos_payments_feature_enabled,
		array $registerable_route_keys
	): array {
		$reasons = array();

		if ( ! $pos_payments_feature_enabled ) {
			$reasons[] = 'pos_payments_feature_disabled';
		}

		if ( array() === $registerable_route_keys ) {
			$reasons[] = 'no_registerable_pos_payment_routes';
		}

		return $reasons;
	}

	private function status_from_plan( bool $feature_enabled, bool $should_register_routes ): string {
		if ( $should_register_routes ) {
			return 'ready';
		}

		if ( ! $feature_enabled ) {
			return 'blocked';
		}

		return 'gated';
	}

	/**
	 * @param array<string, array<string, mixed>> $route_plans Route readiness plans.
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
	 * @param array<string, mixed> $route_contract Planned route contract.
	 */
	private function route_value( array $route_contract, string $key ): string {
		return trim( (string) ( $route_contract[ $key ] ?? '' ) );
	}
}
