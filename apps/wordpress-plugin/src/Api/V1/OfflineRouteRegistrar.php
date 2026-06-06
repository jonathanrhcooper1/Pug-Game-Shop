<?php
/**
 * Guarded offline REST route registrar.
 *
 * @package TCGStorePlatform
 */

namespace TCGStorePlatform\Api\V1;

final class OfflineRouteRegistrar {
	private OfflineRouteRegistrationPlanner $planner;
	private mixed $register_route_callback;

	/**
	 * @param callable(string, string, array<string, mixed>): mixed|null $register_route_callback Optional route registrar.
	 */
	public function __construct(
		OfflineRouteRegistrationPlanner $planner,
		?callable $register_route_callback = null
	) {
		$this->planner                 = $planner;
		$this->register_route_callback = $register_route_callback;
	}

	/**
	 * @param null|list<array<string, mixed>> $route_contracts Planned route contracts.
	 */
	public function register_enabled_routes( ?array $route_contracts = null ): int {
		$registered = 0;

		foreach ( $this->planner->enabled_registration_args( $route_contracts ) as $route_plan ) {
			$this->register_route( $route_plan );
			++$registered;
		}

		return $registered;
	}

	/**
	 * @param array<string, mixed> $route_plan Planned route registration metadata.
	 */
	private function register_route( array $route_plan ): void {
		$register_route = $this->register_route_callback();

		$register_route(
			(string) $route_plan['namespace'],
			(string) $route_plan['path'],
			array(
				'methods'             => $route_plan['methods'],
				'callback'            => $route_plan['controller_callback'],
				'permission_callback' => $route_plan['permission_callback'],
			)
		);
	}

	/**
	 * @return callable(string, string, array<string, mixed>): mixed
	 */
	private function register_route_callback(): callable {
		if ( is_callable( $this->register_route_callback ) ) {
			return $this->register_route_callback;
		}

		return static function ( string $namespace, string $route, array $args ): mixed {
			if ( function_exists( 'register_rest_route' ) ) {
				return register_rest_route( $namespace, $route, $args );
			}

			return false;
		};
	}
}
