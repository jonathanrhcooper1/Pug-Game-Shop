<?php
/**
 * Inventory search route handler and factory tests.
 *
 * @package TCGStorePlatform
 */

namespace {
	if ( ! class_exists( 'wpdb' ) ) {
		class wpdb {
			public string $prefix = 'wp_';
			public int $insert_id = 77;
			public int $prepare_count = 0;
			public int $get_row_count = 0;
			public int $get_results_count = 0;
			public int $get_var_count = 0;
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
				private int|false $query_result = 1,
				private array|false $result_set = array(),
				private mixed $var_result = 0
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

			/**
			 * @return list<array<string, mixed>>|false
			 */
			public function get_results( string $query, string $output_type ): array|false {
				++$this->get_results_count;
				$this->last_query       = $query;
				$this->last_output_type = $output_type;

				return $this->result_set;
			}

			public function get_var( string $query ): mixed {
				++$this->get_var_count;
				$this->last_query = $query;

				return $this->var_result;
			}

			public function query( string $query ): int|false {
				++$this->query_count;
				$this->last_query = $query;

				return $this->query_result;
			}
		}
	}

	if ( ! class_exists( 'InventorySearchRouteHandlerWpdb' ) ) {
		class InventorySearchRouteHandlerWpdb extends \wpdb {
			public string $prefix = 'wp_';
			public int $prepare_count = 0;
			public int $get_results_count = 0;
			public int $get_var_count = 0;
			public string $last_output_type = '';

			/**
			 * @var list<string>
			 */
			public array $prepare_queries = array();

			/**
			 * @var list<list<mixed>>
			 */
			public array $prepare_args = array();

			/**
			 * @param list<array<string, mixed>>|false $result_set Rows returned by get_results.
			 */
			public function __construct(
				private array|false $result_set = array(),
				private mixed $count_result = 0,
				string $prefix = 'wp_'
			) {
				$this->prefix = $prefix;
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
				$this->last_output_type = $output_type;

				return $this->result_set;
			}

			public function get_var( string $query ): mixed {
				++$this->get_var_count;

				return $this->count_result;
			}
		}
	}
}

namespace TCGStorePlatform\Tests\Unit {
	use RuntimeException;
	use TCGStorePlatform\Api\V1\InventorySearchRouteHandler;
	use TCGStorePlatform\Api\V1\InventorySearchRouteHandlerFactory;
	use TCGStorePlatform\Api\V1\OfflineRestRequestData;
	use TCGStorePlatform\Inventory\InventorySearchRepository;
	use TCGStorePlatform\Tests\TestCase;

	final class InventorySearchRouteHandlerFactoryTest extends TestCase {
		public function test_handler_returns_presented_public_inventory_search_results(): void {
			$database = new \InventorySearchRouteHandlerWpdb( array( $this->inventory_row() ), '3' );
			$handler  = new InventorySearchRouteHandler(
				new InventorySearchRepository( $database ),
				null,
				null,
				'wp_'
			);

			$response = $handler->search_inventory_items(
				$this->request(
					array(
						'q'         => 'Charizard',
						'game'      => 'pokemon',
						'sort'      => 'price_desc',
						'page'      => '1',
						'page_size' => '25',
					)
				)
			);

			$this->assert_same( 'ready', $response['status'] );
			$this->assert_same( 200, $response['status_code'] );
			$this->assert_same( 'inventory_search_read_ready', $response['code'] );
			$this->assert_same( 1, $database->get_results_count );
			$this->assert_same( 1, $database->get_var_count );
			$this->assert_same( 2, $database->prepare_count );
			$this->assert_same( 3, $response['data']['meta']['total'] );
			$this->assert_true( $response['data']['meta']['public_redaction'] );
			$this->assert_same( 'Charizard', $response['data']['items'][0]['card_name'] );
			$this->assert_false( array_key_exists( 'barcode', $response['data']['items'][0] ) );
			$this->assert_false( array_key_exists( 'inventory_id', $response['data']['items'][0] ) );
			$this->assert_false( $response['meta']['route_connected_reads_deferred'] );
			$this->assert_true( $response['meta']['route_connected_writes_deferred'] );
			$this->assert_same( 'fetched', $response['meta']['repository']['status'] );
		}

		public function test_handler_rejects_invalid_query_before_repository_reads(): void {
			$database = new \InventorySearchRouteHandlerWpdb( array( $this->inventory_row() ), '1' );
			$handler  = new InventorySearchRouteHandler(
				new InventorySearchRepository( $database ),
				null,
				null,
				'wp_'
			);

			$response = $handler->search_inventory_items(
				$this->request(
					array(
						'page' => '0',
						'sort' => 'bad-sort',
					)
				)
			);

			$this->assert_same( 'invalid', $response['status'] );
			$this->assert_same( 'inventory_search_request_invalid', $response['code'] );
			$this->assert_same( 0, $database->prepare_count );
			$this->assert_same( 0, $database->get_results_count );
			$this->assert_true( in_array( 'page_invalid', $response['errors'], true ) );
			$this->assert_true( in_array( 'sort_invalid', $response['errors'], true ) );
			$this->assert_true( $response['meta']['route_connected_reads_deferred'] );
			$this->assert_true( $response['meta']['inventory_repository_deferred'] );
		}

