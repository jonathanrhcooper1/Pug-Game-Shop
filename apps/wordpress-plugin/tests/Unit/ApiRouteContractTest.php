<?php
/**
 * REST route contract tests.
 *
 * @package TCGStorePlatform
 */

namespace TCGStorePlatform\Tests\Unit;

use TCGStorePlatform\Api\V1\EventsController;
use TCGStorePlatform\Api\V1\HealthController;
use TCGStorePlatform\Tests\TestCase;

final class ApiRouteContractTest extends TestCase {
	public function test_route_contracts_use_expected_namespace_and_unique_methods(): void {
		$seen = array();

		foreach ( $this->routes() as $route ) {
			$this->assert_same( 'tcg-store/v1', $route['namespace'] );

			$key = $route['namespace'] . ' ' . $route['method'] . ' ' . $route['path'];
			$this->assert_false( isset( $seen[ $key ] ), "Duplicate route contract: {$key}" );
			$seen[ $key ] = true;
		}

		$this->assert_same( 4, count( $seen ) );
	}

	public function test_health_route_requires_authenticated_access(): void {
		$route = $this->route_by_path( '/health' );

		$this->assert_same( 'GET', $route['method'] );
		$this->assert_same( 'get_health', $route['callback'] );
		$this->assert_same( 'authenticated', $route['permission'] );
	}

	public function test_public_event_routes_match_documented_contracts(): void {
		$this->assert_same(
			array(
				'method'     => 'GET',
				'callback'   => 'list_events',
				'permission' => 'public',
			),
			$this->route_summary( '/events' )
		);
		$this->assert_same(
			array(
				'method'     => 'GET',
				'callback'   => 'get_event',
				'permission' => 'public',
			),
			$this->route_summary( '/events/(?P<slug>[a-zA-Z0-9_-]+)' )
		);
		$this->assert_same(
			array(
				'method'     => 'POST',
				'callback'   => 'register_event',
				'permission' => 'public',
			),
			$this->route_summary( '/events/(?P<slug>[a-zA-Z0-9_-]+)/register' )
		);
	}

	public function test_unimplemented_write_modules_do_not_register_routes_yet(): void {
		$paths = array_map(
			static fn ( array $route ): string => $route['path'],
			$this->routes()
		);
		$body  = implode( "\n", $paths );

		$this->assert_not_contains( '/customers', $body );
		$this->assert_not_contains( '/buylist', $body );
		$this->assert_not_contains( '/inventory', $body );
		$this->assert_not_contains( '/offline', $body );
		$this->assert_not_contains( '/pos', $body );
	}

	/**
	 * @return list<array{namespace:string,path:string,method:string,callback:string,permission:string}>
	 */
	private function routes(): array {
		return array_merge(
			HealthController::route_contracts(),
			EventsController::route_contracts()
		);
	}

	/**
	 * @return array{namespace:string,path:string,method:string,callback:string,permission:string}
	 */
	private function route_by_path( string $path ): array {
		foreach ( $this->routes() as $route ) {
			if ( $path === $route['path'] ) {
				return $route;
			}
		}

		throw new \RuntimeException( "Route not found: {$path}" );
	}

	/**
	 * @return array{method:string,callback:string,permission:string}
	 */
	private function route_summary( string $path ): array {
		$route = $this->route_by_path( $path );

		return array(
			'method'     => $route['method'],
			'callback'   => $route['callback'],
			'permission' => $route['permission'],
		);
	}
}
