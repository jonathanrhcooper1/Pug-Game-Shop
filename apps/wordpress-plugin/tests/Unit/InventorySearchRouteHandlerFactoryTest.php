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
				string $prefix = 'wp_',
				private array|false $variant_result_set = array()
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

				if ( str_contains( $query, 'tcg_reference_variants' ) ) {
					return $this->variant_result_set;
				}

				return $this->result_set;
			}

			public function get_var( string $query ): mixed {
				++$this->get_var_count;

				return $this->count_result;
			}

			public function query( string $query ): int|false {
				++$this->query_count;
				$this->last_query = $query;

				return 1;
			}
		}
	}
}

namespace TCGStorePlatform\Tests\Unit {
	use RuntimeException;
	use TCGStorePlatform\Api\V1\InventorySearchRouteHandler;
	use TCGStorePlatform\Api\V1\InventorySearchRouteHandlerFactory;
	use TCGStorePlatform\Api\V1\OfflineRestRequestData;
	use TCGStorePlatform\Api\V1\ReferenceCardSearchRouteHandler;
	use TCGStorePlatform\Inventory\InventorySearchRepository;
	use TCGStorePlatform\ScryDex\ScryDexPersistenceRepository;
	use TCGStorePlatform\ScryDex\ScryDexProvider;
	use TCGStorePlatform\ScryDex\ScryDexResult;
	use TCGStorePlatform\Tests\TestCase;

	final class ReferenceSearchFallbackProvider implements ScryDexProvider {
		public int $search_count = 0;
		public string $last_query = '';

		/**
		 * @var array<string, string>
		 */
		public array $last_filters = array();

		public function __construct(
			private ScryDexResult $result
		) {
		}

		/**
		 * @param array<string, string> $filters Provider search filters.
		 */
		public function search_cards(
			string $query = '',
			array $filters = array(),
			int $page = 1,
			string $cursor = ''
		): ScryDexResult {
			unset( $page, $cursor );

			++$this->search_count;
			$this->last_query   = $query;
			$this->last_filters = $filters;

			return $this->result;
		}

		public function get_card( string $provider_card_id ): ScryDexResult {
			unset( $provider_card_id );

			return ScryDexResult::not_supported( 'unused in reference search tests' );
		}

		public function search_expansions(
			string $query = '',
			array $filters = array(),
			int $page = 1,
			string $cursor = ''
		): ScryDexResult {
			unset( $query, $filters, $page, $cursor );

			return ScryDexResult::not_supported( 'unused in reference search tests' );
		}

		public function search_expansion_cards(
			string $expansion_id,
			string $query = '',
			array $filters = array(),
			int $page = 1,
			string $cursor = ''
		): ScryDexResult {
			unset( $expansion_id, $query, $filters, $page, $cursor );

			return ScryDexResult::not_supported( 'unused in reference search tests' );
		}

		public function get_usage(): ScryDexResult {
			return ScryDexResult::not_supported( 'unused in reference search tests' );
		}

		public function register_webhook( string $event_type, string $callback_url ): ScryDexResult {
			unset( $event_type, $callback_url );

			return ScryDexResult::not_supported( 'unused in reference search tests' );
		}
	}

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

		public function test_reference_handler_returns_catalog_cards_with_images_and_price(): void {
			$database = new \InventorySearchRouteHandlerWpdb(
				array( $this->reference_card_row() ),
				'1',
				'wp_',
				array( $this->reference_variant_row() )
			);
			$handler  = new ReferenceCardSearchRouteHandler( $database, 'wp_' );

			$response = $handler->search_reference_cards(
				$this->request(
					array(
						'q'     => 'moonbreon',
						'game'  => 'pokemon',
						'limit' => '8',
					)
				)
			);

			$this->assert_same( 'ready', $response['status'] );
			$this->assert_same( 200, $response['status_code'] );
			$this->assert_same( 'reference_search_read_ready', $response['code'] );
			$this->assert_same( 2, $database->get_results_count );
			$this->assert_same( 1, $database->get_var_count );
			$this->assert_same( 3, $database->prepare_count );
			$this->assert_same( 1, $response['data']['meta']['total'] );
			$this->assert_same( 'wordpress_catalog_cache', $response['data']['source'] );
			$this->assert_same( 'scrydex-pokemon-evs-215', $response['data']['cards'][0]['provider_card_id'] );
			$this->assert_same( 'Umbreon VMAX', $response['data']['cards'][0]['card_name'] );
			$this->assert_same( 'https://images.pokemontcg.io/swsh7/215_hires.png', $response['data']['cards'][0]['image_url'] );
			$this->assert_same( 112045, $response['data']['cards'][0]['market_price_minor_units'] );
			$this->assert_same( 'scrydex-pokemon-evs-215-alt-art', $response['data']['cards'][0]['variants'][0]['provider_variant_id'] );
			$this->assert_same( 'Alternate Art Secret', $response['data']['cards'][0]['variants'][0]['variant'] );
			$this->assert_false( $response['data']['cards'][0]['credentials_in_response'] );
			$this->assert_false( $response['data']['meta']['live_provider_request'] );
		}

