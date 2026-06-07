<?php
/**
 * Route-aware offline pull change-set provider tests.
 *
 * @package TCGStorePlatform
 */

namespace {
	if ( ! class_exists( 'wpdb' ) ) {
		class wpdb {
			public string $prefix = 'wp_';
		}
	}

	if ( ! class_exists( 'OfflinePullRouteChangeSetProviderWpdb' ) ) {
		class OfflinePullRouteChangeSetProviderWpdb extends \wpdb {
			public string $prefix = 'wp_';
			public int $prepare_count = 0;
			public int $get_row_count = 0;
			public int $get_results_count = 0;
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
			 * @param array<string, mixed>|null           $device_row Registered device row.
			 * @param list<list<array<string, mixed>>>    $result_sets Change query result sets.
			 */
			public function __construct(
				private ?array $device_row,
				private array $result_sets
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

				return $this->device_row;
			}

			/**
			 * @return list<array<string, mixed>>
			 */
			public function get_results( string $query, string $output_type ): array {
				++$this->get_results_count;

				return array_shift( $this->result_sets ) ?? array();
			}

			public function query( string $query ): int|false {
				++$this->query_count;

				return 1;
			}
		}
	}
}

namespace TCGStorePlatform\Tests\Unit {
	use RuntimeException;
	use TCGStorePlatform\Api\V1\OfflinePullRouteChangeSetProvider;
	use TCGStorePlatform\Api\V1\OfflinePullRouteHandler;
	use TCGStorePlatform\Api\V1\OfflineRestRequestData;
	use TCGStorePlatform\Offline\OfflineDeviceTokenAuthenticator;
	use TCGStorePlatform\Offline\OfflinePullChangeRepository;
	use TCGStorePlatform\Offline\OfflinePullRequest;
	use TCGStorePlatform\Offline\OfflineRegisteredDevicePermissionResolver;
	use TCGStorePlatform\Offline\OfflineRegisteredDeviceRepository;
	use TCGStorePlatform\Tests\TestCase;

	final class OfflinePullRouteChangeSetProviderTest extends TestCase {
		private const DEVICE_TOKEN = 'route-provider-device-token-abcdefghijklmnopqrstuvwxyz-123456';

		public function test_route_provider_resolves_device_headers_and_fetches_change_sets(): void {
			$database = new \OfflinePullRouteChangeSetProviderWpdb(
				$this->device_row(),
				array(
					array( $this->inventory_row() ),
				)
			);
			$provider = $this->provider( $database );
			$summary  = $provider->readiness_summary();
			$handler  = new OfflinePullRouteHandler(
				null,
				null,
				$provider,
				static fn (): string => '2026-06-06T21:30:00Z'
			);
			$response = $handler->handle(
				new OfflineRestRequestData(
					$this->pull_payload(),
					array(),
					array(),
					$this->headers()
				)
			);

			$this->assert_same( 'ready', $response['status'] );
			$this->assert_same( 'offline_pull_response_ready', $response['code'] );
			$this->assert_same( 'inv-route-provider-01', $response['data']['domains']['inventory']['data'][0]['entity_id'] );
			$this->assert_same( 2, $database->prepare_count );
			$this->assert_same( 1, $database->get_row_count );
			$this->assert_same( 1, $database->get_results_count );
			$this->assert_same( 0, $database->query_count );
			$this->assert_contains( 'FROM `wp_tcg_offline_devices`', $database->prepare_queries[0] );
			$this->assert_contains( 'FROM `wp_tcg_inventory_items`', $database->prepare_queries[1] );
			$this->assert_same( 'offline_pull_route_change_set_provider_ready', $summary['action'] );
			$this->assert_true( $summary['provider_ready'] );
			$this->assert_true( $summary['route_connected_reads_ready'] );
			$this->assert_true( $summary['route_connected_writes_deferred'] );
			$this->assert_true( $response['meta']['cursor_advance_deferred'] );
		}

		public function test_route_provider_rejects_missing_authorization_before_change_queries(): void {
			$database = new \OfflinePullRouteChangeSetProviderWpdb(
				$this->device_row(),
				array(
					array( $this->inventory_row() ),
				)
			);

			try {
				$this->provider( $database )(
					new OfflinePullRequest(
						'device-main-01',
						array( 'inventory' ),
						array(),
						25,
						true,
						1
					),
					new OfflineRestRequestData( $this->pull_payload(), array(), array(), array() )
				);
			} catch ( RuntimeException $exception ) {
				$this->assert_same( 'offline_pull_device_context_rejected', $exception->getMessage() );
				$this->assert_same( 0, $database->get_row_count );
				$this->assert_same( 0, $database->get_results_count );

				return;
			}

			$this->fail( 'Expected missing route authorization to reject route change provider context.' );
		}

		public function test_handler_fails_closed_when_route_provider_rejects_context(): void {
			$database = new \OfflinePullRouteChangeSetProviderWpdb(
				$this->device_row(
					array(
						'public_id' => 'device-other-01',
					)
				),
				array(
					array( $this->inventory_row() ),
				)
			);
			$handler  = new OfflinePullRouteHandler(
				null,
				null,
				$this->provider( $database ),
				static fn (): string => '2026-06-06T21:30:00Z'
			);
			$response = $handler->handle(
				new OfflineRestRequestData(
					$this->pull_payload(),
					array(),
					array(),
					$this->headers()
				)
			);

			$this->assert_same( 'invalid', $response['status'] );
			$this->assert_same( 'offline_pull_change_provider_failed', $response['code'] );
			$this->assert_same( 1, $database->get_row_count );
			$this->assert_same( 0, $database->get_results_count );
			$this->assert_true( $response['meta']['write_deferred'] );
		}

		private function provider(
			\OfflinePullRouteChangeSetProviderWpdb $database,
			string $table_prefix = 'wp_'
		): OfflinePullRouteChangeSetProvider {
			return new OfflinePullRouteChangeSetProvider(
				new OfflineRegisteredDevicePermissionResolver(
					new OfflineRegisteredDeviceRepository( $database )
				),
				new OfflinePullChangeRepository( $database ),
				$table_prefix,
				null,
				null,
				static fn (): string => '2026-06-06T21:30:00Z'
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
					'app_version'       => '0.119.0',
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

		/**
		 * @return array<string, mixed>
		 */
		private function inventory_row(): array {
			return array(
				'inventory_id'      => '1001',
				'public_id'         => 'inv-route-provider-01',
				'game'              => 'mtg',
				'card_name'         => 'Counterspell',
				'set_name'          => 'Magic Core Set',
				'set_code'          => 'MCS',
				'card_number'       => '52',
				'barcode'           => '123456789013',
				'sku'               => 'MTG-MCS-052',
				'sale_price'        => '2.49',
				'sale_currency'     => 'USD',
				'location_id'       => '2',
				'status'            => 'available',
				'online_visibility' => 'visible',
				'kiosk_visibility'  => 'visible',
				'pos_visibility'    => 'visible',
				'updated_at'        => '2026-06-06 21:30:00',
				'row_version'       => '9',
			);
		}
	}
}
