<?php
/**
 * Offline route bootstrap orchestration.
 *
 * @package TCGStorePlatform
 */

namespace TCGStorePlatform\Api\V1;

use TCGStorePlatform\FeatureFlags\FeatureFlags;
use TCGStorePlatform\Offline\OfflineDevicePairingAuthorizerFactory;
use TCGStorePlatform\Offline\OfflineRegisteredDevicePermissionResolverFactory;
use TCGStorePlatform\Settings\OfflineRouteRuntimeSettings;
use TCGStorePlatform\Settings\Settings;

final class OfflineRouteBootstrapper {
	/**
	 * @var callable(null|list<array<string, mixed>>, array<string, mixed>): array<string, mixed>
	 */
	private $registrar;

	private OfflineRouteBootstrapStatusPresenter $presenter;

	public function __construct(
		?OfflineRouteBootstrapStatusPresenter $presenter = null,
		?callable $registrar = null
	) {
		$this->presenter = $presenter ?? new OfflineRouteBootstrapStatusPresenter();
		$this->registrar = $registrar ?? static function ( ?array $route_contracts, array $payload ): array {
			$registered_count = ( new OfflineRouteRegistrar() )->register_enabled_routes( $route_contracts );
			$route_keys       = array_slice(
				self::list_values( $payload['registerable_route_keys'] ?? array() ),
				0,
				$registered_count
			);

			return array_fill_keys( $route_keys, array( 'registered' => true ) );
		};
	}

	public function register(): void {
		add_action( 'rest_api_init', array( $this, 'bootstrap_current_routes' ), 20 );
	}

	/**
	 * @return array<string, mixed>
	 */
	public function bootstrap_current_routes(): array {
		$settings        = Settings::all();
		$route_contracts = ( new OfflineRouteRuntimeConfigurator() )->route_contracts(
			OfflineRouteRuntimeSettings::from_settings( $settings )
		);
		$planner         = $this->runtime_registration_planner( $settings );
		$presenter       = new OfflineRouteBootstrapStatusPresenter(
			new OfflineRouteBootstrapPlanner( $planner )
		);

		return $this->bootstrap_from_payload(
			$presenter->health_payload(
				FeatureFlags::is_enabled( 'offline_sync' ),
				$route_contracts
			),
			$route_contracts,
			$this->registrar_from_route_registrar( new OfflineRouteRegistrar( $planner ) )
		);
	}

	/**
	 * @param null|list<array<string, mixed>> $route_contracts Planned route contracts.
	 * @return array<string, mixed>
	 */
	public function bootstrap( bool $offline_feature_enabled, ?array $route_contracts = null ): array {
		return $this->bootstrap_from_payload(
			$this->presenter->health_payload( $offline_feature_enabled, $route_contracts ),
			$route_contracts
		);
	}

	/**
	 * @param array<string, array<string, mixed>> $route_plans Planned route registrations.
	 * @return array<string, mixed>
	 */
	public function bootstrap_from_registration_args( bool $offline_feature_enabled, array $route_plans ): array {
		return $this->bootstrap_from_payload(
			$this->presenter->health_payload_from_registration_args( $offline_feature_enabled, $route_plans ),
			null
		);
	}

	/**
	 * @param array<string, mixed>             $payload Health payload.
	 * @param null|list<array<string, mixed>> $route_contracts Planned route contracts.
	 * @param callable|null                    $registrar Route registrar callback.
	 * @return array<string, mixed>
	 */
	private function bootstrap_from_payload(
		array $payload,
		?array $route_contracts,
		?callable $registrar = null
	): array {
		$registrar         = $registrar ?? $this->registrar;
		$registered_routes = array();

		if ( true === $payload['should_register_routes'] ) {
			$registered_routes = $registrar( $route_contracts, $payload );
			if ( ! is_array( $registered_routes ) ) {
				$registered_routes = array();
			}
		}

		return array(
			'status'                   => (string) $payload['status'],
			'feature_enabled'          => true === $payload['feature_enabled'],
			'should_register_routes'   => true === $payload['should_register_routes'],
			'planned_route_count'      => (int) $payload['planned_route_count'],
			'registerable_route_count' => (int) $payload['registerable_route_count'],
			'registered_route_count'   => count( $registered_routes ),
			'registered_route_keys'    => self::list_values( array_keys( $registered_routes ) ),
			'registration_deferred'    => true !== $payload['should_register_routes'],
			'bootstrap_block_reasons'  => self::list_values( $payload['bootstrap_block_reasons'] ?? array() ),
		);
	}