		public function test_reference_handler_fetches_and_persists_provider_card_on_cache_miss(): void {
			$database = new \InventorySearchRouteHandlerWpdb( array(), '0', 'wp_' );
			$provider = new ReferenceSearchFallbackProvider(
				new ScryDexResult(
					ScryDexResult::SUCCESS,
					200,
					array(
						'data' => array( $this->provider_reference_card() ),
					)
				)
			);
			$handler  = new ReferenceCardSearchRouteHandler(
				$database,
				'wp_',
				$provider,
				new ScryDexPersistenceRepository( $database )
			);

			$response = $handler->search_reference_cards(
				$this->request(
					array(
						'q'     => 'moonbreon',
						'game'  => 'pokemon',
						'limit' => '8',
					)
				)
			);

			$this->assert_same( 'ready', $response['status'] );
			$this->assert_same( 'scrydex_provider', $response['data']['source'] );
			$this->assert_same( 1, $provider->search_count );
			$this->assert_same( 'moonbreon', $provider->last_query );
			$this->assert_same( 'pokemon', $provider->last_filters['game'] );
			$this->assert_same( '8', $provider->last_filters['page_size'] );
			$this->assert_same( 'prices', $provider->last_filters['include'] );
			$this->assert_true( $database->query_count > 0 );
			$this->assert_true( $response['data']['meta']['live_provider_request'] );
			$this->assert_false( $response['data']['meta']['credentials_in_response'] );
			$this->assert_same( 'completed', $response['data']['meta']['scrydex_fallback_status'] );
			$this->assert_same( 'executed', $response['data']['meta']['scrydex_persistence_status'] );
			$this->assert_same( array(), $response['data']['meta']['scrydex_persistence_errors'] );
			$this->assert_same( 'scrydex-pokemon-evs-215', $response['data']['cards'][0]['provider_card_id'] );
			$this->assert_same( 'Umbreon VMAX', $response['data']['cards'][0]['card_name'] );
			$this->assert_same( 'https://images.pokemontcg.io/swsh7/215_hires.png', $response['data']['cards'][0]['image_url'] );
			$this->assert_same( 112045, $response['data']['cards'][0]['market_price_minor_units'] );
			$this->assert_same( 'scrydex-pokemon-evs-215-alt-art', $response['data']['cards'][0]['variants'][0]['provider_variant_id'] );
			$this->assert_true( $response['data']['cards'][0]['live_provider_request'] );
			$this->assert_false( $response['data']['cards'][0]['credentials_in_response'] );
		}

		public function test_reference_handler_reports_provider_failure_without_secrets_on_cache_miss(): void {
			$database = new \InventorySearchRouteHandlerWpdb( array(), '0', 'wp_' );
			$provider = new ReferenceSearchFallbackProvider(
				new ScryDexResult(
					ScryDexResult::UNAUTHORIZED,
					403,
					array(),
					'scrydex_unauthorized',
					'Configured key abcdefghijklmnopqrstuvwxyz123456 was rejected.'
				)
			);
			$handler  = new ReferenceCardSearchRouteHandler( $database, 'wp_', $provider );

			$response = $handler->search_reference_cards(
				$this->request(
					array(
						'q'    => 'moonbreon',
						'game' => 'pokemon',
					)
				)
			);

			$this->assert_same( 'ready', $response['status'] );
			$this->assert_same( array(), $response['data']['cards'] );
			$this->assert_same( 1, $provider->search_count );
			$this->assert_true( $response['data']['meta']['live_provider_request'] );
			$this->assert_false( $response['data']['meta']['credentials_in_response'] );
			$this->assert_same( 'blocked', $response['data']['meta']['scrydex_fallback_status'] );
			$this->assert_same( 'scrydex_unauthorized', $response['data']['meta']['scrydex_provider_error_code'] );
			$this->assert_false(
				str_contains( (string) $response['data']['meta']['scrydex_provider_message'], 'abcdefghijklmnopqrstuvwxyz123456' )
			);
			$this->assert_same( 0, $database->query_count );
		}

