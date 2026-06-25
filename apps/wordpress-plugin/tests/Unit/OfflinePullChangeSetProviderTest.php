<?php
/**
 * Offline pull change-set provider tests.
 *
 * @package TCGStorePlatform
 */

namespace {
	if ( ! class_exists( 'wpdb' ) ) {
		class wpdb {
			public string $prefix = 'wp_';
		}
	}

	if ( ! class_exists( 'OfflinePullChangeSetProviderWpdb' ) ) {
		class OfflinePullChangeSetProviderWpdb extends \wpdb {
			public int $prepare_count = 0;
			public int $get_results_count = 0;

			/**
			 * @var list<string>
			 */
			public array $prepare_queries = array();

			/**
			 * @var list<list<mixed>>
			 */
			public array $prepare_args = array();

			/**
			 * @param list<list<array<string, mixed>>|false> $result_sets Result sets.
			 */
			public function __construct( private array $result_sets ) {
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
			 * @return list<array<string, mixed>>|false
			 */
			public function get_results( string $query, string $output_type ): array|false {
				++$this->get_results_count;

				return array_shift( $this->result_sets );
			}
		}
	}
}

namespace TCGStorePlatform\Tests\Unit {
	use TCGStorePlatform\Api\V1\OfflinePullRouteHandler;
	use TCGStorePlatform\Api\V1\OfflineRestRequestData;
	use TCGStorePlatform\Offline\OfflinePullChangeRepository;
	use TCGStorePlatform\Offline\OfflinePullChangeSetProvider;
	use TCGStorePlatform\Offline\OfflinePullRequest;
	use TCGStorePlatform\Tests\TestCase;

	final class OfflinePullChangeSetProviderTest extends TestCase {
		public function test_provider_fetches_repository_change_sets_from_request_context(): void {
			$database = new \OfflinePullChangeSetProviderWpdb(
				array(
					array( $this->inventory_row() ),
				)
			);
			$provider = $this->provider( $database );
			$result   = $provider->fetch( $this->pull_request() );
			$summary  = $provider->readiness_summary();

			$this->assert_true( $result->is_fetched() );
			$this->assert_same( 1, $database->prepare_count );
			$this->assert_same( 1, $database->get_results_count );
			$this->assert_contains( 'FROM `wp_tcg_inventory_items`', $database->prepare_queries[0] );
			$this->assert_same( array( 25 ), $database->prepare_args[0] );
			$this->assert_same( 'inventory_item', $result->change_sets()['inventory']['data'][0]['entity_type'] );
			$this->assert_same( 'inv-provider-01', $result->change_sets()['inventory']['data'][0]['entity_id'] );
			$this->assert_same( 'offline_pull_change_set_provider_ready', $summary['action'] );
			$this->assert_true( $summary['provider_ready'] );
			$this->assert_true( $summary['route_connection_deferred'] );
			$this->assert_true( $summary['cursor_advance_deferred'] );
		}

		public function test_provider_rejects_invalid_context_before_database_reads(): void {
			$database = new \OfflinePullChangeSetProviderWpdb(
				array(
					array( $this->inventory_row() ),
				)
			);
			$provider = new OfflinePullChangeSetProvider(
				new OfflinePullChangeRepository( $database ),
				0,
				'wp;bad_'
			);
			$result   = $provider->fetch( $this->pull_request() );
			$summary  = $provider->readiness_summary();

			$this->assert_true( $result->is_rejected() );
			$this->assert_same( 0, $database->prepare_count );
			$this->assert_true( in_array( 'offline_device_id_invalid', $result->errors(), true ) );
			$this->assert_true( in_array( 'table_prefix_invalid', $result->errors(), true ) );
			$this->assert_false( $summary['provider_ready'] );
			$this->assert_false( $summary['offline_device_context_ready'] );
			$this->assert_false( $summary['table_prefix_ready'] );
		}

		public function test_provider_can_be_injected_into_pull_handler_without_cursor_advancement(): void {
			$database = new \OfflinePullChangeSetProviderWpdb(
				array(
					array( $this->inventory_row() ),
				)
			);
			$handler  = new OfflinePullRouteHandler(
				null,
				null,
				$this->provider( $database ),
				static fn (): string => '2026-06-06T21:00:00Z'
			);
			$response = $handler->handle(
				new OfflineRestRequestData(
					array(
						'device_id'          => 'device-main-01',
						'domains'            => array( 'inventory' ),
						'cursors'            => array(),
						'page_size'          => 25,
						'include_tombstones' => true,
						'schema_version'     => 1,
					),
					array(),
					array(),
					array()
				)
			);

			$this->assert_same( 'ready', $response['status'] );
			$this->assert_same( 'offline_pull_response_ready', $response['code'] );
			$this->assert_same( 'inv-provider-01', $response['data']['domains']['inventory']['data'][0]['entity_id'] );
			$this->assert_true( $response['meta']['cursor_advance_deferred'] );
			$this->assert_true( $response['meta']['route_still_gated'] );
		}

		public function test_injected_provider_fails_closed_when_repository_rejects(): void {
			$handler = new OfflinePullRouteHandler(
				null,
				null,
				new OfflinePullChangeSetProvider(
					new OfflinePullChangeRepository( new \OfflinePullChangeSetProviderWpdb( array() ) ),
					0,
					'wp_'
				),
				static fn (): string => '2026-06-06T21:00:00Z'
			);
			$response = $handler->handle(
				new OfflineRestRequestData(
					array(
						'device_id'          => 'device-main-01',
						'domains'            => array( 'inventory' ),
						'cursors'            => array(),
						'page_size'          => 25,
						'include_tombstones' => true,
						'schema_version'     => 1,
					),
					array(),
					array(),
					array()
				)
			);

			$this->assert_same( 'invalid', $response['status'] );
			$this->assert_same( 'offline_pull_change_provider_failed', $response['code'] );
			$this->assert_same( array( 'change_set_provider_failed' ), $response['errors'] );
		}

		private function provider(
			\OfflinePullChangeSetProviderWpdb $database,
			int $offline_device_id = 25,
			string $table_prefix = 'wp_'
		): OfflinePullChangeSetProvider {
			return new OfflinePullChangeSetProvider(
				new OfflinePullChangeRepository( $database ),
				$offline_device_id,
				$table_prefix
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
		 * @return array<string, mixed>
		 */
		private function inventory_row(): array {
			return array(
				'inventory_id'      => '1001',
				'public_id'         => 'inv-provider-01',
				'game'              => 'mtg',
				'card_name'         => 'Lightning Bolt',
				'set_name'          => 'Magic Core Set',
				'set_code'          => 'MCS',
				'card_number'       => '150',
				'barcode'           => '123456789012',
				'sku'               => 'MTG-MCS-150',
				'sale_price'        => '4.99',
				'sale_currency'     => 'USD',
				'location_id'       => '2',
				'status'            => 'available',
				'online_visibility' => 'visible',
				'kiosk_visibility'  => 'visible',
				'pos_visibility'    => 'visible',
				'updated_at'        => '2026-06-06 21:00:00',
				'row_version'       => '7',
			);
		}
	}
}
