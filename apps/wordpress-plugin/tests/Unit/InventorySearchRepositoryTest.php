<?php
/**
 * Inventory search repository tests.
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

	if ( ! class_exists( 'InventorySearchWpdb' ) ) {
		class InventorySearchWpdb extends \wpdb {
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
			 * @var list<string>
			 */
			public array $executed_queries = array();

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
				$this->executed_queries[] = $query;
				$this->last_output_type   = $output_type;

				return $this->result_set;
			}

			public function get_var( string $query ): mixed {
				++$this->get_var_count;
				$this->executed_queries[] = $query;

				return $this->count_result;
			}
		}
	}
}

namespace TCGStorePlatform\Tests\Unit {
	use TCGStorePlatform\Inventory\InventorySearchQueryPlanner;
	use TCGStorePlatform\Inventory\InventorySearchRepository;
	use TCGStorePlatform\Inventory\InventorySearchRequest;
	use TCGStorePlatform\Tests\TestCase;

	final class InventorySearchRepositoryTest extends TestCase {
		public function test_repository_fetches_inventory_rows_and_total_count(): void {
			$database = new \InventorySearchWpdb( array( $this->inventory_row() ), '7' );
			$result   = ( new InventorySearchRepository( $database ) )->fetch(
				$this->query_plan()
			);
			$rows     = $result->rows();
			$audit    = $result->audit_payload();

			$this->assert_true( $result->is_fetched() );
			$this->assert_same( 'fetched', $result->status() );
			$this->assert_same( 1, $database->get_results_count );
			$this->assert_same( 1, $database->get_var_count );
			$this->assert_same( 2, $database->prepare_count );
			$this->assert_contains( 'FROM `wp_tcg_inventory_items`', $database->prepare_queries[0] );
			$this->assert_contains( 'SELECT COUNT(*) FROM `wp_tcg_inventory_items`', $database->prepare_queries[1] );
			$this->assert_same( 'ARRAY_A', $database->last_output_type );
			$this->assert_same( 7, $result->total() );
			$this->assert_same( 42, $rows[0]['inventory_id'] );
			$this->assert_same( 'card-public-42', $rows[0]['public_id'] );
			$this->assert_same( 'pokemon', $rows[0]['game'] );
			$this->assert_same( 'Charizard', $rows[0]['card_name'] );
			$this->assert_same( '125.00', $rows[0]['sale_price'] );
			$this->assert_same( true, $rows[0]['price_lock'] );
			$this->assert_same( 7, $rows[0]['row_version'] );
			$this->assert_same( '2026-06-07T12:00:00.000000Z', $rows[0]['updated_at'] );
			$this->assert_same( 'inventory_search_repository_fetch', $audit['action'] );
			$this->assert_same( 1, $audit['row_count'] );
			$this->assert_same( 7, $audit['total'] );
			$this->assert_false( $audit['fetch']['inventory_repository_deferred'] );
			$this->assert_true( $audit['route_connected_reads_deferred'] );
			$this->assert_true( $audit['square_inventory_projection_deferred'] );
		}

		public function test_repository_rejects_invalid_query_plan_before_database_reads(): void {
			$database = new \InventorySearchWpdb( array( $this->inventory_row() ), '1' );
			$result   = ( new InventorySearchRepository( $database ) )->fetch(
				( new InventorySearchQueryPlanner() )->plan(
					new InventorySearchRequest( '', '', array(), null, 'public', 'relevance', 1, 25 ),
					'wp;drop_'
				)
			);

			$this->assert_true( $result->is_rejected() );
			$this->assert_same( array(), $result->rows() );
			$this->assert_same( 0, $database->prepare_count );
			$this->assert_same( 0, $database->get_results_count );
			$this->assert_same( 0, $database->get_var_count );
			$this->assert_true( in_array( 'inventory_search_query_plan_invalid', $result->errors(), true ) );
			$this->assert_true( in_array( 'table_prefix_invalid', $result->errors(), true ) );
		}

