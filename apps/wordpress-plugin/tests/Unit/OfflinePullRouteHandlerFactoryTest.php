<?php
/**
 * Offline pull route handler factory tests.
 *
 * @package TCGStorePlatform
 */

namespace {
	if ( ! class_exists( 'wpdb' ) ) {
		class wpdb {
			public string $prefix = 'wp_';
		}
	}

	if ( ! class_exists( 'OfflinePullRouteHandlerFactoryWpdb' ) ) {
		class OfflinePullRouteHandlerFactoryWpdb extends \wpdb {
			public string $prefix = 'wp_';
			public int $prepare_count = 0;
			public int $get_row_count = 0;
			public int $get_results_count = 0;
			public int $query_count = 0;
			public string $last_query = '';

			/**
			 * @param array<string, mixed>|null        $device_row  Registered device row.
			 * @param list<array<string, mixed>>|false $pull_rows   Pull repository rows.
			 */
			public function __construct(
				private ?array $device_row = null,
				private array|false $pull_rows = array(),
				private int|false $query_result = 1
			) {
			}

			/**
			 * @param list<mixed> $args Prepared arguments.
			 */
			public function prepare( string $query, array $args ): string {
				unset( $args );

				++$this->prepare_count;

				return 'prepared:' . $query;
			}

			/**
			 * @return array<string, mixed>|null
			 */
			public function get_row( string $query, string $output_type ): ?array {
				unset( $output_type );

				++$this->get_row_count;
				$this->last_query = $query;

				return $this->device_row;
			}

			/**
			 * @return list<array<string, mixed>>|false
			 */
			public function get_results( string $query, string $output_type ): array|false {
				unset( $output_type );

				++$this->get_results_count;
				$this->last_query = $query;

				return $this->pull_rows;
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
	use TCGStorePlatform\Api\V1\OfflinePullRouteHandlerFactory;
	use TCGStorePlatform\Api\V1\OfflineRegisteredDeviceSyncRouteHandlerFactory;
	use TCGStorePlatform\Offline\OfflineDeviceTokenAuthenticator;
	use TCGStorePlatform\Tests\TestCase;

	final class OfflinePullRouteHandlerFactoryTest extends TestCase {
		private const DEVICE_TOKEN = 'test-device-token-abcdefghijklmnopqrstuvwxyz-123456';

		public function test_factory_keeps_route_connected_dependencies_deferred_by_default(): void {
			$database = new \OfflinePullRouteHandlerFactoryWpdb( $this->database_row() );
			$factory  = new OfflinePullRouteHandlerFactory(
				static fn (): \wpdb => $database,
				null,
				$this->server_time_provider()
			);
			$summary  = $factory->readiness_summary();
			$response = $factory->handler()->handle( $this->pull_request_data() );

			$this->assert_true( $summary['handler_factory_ready'] );
			$this->assert_false( $summary['route_connected_execution_enabled'] );
			$this->assert_true( $summary['database_configured'] );
			$this->assert_true( $summary['permission_resolver_configured'] );
			$this->assert_false( $summary['route_connected_handler_ready'] );
			$this->assert_true( $summary['route_connected_handler_deferred'] );
			$this->assert_true( $summary['route_connected_reads_deferred'] );
			$this->assert_true( $summary['route_connected_cursor_writes_deferred'] );
			$this->assert_same( array(), $summary['configuration_issues'] );
			$this->assert_same( 'offline_pull_response_ready', $response['code'] );
			$this->assert_false( $response['meta']['cursor_advance_attempted'] );
			$this->assert_same( 0, $database->get_row_count );
			$this->assert_same( 0, $database->query_count );
		}

		public function test_factory_composes_route_connected_pull_handler_when_explicitly_enabled(): void {
			$database = new \OfflinePullRouteHandlerFactoryWpdb( $this->database_row() );
			$factory  = new OfflinePullRouteHandlerFactory(
				static fn (): \wpdb => $database,
				null,
				$this->server_time_provider(),
				true
			);
			$summary  = $factory->readiness_summary();
			$response = $factory->handler()->handle( $this->pull_request_data() );

			$this->assert_true( $summary['route_connected_execution_enabled'] );
			$this->assert_true( $summary['database_configured'] );
			$this->assert_true( $summary['permission_resolver_configured'] );
			$this->assert_true( $summary['change_set_provider_configured'] );
			$this->assert_true( $summary['cursor_advance_provider_configured'] );
			$this->assert_true( $summary['route_connected_handler_ready'] );
			$this->assert_false( $summary['route_connected_handler_deferred'] );
			$this->assert_false( $summary['route_connected_reads_deferred'] );
			$this->assert_false( $summary['route_connected_cursor_writes_deferred'] );
			$this->assert_same( array(), $summary['configuration_issues'] );
			$this->assert_same( 'ready', $response['status'] );
			$this->assert_same( 'offline_pull_response_ready', $response['code'] );
			$this->assert_same( 'cursor-inventory-01', $response['data']['domains']['inventory']['cursor'] );
			$this->assert_true( $response['meta']['cursor_advance_attempted'] );
			$this->assert_same( 'advanced', $response['meta']['cursor_advance_status'] );
			$this->assert_same( 1, $response['meta']['cursor_advance_rows_affected'] );
			$this->assert_same( 2, $database->get_row_count );
			$this->assert_same( 1, $database->get_results_count );
			$this->assert_same( 1, $database->query_count );
		}

		public function test_sync_handler_factory_can_receive_route_connected_pull_factory(): void {
			$database = new \OfflinePullRouteHandlerFactoryWpdb( $this->database_row() );
			$factory  = new OfflineRegisteredDeviceSyncRouteHandlerFactory(
				null,
				null,
				null,
				new OfflinePullRouteHandlerFactory(
					static fn (): \wpdb => $database,
					null,
					$this->server_time_provider(),
					true
				)
			);
			$summary  = $factory->readiness_summary();
			$response = $factory->controller()->pull_offline_changes(
				array(
					'body'    => $this->pull_body(),
					'headers' => $this->headers(),
				)
			);

			$this->assert_true( $summary['pull_handler_dependency_factory_ready'] );
			$this->assert_true( $summary['pull_handler_route_dependencies_ready'] );
			$this->assert_false( $summary['pull_handler_route_dependencies_deferred'] );
			$this->assert_true( $summary['pull_handler_route_execution_enabled'] );
			$this->assert_true( $summary['pull_handler_route_database_configured'] );
			$this->assert_false( $summary['pull_handler_route_cursor_writes_deferred'] );
			$this->assert_same( array(), $summary['pull_handler_route_dependency_issues'] );
			$this->assert_same( 'offline_pull_response_ready', $response['code'] );
			$this->assert_same( 'advanced', $response['meta']['cursor_advance_status'] );
		}

		/**
		 * @return callable(): string
		 */
		private function server_time_provider(): callable {
			return static fn (): string => '2026-06-06T20:30:00Z';
		}

		private function pull_request_data(): \TCGStorePlatform\Api\V1\OfflineRestRequestData {
			return new \TCGStorePlatform\Api\V1\OfflineRestRequestData(
				$this->pull_body(),
				array(),
				array(),
				$this->headers()
			);
		}

		/**
		 * @return array<string, mixed>
		 */
		private function pull_body(): array {
			return array(
				'device_id'          => 'device-main-01',
				'domains'            => array( 'inventory' ),
				'cursors'            => array(
					'inventory' => 'cursor-inventory-01',
				),
				'page_size'          => 25,
				'include_tombstones' => true,
				'schema_version'     => 1,
			);
		}

		/**
		 * @return array<string, string>
		 */
		private function headers(): array {
			return array(
				'authorization' => 'Bearer ' . self::DEVICE_TOKEN,
			);
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
				'app_version'       => '0.116.0',
				'platform'          => 'windows',
				'last_seen_at'      => '2026-06-06 19:30:00.000000',
				'revoked_at'        => null,
				'issued_at'         => '2026-06-06 15:00:00.000000',
				'status'            => 'ACTIVE',
				'row_version'       => '8',
				'created_at'        => '2026-06-06 12:00:00.000000',
				'updated_at'        => '2026-06-06 12:00:00.000000',
			);
		}
	}
}
