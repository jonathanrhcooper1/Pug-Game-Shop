<?php
/**
 * Offline push route handler factory tests.
 *
 * @package TCGStorePlatform
 */

namespace {
	if ( ! class_exists( 'wpdb' ) ) {
		class wpdb {
			public string $prefix = 'wp_';
		}
	}

	if ( ! class_exists( 'OfflinePushRouteHandlerFactoryWpdb' ) ) {
		class OfflinePushRouteHandlerFactoryWpdb extends \wpdb {
			public string $prefix = 'wp_';
			public int $prepare_count = 0;
			public int $get_row_count = 0;
			public int $query_count = 0;
			public string $last_query = '';

			/**
			 * @param array<string, mixed>|null $device_row Registered device row.
			 * @param list<int|false>           $query_results Query results.
			 */
			public function __construct(
				private ?array $device_row = null,
				private array $query_results = array(),
				?string $prefix = null
			) {
				if ( null !== $prefix ) {
					$this->prefix = $prefix;
				}
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

			public function query( string $query ): int|false {
				++$this->query_count;
				$this->last_query = $query;

				if ( array() === $this->query_results ) {
					return 1;
				}

				return array_shift( $this->query_results );
			}
		}
	}
}

namespace TCGStorePlatform\Tests\Unit {
	use TCGStorePlatform\Api\V1\OfflinePushRouteHandlerFactory;
	use TCGStorePlatform\Api\V1\OfflineRegisteredDeviceSyncRouteHandlerFactory;
	use TCGStorePlatform\Offline\OfflineDeviceTokenAuthenticator;
	use TCGStorePlatform\Tests\TestCase;

	final class OfflinePushRouteHandlerFactoryTest extends TestCase {
		private const DEVICE_TOKEN = 'test-device-token-abcdefghijklmnopqrstuvwxyz-123456';

		public function test_factory_keeps_route_connected_push_deferred_by_default(): void {
			$database = new \OfflinePushRouteHandlerFactoryWpdb( $this->database_row(), array( 1 ) );
			$factory  = new OfflinePushRouteHandlerFactory(
				static fn (): \wpdb => $database,
				null,
				$this->server_time_provider(),
				$this->server_snapshots_provider()
			);
			$summary  = $factory->readiness_summary();
			$response = $factory->handler()->handle( $this->push_request_data() );

			$this->assert_true( $summary['handler_factory_ready'] );
			$this->assert_false( $summary['route_connected_execution_enabled'] );
			$this->assert_true( $summary['database_configured'] );
			$this->assert_true( $summary['permission_resolver_configured'] );
			$this->assert_true( $summary['server_snapshot_provider_configured'] );
			$this->assert_false( $summary['route_connected_handler_ready'] );
			$this->assert_true( $summary['route_connected_handler_deferred'] );
			$this->assert_true( $summary['route_connected_queue_writes_deferred'] );
			$this->assert_true( $summary['route_connected_conflict_writes_deferred'] );
			$this->assert_same( array(), $summary['configuration_issues'] );
			$this->assert_same( 'validated', $response['status'] );
			$this->assert_same( 'offline_request_validated', $response['code'] );
			$this->assert_true( $response['data']['push_queue_persistence_deferred'] );
			$this->assert_same( 0, $database->get_row_count );
			$this->assert_same( 0, $database->query_count );
		}

		public function test_factory_composes_route_connected_push_handler_when_explicitly_enabled(): void {
			$database = new \OfflinePushRouteHandlerFactoryWpdb( $this->database_row(), array( 1 ) );
			$factory  = new OfflinePushRouteHandlerFactory(
				static fn (): \wpdb => $database,
				null,
				$this->server_time_provider(),
				$this->server_snapshots_provider(),
				null,
				null,
				true
			);
			$summary  = $factory->readiness_summary();
			$response = $factory->handler()->handle( $this->push_request_data() );

			$this->assert_true( $summary['route_connected_execution_enabled'] );
			$this->assert_true( $summary['database_configured'] );
			$this->assert_true( $summary['permission_resolver_configured'] );
			$this->assert_true( $summary['persistence_provider_configured'] );
			$this->assert_true( $summary['route_connected_handler_ready'] );
			$this->assert_false( $summary['route_connected_handler_deferred'] );
			$this->assert_false( $summary['route_connected_queue_writes_deferred'] );
			$this->assert_false( $summary['route_connected_conflict_writes_deferred'] );
			$this->assert_same( 'ready', $response['status'] );
			$this->assert_same( 'offline_push_response_ready', $response['code'] );
			$this->assert_same( 'accepted', $response['data']['results'][0]['status'] );
			$this->assert_same( 'inventory_reserved', $response['data']['results'][0]['code'] );
			$this->assert_same( 'persisted', $response['meta']['persistence_status'] );
			$this->assert_same( 1, $response['meta']['operation_rows_affected'] );
			$this->assert_same( 0, $response['meta']['conflict_rows_affected'] );
			$this->assert_false( $response['meta']['push_queue_persistence_deferred'] );
			$this->assert_true( $response['meta']['push_canonical_mutations_deferred'] );
			$this->assert_same( 2, $database->prepare_count );
			$this->assert_same( 1, $database->get_row_count );
			$this->assert_same( 1, $database->query_count );
		}

