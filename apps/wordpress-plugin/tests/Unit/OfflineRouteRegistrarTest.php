<?php
/**
 * Offline route registrar tests.
 *
 * @package TCGStorePlatform
 */

namespace {
	if ( ! class_exists( 'wpdb' ) ) {
		class wpdb {
			public string $prefix = 'wp_';

			/**
			 * @param array<string, mixed>|null $row Row returned by get_row.
			 */
			public function __construct( private ?array $row = null ) {
			}

			/**
			 * @param list<mixed> $args Prepared arguments.
			 */
			public function prepare( string $query, array $args ): string {
				unset( $args );

				return 'prepared:' . $query;
			}

			/**
			 * @return array<string, mixed>|null
			 */
			public function get_row( string $query, string $output_type ): ?array {
				unset( $query, $output_type );

				return $this->row;
			}

			public function query( string $query ): int|false {
				unset( $query );

				return 1;
			}
		}
	}
}

namespace TCGStorePlatform\Tests\Unit {
	use TCGStorePlatform\Api\V1\OfflineController;
	use TCGStorePlatform\Api\V1\OfflineRouteContracts;
	use TCGStorePlatform\Api\V1\OfflineRoutePermissionCallbackFactory;
	use TCGStorePlatform\Api\V1\OfflineRouteRegistrar;
	use TCGStorePlatform\Api\V1\OfflineRouteRegistrationPlanner;
	use TCGStorePlatform\Offline\OfflineDeviceSessionUpdateRepository;
	use TCGStorePlatform\Offline\OfflineDeviceTokenAuthenticator;
	use TCGStorePlatform\Offline\OfflineRegisteredDevicePermissionCallbackAdapter;
	use TCGStorePlatform\Offline\OfflineRegisteredDevicePermissionResolver;
	use TCGStorePlatform\Offline\OfflineRegisteredDeviceRepository;
	use TCGStorePlatform\Tests\TestCase;

	final class OfflineRouteRegistrarTest extends TestCase {
		private const DEVICE_TOKEN = 'test-device-token-abcdefghijklmnopqrstuvwxyz-123456';

		public function test_registrar_does_not_register_disabled_default_offline_routes(): void {
			$calls     = array();
			$registrar = new OfflineRouteRegistrar(
				$this->planner(),
				static function ( string $namespace, string $route, array $args ) use ( &$calls ): bool {
					$calls[] = array( $namespace, $route, $args );

					return true;
				}
			);

			$this->assert_same( 0, $registrar->register_enabled_routes() );
			$this->assert_same( array(), $calls );
		}

		public function test_registrar_registers_only_future_enabled_and_ready_route_plans(): void {
			$calls     = array();
			$registrar = new OfflineRouteRegistrar(
				$this->planner(),
				static function ( string $namespace, string $route, array $args ) use ( &$calls ): bool {
					$calls[] = array(
						'namespace' => $namespace,
						'route'     => $route,
						'args'      => $args,
					);

					return true;
				}
			);

			$this->assert_same( 1, $registrar->register_enabled_routes( $this->future_enabled_pull_route() ) );
			$this->assert_same( 1, count( $calls ) );
			$this->assert_same( 'tcg-store/v1', $calls[0]['namespace'] );
			$this->assert_same( '/offline/pull', $calls[0]['route'] );
			$this->assert_same( 'POST', $calls[0]['args']['methods'] );
			$this->assert_true( is_callable( $calls[0]['args']['callback'] ) );
			$this->assert_true(
				$calls[0]['args']['permission_callback'] instanceof OfflineRegisteredDevicePermissionCallbackAdapter
			);
		}

		public function test_registrar_does_not_register_live_flagged_routes_without_ready_callbacks(): void {
			$calls     = array();
			$registrar = new OfflineRouteRegistrar(
				new OfflineRouteRegistrationPlanner( null, new OfflineController() ),
				static function ( string $namespace, string $route, array $args ) use ( &$calls ): bool {
					$calls[] = array( $namespace, $route, $args );

					return true;
				}
			);

			$this->assert_same( 0, $registrar->register_enabled_routes( $this->future_enabled_pull_route() ) );
			$this->assert_same( array(), $calls );
		}

		private function planner(): OfflineRouteRegistrationPlanner {
			$database = new \wpdb( $this->database_row() );

			return new OfflineRouteRegistrationPlanner(
				new OfflineRoutePermissionCallbackFactory(
					new OfflineRegisteredDevicePermissionResolver(
						new OfflineRegisteredDeviceRepository( $database ),
						null,
						new OfflineDeviceSessionUpdateRepository( $database )
					),
					static fn (): string => '2026-06-06T20:30:00Z'
				),
				new OfflineController()
			);
		}

		/**
		 * @return list<array<string, mixed>>
		 */
		private function future_enabled_pull_route(): array {
			$routes = OfflineRouteContracts::route_contracts();

			foreach ( $routes as $index => $route ) {
				$routes[ $index ]['live_enabled_by_default'] = '/offline/pull' === $route['path'];
			}

			return $routes;
		}

		/**
		 * @return array<string, mixed>
		 */
		private function database_row(): array {
			return array(
				'offline_device_id' => '42',
				'public_id'         => 'device-main-01',
				'location_id'       => '2',
				'manager_user_id'   => null,
				'device_label'      => 'Front Counter Kiosk',
				'device_mode'       => 'KIOSK',
				'token_hash'        => OfflineDeviceTokenAuthenticator::token_hash( self::DEVICE_TOKEN ),
				'token_expires_at'  => '2026-06-07 16:00:00.123456',
				'scopes_json'       => '["offline_pull","offline_push","kiosk"]',
				'capabilities_json' => '{"barcode_scanner":true,"label_printer":false}',
				'app_version'       => '0.71.0',
				'platform'          => 'windows',
				'status'            => 'ACTIVE',
				'last_seen_at'      => '2026-06-06 15:30:00',
				'revoked_at'        => null,
				'issued_at'         => '2026-06-06 15:00:00',
				'created_at'        => '2026-06-06 15:00:00',
				'updated_at'        => '2026-06-06 15:15:00',
				'row_version'       => '8',
			);
		}
	}
}