		public function test_handler_rejects_repository_failures(): void {
			$database = new \InventorySearchRouteHandlerWpdb( false, '1' );
			$handler  = new InventorySearchRouteHandler(
				new InventorySearchRepository( $database ),
				null,
				null,
				'wp_'
			);

			$response = $handler->search_inventory_items(
				$this->request(
					array(
						'q' => 'Charizard',
					)
				)
			);

			$this->assert_same( 'invalid', $response['status'] );
			$this->assert_same( 'inventory_search_repository_rejected', $response['code'] );
			$this->assert_true( in_array( 'inventory_search_query_failed', $response['errors'], true ) );
			$this->assert_same( 'rejected', $response['meta']['repository']['status'] );
		}

		public function test_factory_defers_default_route_connected_reads(): void {
			$database = new \InventorySearchRouteHandlerWpdb( array( $this->inventory_row() ), '1' );
			$factory  = new InventorySearchRouteHandlerFactory(
				static fn (): \wpdb => $database
			);
			$summary  = $factory->readiness_summary();

			$this->assert_same( 'inventory_search_route_handler_factory_ready', $summary['action'] );
			$this->assert_false( $summary['route_connected_reads_enabled'] );
			$this->assert_true( $summary['database_configured'] );
			$this->assert_true( $summary['table_prefix_ready'] );
			$this->assert_false( $summary['repository_configured'] );
			$this->assert_true( $summary['route_connected_reads_deferred'] );
			$this->assert_same( array(), $summary['configuration_issues'] );
			$this->assert_same( array(), $factory->handlers() );
			$this->assert_same( null, $factory->handler() );
		}

		public function test_factory_composes_enabled_repository_backed_handler(): void {
			$database = new \InventorySearchRouteHandlerWpdb( array( $this->inventory_row() ), '1' );
			$factory  = new InventorySearchRouteHandlerFactory(
				static fn (): \wpdb => $database,
				true
			);
			$summary  = $factory->readiness_summary();
			$handlers = $factory->handlers();

			$this->assert_true( $summary['route_connected_reads_enabled'] );
			$this->assert_true( $summary['repository_configured'] );
			$this->assert_true( $summary['route_connected_handler_ready'] );
			$this->assert_false( $summary['route_connected_reads_deferred'] );
			$this->assert_true( is_callable( $handlers['search_inventory_items'] ?? null ) );

			$response = $handlers['search_inventory_items'](
				$this->request(
					array(
						'visibility' => 'staff',
						'status'     => 'available',
					)
				)
			);

			$this->assert_same( 'ready', $response['status'] );
			$this->assert_false( $response['data']['meta']['public_redaction'] );
			$this->assert_same( 'PKM-BASE-004-HOLO', $response['data']['items'][0]['barcode'] );
		}

		public function test_factory_reports_provider_and_prefix_issues(): void {
			$failed_factory = new InventorySearchRouteHandlerFactory(
				static function (): \wpdb {
					throw new RuntimeException( 'database unavailable' );
				},
				true
			);
			$failed_summary = $failed_factory->readiness_summary();

			$this->assert_false( $failed_summary['database_configured'] );
			$this->assert_true( in_array( 'database_provider_failed', $failed_summary['configuration_issues'], true ) );

			$prefix_factory = new InventorySearchRouteHandlerFactory(
				static fn (): \wpdb => new \InventorySearchRouteHandlerWpdb( array(), '0', 'wp-bad_' ),
				true
			);
			$prefix_summary = $prefix_factory->readiness_summary();

			$this->assert_true( $prefix_summary['database_configured'] );
			$this->assert_false( $prefix_summary['table_prefix_ready'] );
			$this->assert_true( in_array( 'table_prefix_invalid', $prefix_summary['configuration_issues'], true ) );
			$this->assert_same( array(), $prefix_factory->handlers() );
		}

		/**
		 * @param array<string, mixed> $query Query params.
		 */
		private function request( array $query ): OfflineRestRequestData {
			return new OfflineRestRequestData( array(), $query, array(), array() );
		}

		/**
		 * @return array<string, mixed>
		 */
		private function inventory_row(): array {
			return array(
				'inventory_id'            => '42',
				'public_id'               => 'card-public-42',
				'game'                    => 'pokemon',
				'card_name'               => 'Charizard',
				'set_name'                => 'Base Set',
				'set_code'                => 'BASE',
				'card_number'             => '4',
				'printed_number'          => '4/102',
				'year'                    => '1999',
				'rarity'                  => 'Rare Holo',
				'rarity_code'             => 'RH',
				'variant'                 => '',
				'finish'                  => 'Holo',
				'parallel_name'           => '',
				'language'                => 'EN',
				'raw_or_graded'           => 'raw',
				'condition_code'          => 'NM',
				'grading_company'         => '',
				'grade'                   => '',
				'cert_number'             => '',
				'barcode'                 => 'PKM-BASE-004-HOLO',
				'sku'                     => 'PKM-BASE-004-HOLO',
				'cost'                    => '80.00',
				'cost_currency'           => 'USD',
				'market_price'            => '130.00',
				'market_price_currency'   => 'USD',
				'suggested_price'         => '143.00',
				'sale_price'              => '125.00',
				'minimum_sale_price'      => '100.00',
				'sale_currency'           => 'USD',
				'price_lock'              => '1',
				'price_floor_hit'         => '0',
				'location_id'             => '2',
				'online_visibility'       => 'visible',
				'kiosk_visibility'        => 'visible',
				'pos_visibility'          => 'visible',
				'status'                  => 'available',
				'front_image_remote_url'  => 'https://example.test/front.jpg',
				'back_image_remote_url'   => '',
				'notes'                   => '',
				'staff_notes'             => 'Case A',
				'updated_at'              => '2026-06-07 12:00:00.000000',
				'row_version'             => '7',
			);
		}
	}
}