		public function test_repository_rejects_table_prefix_mismatch_before_reads(): void {
			$database = new \InventorySearchWpdb( array( $this->inventory_row() ), '1', 'shop_' );
			$result   = ( new InventorySearchRepository( $database ) )->fetch(
				$this->query_plan()
			);

			$this->assert_true( $result->is_rejected() );
			$this->assert_same( 0, $database->prepare_count );
			$this->assert_same( 0, $database->get_results_count );
			$this->assert_same( 0, $database->get_var_count );
			$this->assert_same( array( 'inventory_search_table_prefix_mismatch' ), $result->errors() );
		}

		public function test_repository_rejects_database_failures_and_malformed_rows(): void {
			$failed_database = new \InventorySearchWpdb( false, '1' );
			$failed_result   = ( new InventorySearchRepository( $failed_database ) )->fetch(
				$this->query_plan()
			);

			$this->assert_true( $failed_result->is_rejected() );
			$this->assert_same( array( 'inventory_search_query_failed' ), $failed_result->errors() );

			$count_failed_database = new \InventorySearchWpdb( array( $this->inventory_row() ), 'bad' );
			$count_failed_result   = ( new InventorySearchRepository( $count_failed_database ) )->fetch(
				$this->query_plan()
			);

			$this->assert_true( $count_failed_result->is_rejected() );
			$this->assert_same( array( 'inventory_search_count_failed' ), $count_failed_result->errors() );

			$bad_database = new \InventorySearchWpdb(
				array(
					$this->inventory_row(
						array(
							'inventory_id'  => '0',
							'public_id'     => 'bad value',
							'game'          => 'bad game',
							'card_name'     => '',
							'raw_or_graded' => 'sealed',
							'status'        => 'lost',
							'sale_currency' => 'US1',
							'updated_at'    => 'not-a-date',
							'row_version'   => '0',
						)
					),
				),
				'1'
			);
			$bad_result   = ( new InventorySearchRepository( $bad_database ) )->fetch(
				$this->query_plan()
			);

			$this->assert_true( $bad_result->is_rejected() );
			$this->assert_true( in_array( 'inventory_search_row_0_inventory_id_invalid', $bad_result->errors(), true ) );
			$this->assert_true( in_array( 'inventory_search_row_0_public_id_invalid', $bad_result->errors(), true ) );
			$this->assert_true( in_array( 'inventory_search_row_0_game_invalid', $bad_result->errors(), true ) );
			$this->assert_true( in_array( 'inventory_search_row_0_card_name_invalid', $bad_result->errors(), true ) );
			$this->assert_true( in_array( 'inventory_search_row_0_raw_or_graded_invalid', $bad_result->errors(), true ) );
			$this->assert_true( in_array( 'inventory_search_row_0_status_invalid', $bad_result->errors(), true ) );
			$this->assert_true( in_array( 'inventory_search_row_0_sale_currency_invalid', $bad_result->errors(), true ) );
			$this->assert_true( in_array( 'inventory_search_row_0_row_version_invalid', $bad_result->errors(), true ) );
			$this->assert_true( in_array( 'inventory_search_row_0_updated_at_invalid', $bad_result->errors(), true ) );
		}

		private function query_plan(): \TCGStorePlatform\Inventory\InventorySearchQueryPlan {
			return ( new InventorySearchQueryPlanner() )->plan(
				new InventorySearchRequest(
					'Charizard',
					'pokemon',
					array(),
					null,
					'public',
					'price_desc',
					1,
					25
				),
				'wp_'
			);
		}

		/**
		 * @param array<string, mixed> $overrides Row overrides.
		 * @return array<string, mixed>
		 */
		private function inventory_row( array $overrides = array() ): array {
			return array_merge(
				array(
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
				),
				$overrides
			);
		}
	}
}
