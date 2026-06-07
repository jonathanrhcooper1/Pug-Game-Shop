<?php
/**
 * Route-aware offline pull cursor advancement provider tests.
 *
 * @package TCGStorePlatform
 */

namespace {
	if ( ! class_exists( 'wpdb' ) ) {
		class wpdb {
			public string $prefix = 'wp_';
		}
	}

	if ( ! class_exists( 'OfflinePullRouteCursorAdvanceProviderWpdb' ) ) {
		class OfflinePullRouteCursorAdvanceProviderWpdb extends \wpdb {
			public string $prefix = 'wp_';
			public int $prepare_count = 0;
			public int $get_row_count = 0;
			public int $query_count = 0;

			/**
			 * @var list<string>
			 */
			public array $prepare_queries = array();

			/**
			 * @var list<list<mixed>>
			 */
			public array $prepare_args = array();

			/**
			 * @var list<string>
			 */
			public array $get_row_queries = array();

			/**
			 * @var list<string>
			 */
			public array $query_statements = array();

			/**
			 * @param array<string, mixed>|null $device_row Registered device row.
			 * @param list<int|false>           $query_results Cursor query results.
			 */
			public function __construct(
				private ?array $device_row,
				private array $query_results
			) {
			}

			/**
			 * @param list<mixed> $args Prepared arguments.
			 */
			public function prepare( string $query, array $args ): string {
				++$this->prepare_count;
				$this->prepare_queries[] = $query;
				$this->prepare_args[]    = array_values( $args );

				return 'prepared:' . $query;
			}

			/**
			 * @return array<string, mixed>|null
			 */
			public function get_row( string $query, string $output_type ): ?array {
				++$this->get_row_count;
				$this->get_row_queries[] = $query;

				return $this->device_row;
			}

			public function query( string $query ): int|false {
				++$this->query_count;
				$this->query_statements[] = $query;

				$result = array_shift( $this->query_results );

				return is_int( $result ) || false === $result ? $result : false;
			}
		}
	}
}

namespace TCGStorePlatform\Tests\Unit {
	use TCGStorePlatform\Api\V1\OfflinePullRouteCursorAdvanceProvider;
	use TCGStorePlatform\Api\V1\OfflineRestRequestData;
	use TCGStorePlatform\Offline\OfflineDeviceTokenAuthenticator;
	use TCGStorePlatform\Offline\OfflinePullCursorAdvanceRepository;
	use TCGStorePlatform\Offline\OfflinePullRequest;
	use TCGStorePlatform\Offline\OfflineRegisteredDevicePermissionResolver;
	use TCGStorePlatform\Offline\OfflineRegisteredDeviceRepository;
	use TCGStorePlatform\Tests\TestCase;

	final class OfflinePullRouteCursorAdvanceProviderTest extends TestCase {
		private const DEVICE_TOKEN = 'route-cursor-device-token-abcdefghijklmnopqrstuvwxyz-123456';

		public function test_route_cursor_provider_resolves_device_context_and_advances_cursors(): void {
			$database = new \OfflinePullRouteCursorAdvanceProviderWpdb(
				$this->device_row(),
				array( 1 )
			);
			$provider = $this->provider( $database );
			$result   = $provider->advance(
				$this->pull_request(),
				new OfflineRestRequestData( $this->pull_payload(), array(), array(), $this->headers() ),
				$this->change_sets()
			);
			$summary  = $provider->readiness_summary();
			$audit    = $result->audit_payload();

			$this->assert_true( $result->is_advanced() );
			$this->assert_same( 'advanced', $result->status() );
			$this->assert_same( 1, $result->rows_affected() );
			$this->assert_same( array(), $result->errors() );
			$this->assert_same( 2, $database->prepare_count );
			$this->assert_same( 1, $database->get_row_count );
			$this->assert_same( 1, $database->query_count );
			$this->assert_contains( 'FROM `wp_tcg_offline_devices`', $database->prepare_queries[0] );
			$this->assert_contains( 'INSERT INTO `wp_tcg_offline_pull_cursors`', $database->prepare_queries[1] );
			$this->assert_same( 42, $database->prepare_args[1][0] );
			$this->assert_same( 'device-main-01', $database->prepare_args[1][1] );
			$this->assert_same( 'inventory', $database->prepare_args[1][2] );
			$this->assert_same( 'cursor-route-01', $database->prepare_args[1][3] );
			$this->assert_same( 'offline_pull_route_cursor_advance_provider_ready', $summary['action'] );
			$this->assert_true( $summary['provider_ready'] );
			$this->assert_true( $summary['cursor_repository_ready'] );
			$this->assert_true( $summary['default_route_execution_deferred'] );
			$this->assert_true( $summary['route_connected_writes_deferred'] );
			$this->assert_same( 'offline_pull_cursor_advance_repository', $audit['action'] );
			$this->assert_true( $audit['explicit_execution_required'] );
			$this->assert_true( $audit['default_route_execution_deferred'] );
		}

