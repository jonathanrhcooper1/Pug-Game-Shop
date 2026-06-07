<?php
/**
 * Staged readiness summary for the offline device pairing route.
 *
 * @package TCGStorePlatform
 */

namespace TCGStorePlatform\Api\V1;

use TCGStorePlatform\Offline\OfflineDevicePairingAuthorizerFactory;
use TCGStorePlatform\Offline\OfflineDevicePairingPermissionCallbackAdapter;

final class OfflineDevicePairingRouteReadinessPlanner {
	private const ROUTE_KEY = 'POST /offline/devices/register';

	public function __construct(
		private ?OfflineDeviceRegistrationRouteHandler $registration_handler = null,
		private ?OfflineDevicePairingPermissionCallbackAdapter $permission_callback = null,
		private ?OfflineDevicePairingAuthorizerFactory $authorizer_factory = null
	) {
	}

	/**
	 * @return array<string, mixed>
	 */
	public function plan( bool $offline_feature_enabled = false ): array {
		$route_plans         = $this->route_plans();
		$route_plan          = $route_plans[ self::ROUTE_KEY ] ?? array();
		$permission_callback = $this->resolved_permission_callback();
		$policy_summary      = $this->policy_summary();
		$bootstrap           = ( new OfflineRouteBootstrapPlanner() )->plan_from_registration_args(
			$offline_feature_enabled,
			$route_plans
		);

		return array(
			'route_key'                    => self::ROUTE_KEY,
			'feature_enabled'              => true === $bootstrap['feature_enabled'],
			'status'                       => $this->status_from_bootstrap( $bootstrap ),
			'registration_deferred'        => true !== $bootstrap['should_register_routes'],
			'handler_injected'             => null !== $this->registration_handler,
			'authorizer_configured'        => null !== $permission_callback
				&& $permission_callback->is_configured(),
			'policy_configured'            => true === $policy_summary['configured'],
			'policy_summary'               => $policy_summary,
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
			new OfflineRoutePermissionCallbackFactory( null, null, $this->resolved_permission_callback() ),
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

	private function resolved_permission_callback(): ?OfflineDevicePairingPermissionCallbackAdapter {
		if ( null !== $this->permission_callback ) {
			return $this->permission_callback;
		}

		if ( null === $this->authorizer_factory || ! $this->authorizer_factory->is_policy_configured() ) {
			return null;
		}

		return $this->authorizer_factory->permission_callback();
	}

	/**
	 * @return array<string, mixed>
	 */
	private function policy_summary(): array {
		if ( null === $this->authorizer_factory ) {
			return array(
				'configured'                  => null !== $this->permission_callback
					&& $this->permission_callback->is_configured(),
				'pairing_code_hash_count'     => 0,
				'manager_count'               => 0,
				'location_count'              => 0,
				'configured_mode_count'       => 0,
				'configured_scope_count'      => 0,
				'expires_at_utc_configured'   => false,
				'policy_configuration_issues' => null !== $this->permission_callback
					&& $this->permission_callback->is_configured()
					? array()
					: array( 'policy_provider_not_configured' ),
			);
		}

		return $this->authorizer_factory->policy_summary();
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
