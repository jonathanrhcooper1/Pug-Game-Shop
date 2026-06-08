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
use TCGStorePlatform\Settings\OfflineRouteRuntimeSettings;
use TCGStorePlatform\Settings\Settings;
use TCGStorePlatform\ScryDex\ScryDexProviderFactory;
use TCGStorePlatform\ScryDex\ScryDexPersistenceRepositoryReadinessPlanner;
use TCGStorePlatform\ScryDex\ScryDexSyncCheckpointRepositoryPlanner;
use TCGStorePlatform\ScryDex\ScryDexSyncDryRunPlanner;
use TCGStorePlatform\ScryDex\ScryDexSyncExecutionGate;
use TCGStorePlatform\ScryDex\ScryDexUsageBudgetPlanner;
use TCGStorePlatform\Square\SquareInventoryBatchSyncReadinessPlanner;
use TCGStorePlatform\Square\SquareInventorySyncReadinessPlanner;
use TCGStorePlatform\Square\WooCommerceSquareExtensionStatus;
use TCGStorePlatform\Staging\StagingSafety;
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

		$settings                       = Settings::all();
		$runner                         = new MigrationRunner();
		$dependencies                   = DependencyChecker::status();
		$features                       = array();
		$overall                        = 'ok';
		$staging_safety                 = ( new StagingSafety() )->health_summary();
		$offline_feature_enabled        = FeatureFlags::is_enabled( 'offline_sync' );
		$pos_payments_enabled           = FeatureFlags::is_enabled( 'pos_payments' );
		$device_permission_factory      = new OfflineRegisteredDevicePermissionResolverFactory();
		$sync_handler_factory           = new OfflineRegisteredDeviceSyncRouteHandlerFactory();
		$pairing_authorizer_factory     = new OfflineDevicePairingAuthorizerFactory(
			static fn (): array => $settings
		);
		$pairing_handler_factory        = new OfflineDeviceRegistrationRouteHandlerFactory(
			null,
			$pairing_authorizer_factory
		);
		$pairing_handler                = $pairing_handler_factory->handler();
		$offline_handlers               = array_merge(
			$sync_handler_factory->handlers(),
			null !== $pairing_handler ? $pairing_handler->handlers() : array()
		);
		$pairing_permission             = $pairing_authorizer_factory->is_policy_configured()
			? $pairing_authorizer_factory->permission_callback()
			: null;
		$offline_route_contracts        = ( new OfflineRouteRuntimeConfigurator() )->route_contracts(
			OfflineRouteRuntimeSettings::from_settings( $settings )
		);
		$offline                        = ( new OfflineRouteBootstrapStatusPresenter(
			new OfflineRouteBootstrapPlanner(
				new OfflineRouteRegistrationPlanner(
					new OfflineRoutePermissionCallbackFactory(
						$device_permission_factory->resolver(),
						null,
						$pairing_permission
					),
					new OfflineController( null, $offline_handlers )
				)
			)
		) )->health_payload(
			$offline_feature_enabled,
			$offline_route_contracts
		);
		$offline_connector_manifest     = ( new OfflineConnectorManifestPlanner() )->plan( $settings );
		$device_permissions             = ( new OfflineRegisteredDevicePermissionReadinessStatusPresenter(
			$device_permission_factory
		) )->health_payload();
		$sync_handlers                  = ( new OfflineRegisteredDeviceSyncRouteReadinessStatusPresenter(
			$sync_handler_factory
		) )->health_payload();
		$pairing                        = ( new OfflineDevicePairingRouteReadinessStatusPresenter(
			new OfflineDevicePairingRouteReadinessPlanner(
				null,
				null,
				$pairing_authorizer_factory,
				$pairing_handler_factory,
				$offline_route_contracts
			)
		) )->health_payload(
			$offline_feature_enabled
		);
		$pos_payment_routes             = ( new PosPaymentRouteReadinessStatusPresenter() )->health_payload(
			$pos_payments_enabled
		);
		$pos_payment_bootstrap          = ( new PosPaymentRouteBootstrapStatusPresenter() )->health_payload(
			$pos_payments_enabled
		);
		$pos_payment_dependencies       = ( new PosPaymentRouteDependencyStatusPresenter(
			new PosPaymentRouteDependencyFactory()
		) )->health_payload();
		$woocommerce_square             = ( new WooCommerceSquareExtensionStatus() )->readiness_summary();
		$square_inventory_sync          = ( new SquareInventorySyncReadinessPlanner() )->plan();
		$square_inventory_batch_sync    = ( new SquareInventoryBatchSyncReadinessPlanner() )->plan();
		$inventory_factory              = InventoryRouteDependencyFactory::from_settings( $settings );
		$inventory_bootstrap            = $inventory_factory->bootstrap_status_presenter()->health_payload(
			FeatureFlags::is_enabled( 'inventory_pricing' )
		);
		$inventory_dependencies         = ( new InventoryRouteDependencyStatusPresenter(
			$inventory_factory
		) )->health_payload();
		$scrydex_factory                = new ScryDexProviderFactory( $settings );
		$scrydex                        = $scrydex_factory->readiness_summary();
		$scrydex_dry_run_planner        = new ScryDexSyncDryRunPlanner( $scrydex_factory );
		$scrydex_sync_dry_run           = $scrydex_dry_run_planner->plan_cards_sync();
		$scrydex_usage_budget_planner   = new ScryDexUsageBudgetPlanner( $settings );
		$scrydex_usage_budget           = $scrydex_usage_budget_planner->plan_cards_page(
			$scrydex_sync_dry_run['request']
		);
		$scrydex_checkpoint_planner     = new ScryDexSyncCheckpointRepositoryPlanner(
			$this->database_prefix()
		);
		$scrydex_checkpoint_repository  = $scrydex_checkpoint_planner->plan(
			$scrydex_sync_dry_run['checkpoint_row']
		);
		$scrydex_persistence_planner    = new ScryDexPersistenceRepositoryReadinessPlanner(
			$this->database_prefix()
		);
		$scrydex_persistence_repository = $scrydex_persistence_planner->plan(
			$scrydex_sync_dry_run['checkpoint_row']
		);
		$scrydex_sync_execution         = ( new ScryDexSyncExecutionGate(
			$scrydex_dry_run_planner,
			$scrydex_usage_budget_planner,
			$scrydex_checkpoint_planner,
			$scrydex_persistence_planner
		) )->plan_cards_worker();
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
				'available' => FeatureFlags::is_available( $flag ),
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
				'staging_safety'                          => $staging_safety,
				'offline_route_bootstrap'                 => $offline,
				'offline_connector_manifest'              => $offline_connector_manifest,
				'offline_registered_device_permissions'   => $device_permissions,
				'offline_registered_device_sync_handlers' => $sync_handlers,
				'offline_device_pairing_route_readiness'  => $pairing,
				'pos_payment_route_readiness'             => $pos_payment_routes,
				'pos_payment_route_bootstrap'             => $pos_payment_bootstrap,
				'pos_payment_route_dependencies'          => $pos_payment_dependencies,
				'woocommerce_square_extension'            => $woocommerce_square,
				'square_inventory_sync'                   => $square_inventory_sync,
				'square_inventory_batch_sync'             => $square_inventory_batch_sync,
				'inventory_route_bootstrap'               => $inventory_bootstrap,
				'inventory_route_dependencies'            => $inventory_dependencies,
				'scrydex_provider'                        => $scrydex,
				'scrydex_sync_dry_run'                    => $scrydex_sync_dry_run,
				'scrydex_usage_budget'                    => $scrydex_usage_budget,
				'scrydex_checkpoint_repository'           => $scrydex_checkpoint_repository,
				'scrydex_persistence_repository'          => $scrydex_persistence_repository,
				'scrydex_sync_execution_gate'             => $scrydex_sync_execution,
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

	private function database_prefix(): string {
		global $wpdb;

		if ( is_object( $wpdb ) && isset( $wpdb->prefix ) ) {
			return (string) $wpdb->prefix;
		}

		return '';
	}
}