		public function test_sync_handler_factory_can_receive_route_connected_push_factory(): void {
			$database = new \OfflinePushRouteHandlerFactoryWpdb( $this->database_row(), array( 1 ) );
			$factory  = new OfflineRegisteredDeviceSyncRouteHandlerFactory(
				null,
				null,
				null,
				null,
				null,
				new OfflinePushRouteHandlerFactory(
					static fn (): \wpdb => $database,
					null,
					$this->server_time_provider(),
					$this->server_snapshots_provider(),
					null,
					null,
					true
				)
			);
			$summary  = $factory->readiness_summary();
			$response = $factory->controller()->push_offline_operations(
				array(
					'body'    => $this->push_body(),
					'headers' => $this->headers(),
				)
			);

			$this->assert_true( $summary['push_handler_dependency_factory_ready'] );
			$this->assert_true( $summary['push_handler_route_dependencies_ready'] );
			$this->assert_false( $summary['push_handler_route_dependencies_deferred'] );
			$this->assert_true( $summary['push_handler_route_execution_enabled'] );
			$this->assert_true( $summary['push_handler_route_database_configured'] );
			$this->assert_false( $summary['push_handler_route_queue_writes_deferred'] );
			$this->assert_false( $summary['push_handler_conflict_writes_deferred'] );
			$this->assert_true( $summary['route_connected_writes_ready'] );
			$this->assert_same( array(), $summary['push_handler_route_dependency_issues'] );
			$this->assert_same( 'offline_push_response_ready', $response['code'] );
			$this->assert_same( 'persisted', $response['meta']['persistence_status'] );
		}

		/**
		 * @return callable(): string
		 */
		private function server_time_provider(): callable {
			return static fn (): string => '2026-06-06T20:30:00Z';
		}

		/**
		 * @return callable(): array<string, mixed>
		 */
		private function server_snapshots_provider(): callable {
			return static fn (): array => array(
				'op-push-route-01' => array(
					'inventory' => array(
						'status'     => 'available',
						'rowVersion' => 4,
					),
				),
			);
		}

		private function push_request_data(): \TCGStorePlatform\Api\V1\OfflineRestRequestData {
			return new \TCGStorePlatform\Api\V1\OfflineRestRequestData(
				$this->push_body(),
				array(),
				array(),
				$this->headers()
			);
		}

		/**
		 * @return array<string, string>
		 */
		private function headers(): array {
			return array(
				'authorization'     => 'Bearer ' . self::DEVICE_TOKEN,
				'Idempotency-Key'   => 'batch-push-route-01',
			);
		}

		/**
		 * @return array<string, mixed>
		 */
		private function push_body(): array {
			return array(
				'batch_id'   => 'body-batch-ignored',
				'device_id'  => 'device-main-01',
				'operations' => array(
					array(
						'client_operation_id'  => 'op-push-route-01',
						'device_id'            => 'device-main-01',
						'location_id'          => 3,
						'actor_id'             => 22,
						'operation_type'       => 'inventory_reservation',
						'entity_type'          => 'inventory',
						'entity_id'            => 'inv-1001',
						'base_row_version'     => 4,
						'occurred_at_local'    => '2026-06-06T10:15:00-04:00',
						'queued_at_utc'        => '2026-06-06T14:15:05Z',
						'payload'              => array(
							'localStatus' => 'offline_pending_sync',
						),
						'authorization_context' => array(
							'manager_user_id' => 91,
						),
						'schema_version'       => 1,
					),
				),
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
				'app_version'       => '0.110.0',
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
