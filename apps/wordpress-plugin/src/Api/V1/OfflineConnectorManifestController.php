<?php
/**
 * Public-safe offline connector manifest endpoint.
 *
 * @package TCGStorePlatform
 */

namespace TCGStorePlatform\Api\V1;

use TCGStorePlatform\Settings\Settings;

final class OfflineConnectorManifestController {
	private const NAMESPACE = 'tcg-store/v1';

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
					'permission_callback' => '__return_true',
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
				'path'       => '/offline/connector-manifest',
				'method'     => 'GET',
				'callback'   => 'get_manifest',
				'permission' => 'public_safe_manifest',
			),
		);
	}

	public function get_manifest( \WP_REST_Request $request ): \WP_REST_Response {
		unset( $request );

		return new \WP_REST_Response( $this->manifest_payload(), 200 );
	}

	/**
	 * @return array<string, mixed>
	 */
	public function manifest_payload(): array {
		$settings = Settings::all();

		return ( new OfflineConnectorManifestPlanner() )->plan(
			$settings,
			array(
				'site_url'    => $this->site_url(),
				'environment' => wp_get_environment_type(),
			)
		);
	}

	private static function rest_method( string $method ): string {
		return match ( $method ) {
			'GET'   => \WP_REST_Server::READABLE,
			'POST'  => \WP_REST_Server::CREATABLE,
			default => $method,
		};
	}

	private function site_url(): string {
		$site_url = get_site_url();

		return is_string( $site_url ) ? $site_url : '';
	}
}
