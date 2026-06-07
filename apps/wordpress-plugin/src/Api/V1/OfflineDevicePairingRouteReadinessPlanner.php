<?php
/**
 * Staged readiness summary for the offline device pairing route.
 *
 * @package TCGStorePlatform
 */

namespace TCGStorePlatform\Api\V1;

use TCGStorePlatform\Offline\OfflineDevicePairingPermissionCallbackAdapter;

final class OfflineDevicePairingRouteReadinessPlanner {
	private const ROUTE_KEY = 'POST /offline/devices/register';

	public function __construct(
		private ?OfflineDeviceRegistrationRouteHandler $registration_handler = null,
		private ?OfflineDevicePairingPermissionCallbackAdapter $permission_callback = null
	) {
	}

	/**
	 * @return array<string, mixed>
	 */
	public function plan( bool $offline_feature_enabled = false ): array {
		$route_plans = $this->route_plans();
		$route_plan  = $route_plans[ self::ROUTE_KEY ] ?? array();
		$bootstrap   = ( new OfflineRouteBootstrapPlanner() )->plan_from_registration_args(
			$offline_feature_enabled,
			$route_plans
		);

		return array(
			'route_key'                    => self::ROUTE_KEY,
			'feature_enabled'              => true === $bootstrap['feature_enabled'],
			'status'                       => $this->status_from_bootstrap( $bootstrap ),
			'registration_deferred'        => true !== $bootstrap['should_register_routes'],
			'handler_injected'             => null !== $this->registration_handler,
			'authorizer_configured'        => null !== $this->permission_callback
				&& $this->permission_callback->is_configured(),
			'permission_callback_ready'    => true === ( $route_plan['permission_callback_ready'] ?? false ),
			'controller_callback_ready'    => true === ( $route_plan['controller_callback_ready'] ?? false ),
			'live_enabled_by_default'      => true === ( $route_plan['live_enabled_by_default'] ?? false ),
			'should_register'              => true === ( $route_plan['should_register'] ?? false ),
			'registration_block_reasons'   => $this->list_values(
				$route_plan['registration_block_reasons'] ?? array()
			),
			'bootstrap_block_reasons'      => $this->list_values( $bootstrap['bootstrap_block_reasons'] ?? array() ),
			'registerable_route_count'     => (int) $bootstrap['registerable_route_count'],
			'registered_device_dependency' => 'not_required_for_pairing',
		);
	}

	/**
	 * @return array<string, array<string, mixed>>
	 */
	private function route_plans(): array {
		return ( new OfflineRouteRegistrationPlanner(
			new OfflineRoutePermissionCallbackFactory( null, null, $this->permission_callback ),
			new OfflineController(
				null,
				null !== $this->registration_handler
					? $this->registration_handler->handlers()
					: array()
			)
		) )->planned_registration_args( $this->pairing_route_contracts() );
	}

	/**
	 * @return list<array<string, mixed>>
	 */
	private function pairing_route_contracts(): array {
		foreach ( OfflineRouteContracts::route_contracts() as $route_contract ) {
			if ( '/offline/devices/register' === ( $route_contract['path'] ?? '' ) ) {
				return array( $route_contract );
			}
		}

		return array();
	}

	/**
	 * @param array<string, mixed> $bootstrap Bootstrap plan.
	 */
	private function status_from_bootstrap( array $bootstrap ): string {
		if ( true === ( $bootstrap['should_register_routes'] ?? false ) ) {
			return 'ready';
		}

		if ( true !== ( $bootstrap['feature_enabled'] ?? false ) ) {
			return 'blocked';
		}

		return 'gated';
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