		public function test_route_cursor_provider_rejects_missing_authorization_before_cursor_writes(): void {
			$database = new \OfflinePullRouteCursorAdvanceProviderWpdb(
				$this->device_row(),
				array( 1 )
			);
			$result   = $this->provider( $database )->advance(
				$this->pull_request(),
				new OfflineRestRequestData( $this->pull_payload(), array(), array(), array() ),
				$this->change_sets()
			);

			$this->assert_true( $result->is_rejected() );
			$this->assert_same( 0, $database->get_row_count );
			$this->assert_same( 0, $database->query_count );
			$this->assert_true( in_array( 'cursor_advance_plan_invalid', $result->errors(), true ) );
			$this->assert_true( in_array( 'device_context_invalid', $result->errors(), true ) );
			$this->assert_true( in_array( 'registered_device_not_authorized', $result->errors(), true ) );
		}

		public function test_route_cursor_provider_rejects_missing_change_sets_after_context(): void {
			$database = new \OfflinePullRouteCursorAdvanceProviderWpdb(
				$this->device_row(),
				array( 1 )
			);
			$result   = $this->provider( $database )->advance(
				$this->pull_request(),
				new OfflineRestRequestData( $this->pull_payload(), array(), array(), $this->headers() ),
				array()
			);

			$this->assert_true( $result->is_rejected() );
			$this->assert_same( 1, $database->get_row_count );
			$this->assert_same( 0, $database->query_count );
			$this->assert_true( in_array( 'inventory_change_set_missing', $result->errors(), true ) );
		}

		private function provider(
			\OfflinePullRouteCursorAdvanceProviderWpdb $database,
			string $table_prefix = 'wp_'
		): OfflinePullRouteCursorAdvanceProvider {
			return new OfflinePullRouteCursorAdvanceProvider(
				new OfflineRegisteredDevicePermissionResolver(
					new OfflineRegisteredDeviceRepository( $database )
				),
				new OfflinePullCursorAdvanceRepository( $database ),
				$table_prefix,
				null,
				null,
				static fn (): string => '2026-06-06T21:30:00Z'
			);
		}

		private function pull_request(): OfflinePullRequest {
			return new OfflinePullRequest(
				'device-main-01',
				array( 'inventory' ),
				array(),
				25,
				true,
				1
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
		private function pull_payload(): array {
			return array(
				'device_id'          => 'device-main-01',
				'domains'            => array( 'inventory' ),
				'cursors'            => array(),
				'page_size'          => 25,
				'include_tombstones' => true,
				'schema_version'     => 1,
			);
		}

		/**
		 * @return array<string, array<string, mixed>>
		 */
		private function change_sets(): array {
			return array(
				'inventory' => array(
					'cursor'     => 'cursor-route-01',
					'has_more'   => false,
					'data'       => array(
						array(
							'entity_type'    => 'inventory_item',
							'entity_id'      => 'inv-route-provider-01',
							'row_version'    => 9,
							'updated_at_utc' => '2026-06-06T21:30:00Z',
							'payload'        => array(),
						),
					),
					'tombstones' => array(),
				),
			);
		}

		/**
		 * @param array<string, mixed> $overrides Row overrides.
		 * @return array<string, mixed>
		 */
		private function device_row( array $overrides = array() ): array {
			return array_merge(
				array(
					'offline_device_id' => '42',
					'public_id'         => 'device-main-01',
					'location_id'       => '2',
					'manager_user_id'   => null,
					'device_label'      => 'Front Counter Kiosk',
					'device_mode'       => 'KIOSK',
					'token_hash'        => OfflineDeviceTokenAuthenticator::token_hash( self::DEVICE_TOKEN ),
					'token_expires_at'  => '2026-06-07 16:00:00',
					'scopes_json'       => '["offline_pull","offline_push","kiosk"]',
					'capabilities_json' => '{"barcode_scanner":true,"label_printer":false}',
					'app_version'       => '0.112.0',
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