	/**
	 * @return callable(null|list<array<string, mixed>>, array<string, mixed>): array<string, mixed>
	 */
	private function registrar_from_route_registrar( OfflineRouteRegistrar $registrar ): callable {
		return static function ( ?array $contracts, array $route_payload ) use ( $registrar ): array {
			$registered_count = $registrar->register_enabled_routes( $contracts );
			$route_keys       = array_slice(
				self::list_values( $route_payload['registerable_route_keys'] ?? array() ),
				0,
				$registered_count
			);

			return array_fill_keys( $route_keys, array( 'registered' => true ) );
		};
	}

	/**
	 * @param array<string, mixed> $settings Platform settings.
	 */
	private function runtime_registration_planner( array $settings ): OfflineRouteRegistrationPlanner {
		$runtime_settings           = OfflineRouteRuntimeSettings::from_settings( $settings );
		$pairing_authorizer_factory = new OfflineDevicePairingAuthorizerFactory(
			static fn (): array => $settings
		);
		$pairing_handler_factory    = new OfflineDeviceRegistrationRouteHandlerFactory(
			null,
			$pairing_authorizer_factory
		);
		$pairing_handler            = $pairing_handler_factory->handler();
		$runtime_database           = $this->runtime_database();
		$pull_handler_factory       = new OfflinePullRouteHandlerFactory(
			route_connected_execution_enabled: true === $runtime_settings['pull_route_enabled']
		);
		$push_handler_factory       = new OfflinePushRouteHandlerFactory(
			server_snapshots_provider: true === $runtime_settings['push_route_enabled'] && null !== $runtime_database
				? new OfflinePushRouteServerSnapshotProvider( $runtime_database )
				: null,
			operation_options_provider: true === $runtime_settings['push_route_enabled']
				? new OfflinePushRouteOperationOptionsProvider()
				: null,
			route_connected_execution_enabled: true === $runtime_settings['push_route_enabled'],
			route_connected_canonical_mutation_execution_enabled: false
		);
		$sync_handler_factory       = new OfflineRegisteredDeviceSyncRouteHandlerFactory(
			pull_handler_factory: $pull_handler_factory,
			push_handler_factory: $push_handler_factory
		);
		$pairing_permission         = $pairing_authorizer_factory->is_policy_configured()
			? $pairing_authorizer_factory->permission_callback()
			: null;
		$conflict_handler_factory   = new OfflineConflictRouteHandlerFactory(
			route_connected_execution_enabled: true === $runtime_settings['conflict_routes_enabled']
		);
		$handlers                   = array_merge(
			$sync_handler_factory->handlers(),
			null !== $pairing_handler ? $pairing_handler->handlers() : array(),
			$conflict_handler_factory->handlers()
		);
		$device_permission_factory  = new OfflineRegisteredDevicePermissionResolverFactory();

		return new OfflineRouteRegistrationPlanner(
			new OfflineRoutePermissionCallbackFactory(
				$device_permission_factory->resolver(),
				null,
				$pairing_permission,
				static function ( mixed $request = null ): bool {
					unset( $request );

					return function_exists( 'current_user_can' ) && current_user_can( 'resolve_conflicts' );
				}
			),
			new OfflineController( null, $handlers )
		);
	}

	private function runtime_database(): ?\wpdb {
		global $wpdb;

		if ( ! class_exists( 'wpdb' ) || ! $wpdb instanceof \wpdb ) {
			return null;
		}

		return $wpdb;
	}

	/**
	 * @return list<string>
	 */
	private static function list_values( mixed $values ): array {
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
