<?php
/**
 * Authenticated platform health endpoint.
 *
 * @package TCGStorePlatform
 */

namespace TCGStorePlatform\Api\V1;

use TCGStorePlatform\Bootstrap\DependencyChecker;
use TCGStorePlatform\FeatureFlags\FeatureFlagRegistry;
use TCGStorePlatform\FeatureFlags\FeatureFlags;
use TCGStorePlatform\Migrations\MigrationRunner;
use TCGStorePlatform\Offline\OfflineDevicePairingAuthorizerFactory;
use TCGStorePlatform\Offline\OfflineRegisteredDevicePermissionResolverFactory;
use TCGStorePlatform\Scheduler\DailyScheduler;
use TCGStorePlatform\Version;
use TCGStorePlatform\WooCommerce\Compatibility;

final class HealthController {
	private const NAMESPACE = 'tcg-store/v1';

	private DailyScheduler $scheduler;

	public function __construct( DailyScheduler $scheduler ) {
		$this->scheduler = $scheduler;
	}

	public function register(): void {
		add_action( 'rest_api_init', array( $this, 'register_routes' ) );
	}

	public function register_routes(): void {
		foreach ( self::route_contracts() as $route ) {
			register_rest_route(
				$route['namespace'],
				$route['path'],
				array(
					'methods'             => self::rest_method( $route['method'] ),
					'callback'            => array( $this, $route['callback'] ),
					'permission_callback' => array( $this, 'can_view_health' ),
				)
			);
		}
	}

	/**
	 * @return list<array{namespace:string,path:string,method:string,callback:string,permission:string}>
	 */
	public static function route_contracts(): array {
		return array(
			array(
				'namespace'  => self::NAMESPACE,
				'path'       => '/health',
				'method'     => 'GET',
				'callback'   => 'get_health',
				'permission' => 'authenticated',
			),
		);
	}

	public function can_view_health( \WP_REST_Request $request ): bool {
		unset( $request );

		return current_user_can( 'manage_settings' ) || current_user_can( 'view_reports' );
	}

	public function get_health( \WP_REST_Request $request ): \WP_REST_Response {
		unset( $request );

		$runner                     = new MigrationRunner();
		$dependencies               = DependencyChecker::status();
		$features                   = array();
		$overall                    = 'ok';
		$offline_feature_enabled    = FeatureFlags::is_enabled( 'offline_sync' );
		$pos_payments_enabled       = FeatureFlags::is_enabled( 'pos_payments' );
		$device_permission_factory  = new OfflineRegisteredDevicePermissionResolverFactory();
		$sync_handler_factory       = new OfflineRegisteredDeviceSyncRouteHandlerFactory();
		$offline                    = ( new OfflineRouteBootstrapStatusPresenter(
			new OfflineRouteBootstrapPlanner(
				new OfflineRouteRegistrationPlanner(
					new OfflineRoutePermissionCallbackFactory(
						$device_permission_factory->resolver()
					),
					$sync_handler_factory->controller()
				)
			)
		) )->health_payload(
			$offline_feature_enabled
		);
		$device_permissions         = ( new OfflineRegisteredDevicePermissionReadinessStatusPresenter(
			$device_permission_factory
		) )->health_payload();
		$sync_handlers              = ( new OfflineRegisteredDeviceSyncRouteReadinessStatusPresenter(
			$sync_handler_factory
		) )->health_payload();
		$pairing_authorizer_factory = new OfflineDevicePairingAuthorizerFactory();
		$pairing                    = ( new OfflineDevicePairingRouteReadinessStatusPresenter(
			new OfflineDevicePairingRouteReadinessPlanner(
				null,
				null,
				$pairing_authorizer_factory,
				new OfflineDeviceRegistrationRouteHandlerFactory( null, $pairing_authorizer_factory )
			)
		) )->health_payload(
			$offline_feature_enabled
		);
		$pos_payment_routes         = ( new PosPaymentRouteReadinessStatusPresenter() )->health_payload(
			$pos_payments_enabled
		);
		$pos_payment_bootstrap      = ( new PosPaymentRouteBootstrapStatusPresenter() )->health_payload(
			$pos_payments_enabled
		);
		$pos_payment_dependencies   = ( new PosPaymentRouteDependencyStatusPresenter(
			new PosPaymentRouteDependencyFactory()
		) )->health_payload();

		foreach ( $dependencies as $dependency ) {
			if ( 'blocked' === $dependency['status'] ) {
				$overall = 'blocked';
				break;
			}

			if ( 'degraded' === $dependency['status'] ) {
				$overall = 'degraded';
			}
		}

		if ( $runner->current_version() !== Version::DATABASE ) {
			$overall = 'blocked';
		}

		foreach ( FeatureFlagRegistry::definitions() as $flag => $definition ) {
			$features[ $flag ] = array(
				'enabled'   => FeatureFlags::is_enabled( $flag ),
				'available' => $definition['available'],
				'phase'     => $definition['phase'],
			);
		}

		return new \WP_REST_Response(
			array(
				'status'                                  => $overall,
				'version'                                 => Version::PLUGIN,
				'database'                                => array(
					'current' => $runner->current_version(),
					'target'  => Version::DATABASE,
				),
				'dependencies'                            => $dependencies,
				'scheduler'                               => $this->scheduler->status(),
				'hpos'                                    => Compatibility::hpos_status(),
				'features'                                => $features,
				'offline_route_bootstrap'                 => $offline,
				'offline_registered_device_permissions'   => $device_permissions,
				'offline_registered_device_sync_handlers' => $sync_handlers,
				'offline_device_pairing_route_readiness'  => $pairing,
				'pos_payment_route_readiness'             => $pos_payment_routes,
				'pos_payment_route_bootstrap'             => $pos_payment_bootstrap,
				'pos_payment_route_dependencies'          => $pos_payment_dependencies,
				'timestamp'                               => gmdate( 'c' ),
			),
			200
		);
	}

	private static function rest_method( string $method ): string {
		return match ( $method ) {
			'GET'   => \WP_REST_Server::READABLE,
			'POST'  => \WP_REST_Server::CREATABLE,
			default => $method,
		};
	}
}
