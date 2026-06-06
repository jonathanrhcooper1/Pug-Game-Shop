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

		$runner       = new MigrationRunner();
		$dependencies = DependencyChecker::status();
		$features     = array();
		$overall      = 'ok';
		$offline      = ( new OfflineRouteBootstrapStatusPresenter() )->health_payload(
			FeatureFlags::is_enabled( 'offline_sync' )
		);

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
				'status'                  => $overall,
				'version'                 => Version::PLUGIN,
				'database'                => array(
					'current' => $runner->current_version(),
					'target'  => Version::DATABASE,
				),
				'dependencies'            => $dependencies,
				'scheduler'               => $this->scheduler->status(),
				'hpos'                    => Compatibility::hpos_status(),
				'features'                => $features,
				'offline_route_bootstrap' => $offline,
				'timestamp'               => gmdate( 'c' ),
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
