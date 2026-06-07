<?php
/**
 * Gated POS/payment route bootstrap planner.
 *
 * @package TCGStorePlatform
 */

namespace TCGStorePlatform\Api\V1;

final class PosPaymentRouteBootstrapPlanner {
	private PosPaymentRouteRegistrationPlanner $registration_planner;

	public function __construct( ?PosPaymentRouteRegistrationPlanner $registration_planner = null ) {
		$this->registration_planner = $registration_planner ?? new PosPaymentRouteRegistrationPlanner();
	}

	/**
	 * @param null|list<array<string, mixed>> $route_contracts Planned route contracts.
	 * @return array<string, mixed>
	 */
	public function plan( bool $pos_payments_feature_enabled, ?array $route_contracts = null ): array {
		return $this->plan_from_registration_args(
			$pos_payments_feature_enabled,
			$this->registration_planner->planned_registration_args( $route_contracts )
		);
	}

	/**
	 * @param array<string, array<string, mixed>> $route_plans Planned route registrations.
	 * @return array<string, mixed>
	 */
	public function plan_from_registration_args( bool $pos_payments_feature_enabled, array $route_plans ): array {
		$registerable_plans = array_filter(
			$route_plans,
			static fn ( array $route_plan ): bool => true === $route_plan['should_register']
		);
		$block_reasons      = $this->bootstrap_block_reasons(
			$pos_payments_feature_enabled,
			$registerable_plans
		);

		return array(
			'feature_enabled'            => $pos_payments_feature_enabled,
			'planned_route_count'        => count( $route_plans ),
			'registerable_route_count'   => count( $registerable_plans ),
			'should_register_routes'     => $pos_payments_feature_enabled && array() !== $registerable_plans,
			'bootstrap_block_reasons'    => $block_reasons,
			'registerable_route_keys'    => array_keys( $registerable_plans ),
			'route_registration_summary' => $this->route_registration_summary( $route_plans ),
		);
	}

	/**
	 * @param array<string, array<string, mixed>> $registerable_plans Registerable route plans.
	 * @return list<string>
	 */
	private function bootstrap_block_reasons( bool $pos_payments_feature_enabled, array $registerable_plans ): array {
		$reasons = array();

		if ( ! $pos_payments_feature_enabled ) {
			$reasons[] = 'pos_payments_feature_disabled';
		}

		if ( array() === $registerable_plans ) {
			$reasons[] = 'no_registerable_pos_payment_routes';
		}

		return $reasons;
	}

	/**
	 * @param array<string, array<string, mixed>> $route_plans Planned route registrations.
	 * @return array<string, array<string, mixed>>
	 */
	private function route_registration_summary( array $route_plans ): array {
		$summary = array();

		foreach ( $route_plans as $route_key => $route_plan ) {
			$summary[ $route_key ] = array(
				'namespace'                              => (string) $route_plan['namespace'],
				'path'                                   => (string) $route_plan['path'],
				'methods'                                => (string) $route_plan['methods'],
				'callback'                               => (string) $route_plan['callback'],
				'permission'                             => (string) $route_plan['permission'],
				'workflow'                               => (string) $route_plan['workflow'],
				'permission_callback_ready'              => true === $route_plan['permission_callback_ready'],
				'controller_callback_ready'              => true === $route_plan['controller_callback_ready'],
				'live_enabled_by_default'                => true === $route_plan['live_enabled_by_default'],
				'route_registration_deferred'            => true === $route_plan['route_registration_deferred'],
				'route_connected_reads_deferred'         => true === ( $route_plan['route_connected_reads_deferred'] ?? true ),
				'route_connected_writes_deferred'        => true === $route_plan['route_connected_writes_deferred'],
				'webhook_registration_deferred'          => true === $route_plan['webhook_registration_deferred'],
				'transaction_execution_deferred'         => true === $route_plan['transaction_execution_deferred'],
				'provider_capture_deferred'              => true === $route_plan['provider_capture_deferred'],
				'provider_inventory_write_deferred'      => true === $route_plan['provider_inventory_write_deferred'],
				'woocommerce_gateway_capture_deferred'   => true === $route_plan['woocommerce_gateway_capture_deferred'],
				'should_register'                        => true === $route_plan['should_register'],
				'registration_block_reasons'             => $this->list_values(
					$route_plan['registration_block_reasons'] ?? array()
				),
			);
		}

		return $summary;
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
