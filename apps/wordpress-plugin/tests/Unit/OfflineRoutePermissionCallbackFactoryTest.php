<?php
/**
 * Offline route permission callback factory tests.
 *
 * @package TCGStorePlatform
 */

namespace {
	if ( ! class_exists( 'wpdb' ) ) {
		class wpdb {
			public string $prefix = 'wp_';
			public int $prepare_count = 0;
			public int $get_row_count = 0;
			public int $query_count = 0;
			public string $last_prepare_query = '';
			public string $last_query = '';
			public string $last_output_type = '';

			/**
			 * @var list<mixed>
			 */
			public array $last_prepare_args = array();

			/**
			 * @param array<string, mixed>|null $row Row returned by get_row.
			 */
			public function __construct(
				private ?array $row = null,
				private int|false $query_result = 1
			) {
			}

			/**
			 * @param list<mixed> $args Prepared arguments.
			 */
			public function prepare( string $query, array $args ): string {
				++$this->prepare_count;
				$this->last_prepare_query = $query;
				$this->last_prepare_args  = array_values( $args );

				return 'prepared:' . $query;
			}

			/**
			 * @return array<string, mixed>|null
			 */
			public function get_row( string $query, string $output_type ): ?array {
				++$this->get_row_count;
				$this->last_query       = $query;
				$this->last_output_type = $output_type;

				return $this->row;
			}

			public function query( string $query ): int|false {
				++$this->query_count;
				$this->last_query = $query;

				return $this->query_result;
			}
		}
	}
}

namespace TCGStorePlatform\Tests\Unit {
	use TCGStorePlatform\Api\V1\OfflineRouteContracts;
	use TCGStorePlatform\Api\V1\OfflineRoutePermissionCallbackFactory;
	use TCGStorePlatform\Offline\OfflineDeviceSessionUpdateRepository;
	use TCGStorePlatform\Offline\OfflineDeviceTokenAuthenticator;
	use TCGStorePlatform\Offline\OfflineRegisteredDevicePermissionCallbackAdapter;
	use TCGStorePlatform\Offline\OfflineRegisteredDevicePermissionResolver;
	use TCGStorePlatform\Offline\OfflineRegisteredDeviceRepository;
	use TCGStorePlatform\Tests\TestCase;

	final class OfflineRoutePermissionCallbackFactoryTest extends TestCase {
		private const DEVICE_TOKEN = 'test-device-token-abcdefghijklmnopqrstuvwxyz-123456';

		public function test_registered_device_scope_map_matches_planned_route_contracts(): void {
			$this->assert_same(
				array(
					'POST /offline/pull' => 'offline_pull',
					'POST /offline/push' => 'offline_push',
				),
				OfflineRoutePermissionCallbackFactory::registered_device_scope_map()
			);
		}

		public function test_factory_builds_callbacks_only_for_registered_device_routes(): void {
			$callbacks = $this->factory( new \wpdb( $this->database_row() ) )->callbacks_for_contracts();

			$this->assert_same( 2, count( $callbacks ) );
			$this->assert_true(
				$callbacks['POST /offline/pull'] instanceof OfflineRegisteredDevicePermissionCallbackAdapter
			);
			$this->assert_true(
				$callbacks['POST /offline/push'] instanceof OfflineRegisteredDevicePermissionCallbackAdapter
			);
			$this->assert_same( 'offline_pull', $callbacks['POST /offline/pull']->required_scope() );
			$this->assert_same( 'offline_push', $callbacks['POST /offline/push']->required_scope() );
		}

		public function test_factory_ignores_non_registered_device_route_contracts(): void {
			$factory = $this->factory( new \wpdb( $this->database_row() ) );
			$routes  = OfflineRouteContracts::route_contracts();

			$this->assert_same( null, $factory->callback_for_route_contract( $routes[0] ) );
			$this->assert_same( null, $factory->callback_for_route_contract( $routes[3] ) );
			$this->assert_same( null, $factory->callback_for_route_contract( $routes[4] ) );
		}

		public function test_factory_callbacks_authorize_and_apply_session_updates(): void {
			$database  = new \wpdb( $this->database_row(), 1 );
			$callbacks = $this->factory( $database )->callbacks_for_contracts();

			$resolution = $callbacks['POST /offline/pull']->authorize(
				array(
					'Authorization' => 'Bearer ' . self::DEVICE_TOKEN,
				)
			);
			$audit      = $resolution->audit_payload();

			$this->assert_true( $resolution->is_authorized() );
			$this->assert_true( $resolution->session_update_result()?->is_applied() );
			$this->assert_same( 'offline_pull', $resolution->final_permission_plan()?->audit_payload()['required_scope'] );
			$this->assert_same( 'applied', $audit['session_update_status'] );
			$this->assert_same( 2, $database->prepare_count );
			$this->assert_same( 1, $database->get_row_count );
			$this->assert_same( 1, $database->query_count );
			$this->assert_not_contains( self::DEVICE_TOKEN, (string) json_encode( $audit ) );
			$this->assert_not_contains(
				OfflineDeviceTokenAuthenticator::token_hash( self::DEVICE_TOKEN ),
				(string) json_encode( $audit )
			);
		}

		private function factory( \wpdb $database ): OfflineRoutePermissionCallbackFactory {
			return new OfflineRoutePermissionCallbackFactory(
				new OfflineRegisteredDevicePermissionResolver(
					new OfflineRegisteredDeviceRepository( $database ),
					null,
					new OfflineDeviceSessionUpdateRepository( $database )
				),
				static fn (): string => '2026-06-06T20:30:00Z'
			);
		}

		/**
		 * @param array<string, mixed> $overrides Row overrides.
		 * @return array<string, mixed>
		 */
		private function database_row( array $overrides = array() ): array {
			return array_merge(
				array(
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
					'app_version'       => '0.64.0',
					'platform'          => 'windows',
					'status'            => 'ACTIVE',
					'last_seen_at'      => '2026-06-06 15:30:00',
					'revoked_at'        => null,
					'issued_at'         => '2026-06-06 15:00:00',
					'created_at'        => '2026-06-06 15:00:00',
					'updated_at'        => '2026-06-06 15:15:00',
					'row_version'       => '8',
				),
				$overrides
			);
		}
	}
}