		public function test_reference_handler_rejects_empty_query_before_repository_reads(): void {
			$database = new \InventorySearchRouteHandlerWpdb( array( $this->reference_card_row() ), '1' );
			$handler  = new ReferenceCardSearchRouteHandler( $database, 'wp_' );

			$response = $handler->search_reference_cards( $this->request( array( 'q' => '' ) ) );

			$this->assert_same( 'invalid', $response['status'] );
			$this->assert_same( 'reference_search_request_invalid', $response['code'] );
			$this->assert_true( in_array( 'reference_search_query_required', $response['errors'], true ) );
			$this->assert_same( 0, $database->prepare_count );
			$this->assert_true( $response['meta']['reference_repository_deferred'] );
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
			$this->assert_true( $summary['reference_search_handler_ready'] );
			$this->assert_false( $summary['route_connected_reads_deferred'] );
			$this->assert_true( is_callable( $handlers['search_inventory_items'] ?? null ) );
			$this->assert_true( is_callable( $handlers['search_reference_cards'] ?? null ) );

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

			$reference_response = $handlers['search_reference_cards'](
				$this->request(
					array(
						'q'    => 'Charizard',
						'game' => 'pokemon',
					)
				)
			);

			$this->assert_same( 'ready', $reference_response['status'] );
			$this->assert_same( 'Charizard', $reference_response['data']['cards'][0]['card_name'] );
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
				'provider_name'           => 'scrydex',
				'provider_card_id'        => 'scrydex-pokemon-base-004',
				'game'                    => 'pokemon',
				'name'                    => 'Charizard',
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
				'front_image_url'         => 'https://example.test/front.jpg',
				'back_image_url'          => '',
				'provider_updated_at'     => '2026-06-07 11:00:00.000000',
				'price_observed_at'       => '2026-06-07 11:30:00.000000',
				'notes'                   => '',
				'staff_notes'             => 'Case A',
				'updated_at'              => '2026-06-07 12:00:00.000000',
				'row_version'             => '7',
			);
		}

		/**
		 * @return array<string, mixed>
		 */
		private function reference_card_row(): array {
			return array(
				'reference_card_id'    => '215',
				'public_id'             => 'reference-public-215',
				'provider_name'         => 'scrydex',
				'provider_card_id'      => 'scrydex-pokemon-evs-215',
				'game'                  => 'pokemon',
				'name'                  => 'Umbreon VMAX',
				'set_name'              => 'Evolving Skies',
				'set_code'              => 'EVS',
				'card_number'           => '215',
				'printed_number'        => '215/203',
				'front_image_url'       => 'https://images.pokemontcg.io/swsh7/215_hires.png',
				'back_image_url'        => '',
				'provider_updated_at'   => '2026-06-08 12:00:00',
				'updated_at'            => '2026-06-08 12:30:00',
				'row_version'           => '3',
				'market_price'          => '1120.4500',
				'market_price_currency' => 'USD',
				'price_observed_at'     => '2026-06-08 12:10:00',
			);
		}

		/**
		 * @return array<string, mixed>
		 */
		private function reference_variant_row(): array {
			return array(
				'reference_card_id'          => '215',
				'provider_variant_id'        => 'scrydex-pokemon-evs-215-alt-art',
				'variant'                    => 'Alternate Art Secret',
				'finish'                     => 'Foil',
				'parallel_name'              => 'Secret Rare',
				'edition'                    => 'First Printing',
				'language'                   => 'English',
				'raw_or_graded_support'      => 'both',
				'normalized_attributes_json' => '{"variant":"Alternate Art Secret","finish":"Foil"}',
			);
		}

		/**
		 * @return array<string, mixed>
		 */
		private function provider_reference_card(): array {
			return array(
				'id'             => 'scrydex-pokemon-evs-215',
				'game'           => 'pokemon',
				'name'           => 'Umbreon VMAX',
				'set'            => array(
					'name' => 'Evolving Skies',
					'code' => 'EVS',
				),
				'number'         => '215',
				'printed_number' => '215/203',
				'images'         => array(
					'large' => 'https://images.pokemontcg.io/swsh7/215_hires.png',
					'small' => 'https://images.pokemontcg.io/swsh7/215.png',
				),
				'market_price'   => array(
					'amount'   => '1120.45',
					'currency' => 'USD',
				),
				'updated_at'     => '2026-06-08T16:00:00Z',
				'variants'       => array(
					array(
						'provider_variant_id'   => 'scrydex-pokemon-evs-215-alt-art',
						'variant'               => 'Alternate Art Secret',
						'finish'                => 'Foil',
						'parallel_name'         => 'Secret Rare',
						'edition'               => 'First Printing',
						'language'              => 'English',
						'raw_or_graded_support' => 'both',
					),
				),
			);
		}
	}
}
