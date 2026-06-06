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
		register_rest_route(
			self::NAMESPACE,
			'/health',
			array(
				'methods'             => \WP_REST_Server::READABLE,
				'callback'            => array( $this, 'get_health' ),
				'permission_callback' => array( $this, 'can_view_health' ),
			)
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
				'status'       => $overall,
				'version'      => Version::PLUGIN,
				'database'     => array(
					'current' => $runner->current_version(),
					'target'  => Version::DATABASE,
				),
				'dependencies' => $dependencies,
				'scheduler'    => $this->scheduler->status(),
				'hpos'         => Compatibility::hpos_status(),
				'features'     => $features,
				'timestamp'    => gmdate( 'c' ),
			),
			200
		);
	}
}
