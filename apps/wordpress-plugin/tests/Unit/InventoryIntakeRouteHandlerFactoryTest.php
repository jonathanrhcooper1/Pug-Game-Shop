<?php
/**
 * Inventory intake route handler and factory tests.
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
			private ?array $row = null;
			private int|false $query_result = 1;
			private array $query_results = array();
			private array|false $result_set = array();
			private mixed $var_result = 0;

			/**
			 * @var list<mixed>
			 */
			public array $last_prepare_args = array();

			/**
			 * @param array<string, mixed>|null $row Row returned by get_row.
			 */
			public function __construct(
				?array $row = null,
				int|false|array $query_result = 1,
				array|false $result_set = array(),
				mixed $var_result = 0
			) {
				$this->row          = $row;
				if ( is_array( $query_result ) ) {
					$this->query_results = array_values( $query_result );
				} else {
					$this->query_result = $query_result;
				}
				$this->result_set   = $result_set;
				$this->var_result   = $var_result;
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

				if ( array() !== $this->query_results ) {
					return array_shift( $this->query_results );
				}

				return $this->query_result;
			}
		}
	}

	if ( ! class_exists( 'InventoryIntakeRouteHandlerWpdb' ) ) {
		class InventoryIntakeRouteHandlerWpdb extends \wpdb {
			public string $prefix = 'wp_';
			public int $insert_id = 909;
			public int $prepare_count = 0;
			public int $get_row_count = 0;
			public int $query_count = 0;
			public string $last_prepare_query = '';
			public string $last_query = '';
			public string $last_output_type = '';
			public array $prepare_queries = array();
			public array $queries = array();
			private int|false $query_result = 1;
			private array $query_results = array();
			private ?array $row = null;

			/**
			 * @var list<mixed>
			 */
			public array $last_prepare_args = array();

			public function __construct(
				int|false|array $query_result = 1,
				string $prefix = 'wp_',
				int $insert_id = 909
			) {
				$this->prefix    = $prefix;
				$this->insert_id = $insert_id;
				if ( is_array( $query_result ) ) {
					$this->query_results = array_values( $query_result );
				} else {
					$this->query_result = $query_result;
				}
			}

			/**
			 * @param list<mixed> $args Prepared arguments.
			 */
			public function prepare( string $query, array $args ): string {
				++$this->prepare_count;
				$this->last_prepare_query = $query;
				$this->last_prepare_args  = array_values( $args );
				$this->prepare_queries[]  = $query;

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
				$this->queries[]  = $query;

				if ( array() !== $this->query_results ) {
					return array_shift( $this->query_results );
				}

				return $this->query_result;
			}
		}
	}
}

namespace TCGStorePlatform\Tests\Unit {
	use RuntimeException;
	use TCGStorePlatform\Api\V1\InventoryIntakeRouteHandler;
	use TCGStorePlatform\Api\V1\InventoryIntakeRouteHandlerFactory;
	use TCGStorePlatform\Api\V1\OfflineRestRequestData;
	use TCGStorePlatform\Inventory\InventoryIntakeRepository;
	use TCGStorePlatform\Inventory\InventoryStatus;
	use TCGStorePlatform\Tests\TestCase;

	final class InventoryIntakeRouteHandlerFactoryTest extends TestCase {
		public function test_handler_creates_inventory_item_through_staged_repository(): void {
			$database = new \InventoryIntakeRouteHandlerWpdb();
			$handler  = new InventoryIntakeRouteHandler(
				new InventoryIntakeRepository( $database ),
				null,
				null,
				'wp_'
			);

			$response = $handler->create_inventory_item(
				$this->request( $this->valid_body(), 'header-intake-1' )
			);

			$this->assert_same( 'created', $response['status'] );
			$this->assert_same( 201, $response['status_code'] );
			$this->assert_same( 'inventory_item_created', $response['code'] );
			$this->assert_same( 909, $response['data']['inventory_id'] );
			$this->assert_same( 'PCS-000001', $response['data']['barcode'] );
			$this->assert_true( $response['data']['price_change_log_persisted'] );
			$this->assert_same( 1, $response['data']['price_change_log_row_count'] );
			$this->assert_same( 3, $database->prepare_count );
			$this->assert_same( 1, $database->get_row_count );
			$this->assert_same( 4, $database->query_count );
			$this->assert_contains( 'INSERT INTO `wp_tcg_inventory_items`', $database->prepare_queries[1] );
			$this->assert_contains( 'INSERT INTO `wp_tcg_price_change_log`', $database->prepare_queries[2] );
			$this->assert_same( 'COMMIT', $database->last_query );
			$this->assert_false( $response['meta']['route_connected_writes_deferred'] );
			$this->assert_true( $response['meta']['route_registration_deferred'] );
			$this->assert_true( $response['meta']['woocommerce_projection_deferred'] );
			$this->assert_false( $response['meta']['external_projection_planning_deferred'] );
			$this->assert_same( 'inventory_external_projection_plans', $response['meta']['projections']['action'] );
			$this->assert_same( 'planned', $response['meta']['projections']['status'] );
			$this->assert_same( 1, $response['meta']['projections']['operation_count'] );
			$this->assert_true( $response['meta']['projections']['network_request_deferred'] );
			$this->assert_same( 'woocommerce', $response['meta']['projections']['woocommerce_product_projection']['provider'] );
			$this->assert_same( 'ready', $response['meta']['projections']['woocommerce_product_projection']['status'] );
			$this->assert_same( true, $response['meta']['projections']['woocommerce_product_projection']['woocommerce_write_deferred'] );
			$this->assert_same( 'create_product', $response['meta']['projections']['woocommerce_product_projection']['product_operations'][0]['operation'] );
			$this->assert_same( 'PCS-PIKA-000001', $response['meta']['projections']['woocommerce_product_projection']['product_operations'][0]['product']['sku'] );
			$this->assert_same( 'square', $response['meta']['projections']['square_inventory_projection']['provider'] );
			$this->assert_same( true, $response['meta']['projections']['square_inventory_projection']['network_request_deferred'] );
			$this->assert_true( in_array( 'square_location_id_required', $response['meta']['projections']['square_inventory_projection']['errors'], true ) );
			$this->assert_same( 'inserted', $response['meta']['repository']['status'] );
			$this->assert_true( $response['meta']['repository']['price_change_log_persisted'] );
			$this->assert_true( $response['meta']['repository']['transaction_committed'] );
			$this->assert_not_contains( 'header-intake-1', (string) json_encode( $response['meta'] ) );
		}

		public function test_handler_rejects_invalid_payload_before_repository_writes(): void {
			$database = new \InventoryIntakeRouteHandlerWpdb();
			$handler  = new InventoryIntakeRouteHandler(
				new InventoryIntakeRepository( $database ),
				null,
				null,
				'wp_'
			);

			$response = $handler->create_inventory_item(
				$this->request(
					array(
						'source' => 'bad',
					),
					null
				)
			);

			$this->assert_same( 'invalid', $response['status'] );
			$this->assert_same( 'inventory_intake_request_invalid', $response['code'] );
			$this->assert_same( 0, $database->prepare_count );
			$this->assert_same( 0, $database->query_count );
			$this->assert_true( in_array( 'idempotency_key_required', $response['errors'], true ) );
			$this->assert_true( in_array( 'game_required', $response['errors'], true ) );
			$this->assert_true( $response['meta']['route_connected_writes_deferred'] );
		}

		public function test_handler_rejects_repository_failures(): void {
			$database = new \InventoryIntakeRouteHandlerWpdb( array( 1, false, 1 ) );
			$handler  = new InventoryIntakeRouteHandler(
				new InventoryIntakeRepository( $database ),
				null,
				null,
				'wp_'
			);

			$response = $handler->create_inventory_item(
				$this->request( $this->valid_body(), 'header-intake-2' )
			);

			$this->assert_same( 'invalid', $response['status'] );
			$this->assert_same( 500, $response['status_code'] );
			$this->assert_same( 'inventory_intake_repository_rejected', $response['code'] );
			$this->assert_true( in_array( 'inventory_intake_insert_failed', $response['errors'], true ) );
			$this->assert_same( 'rejected', $response['meta']['repository']['status'] );
		}

		public function test_factory_defers_default_route_connected_writes(): void {
			$database = new \InventoryIntakeRouteHandlerWpdb();
			$factory  = new InventoryIntakeRouteHandlerFactory(
				static fn (): \wpdb => $database
			);
			$summary  = $factory->readiness_summary();

			$this->assert_same( 'inventory_intake_route_handler_factory_ready', $summary['action'] );
			$this->assert_false( $summary['route_connected_writes_enabled'] );
			$this->assert_true( $summary['database_configured'] );
			$this->assert_true( $summary['table_prefix_ready'] );
			$this->assert_false( $summary['repository_configured'] );
			$this->assert_true( $summary['route_connected_writes_deferred'] );
			$this->assert_true( $summary['woocommerce_projection_planner_ready'] );
			$this->assert_true( $summary['square_inventory_projection_planner_ready'] );
			$this->assert_true( $summary['external_projection_planning_deferred'] );
			$this->assert_same( array(), $summary['configuration_issues'] );
			$this->assert_same( array(), $factory->handlers() );
			$this->assert_same( null, $factory->handler() );
		}

		public function test_factory_composes_enabled_repository_backed_handler(): void {
			$database = new \InventoryIntakeRouteHandlerWpdb();
			$factory  = new InventoryIntakeRouteHandlerFactory(
				static fn (): \wpdb => $database,
				true
			);
			$summary  = $factory->readiness_summary();
			$handlers = $factory->handlers();

			$this->assert_true( $summary['route_connected_writes_enabled'] );
			$this->assert_true( $summary['repository_configured'] );
			$this->assert_true( $summary['route_connected_handler_ready'] );
			$this->assert_false( $summary['route_connected_writes_deferred'] );
			$this->assert_false( $summary['external_projection_planning_deferred'] );
			$this->assert_true( is_callable( $handlers['create_inventory_item'] ?? null ) );

			$response = $handlers['create_inventory_item'](
				$this->request( $this->valid_body(), 'header-intake-3' )
			);

			$this->assert_same( 'created', $response['status'] );
			$this->assert_same( 909, $response['data']['inventory_id'] );
			$this->assert_true( $response['data']['price_change_log_persisted'] );
		}

		public function test_factory_reports_provider_and_prefix_issues(): void {
			$failed_factory = new InventoryIntakeRouteHandlerFactory(
				static function (): \wpdb {
					throw new RuntimeException( 'database unavailable' );
				},
				true
			);
			$failed_summary = $failed_factory->readiness_summary();

			$this->assert_false( $failed_summary['database_configured'] );
			$this->assert_true( in_array( 'database_provider_failed', $failed_summary['configuration_issues'], true ) );

			$prefix_factory = new InventoryIntakeRouteHandlerFactory(
				static fn (): \wpdb => new \InventoryIntakeRouteHandlerWpdb( 1, 'wp-bad_' ),
				true
			);
			$prefix_summary = $prefix_factory->readiness_summary();

			$this->assert_true( $prefix_summary['database_configured'] );
			$this->assert_false( $prefix_summary['table_prefix_ready'] );
			$this->assert_true( in_array( 'table_prefix_invalid', $prefix_summary['configuration_issues'], true ) );
			$this->assert_same( array(), $prefix_factory->handlers() );
		}

		/**
		 * @param array<string, mixed> $body Body params.
		 */
		private function request( array $body, ?string $idempotency_key ): OfflineRestRequestData {
			$headers = null === $idempotency_key ? array() : array(
				'idempotency-key' => $idempotency_key,
			);

			return new OfflineRestRequestData( $body, array(), array(), $headers );
		}

		/**
		 * @return array<string, mixed>
		 */
		private function valid_body(): array {
			return array(
				'source'                         => 'Staff',
				'game'                           => 'Pokemon',
				'card_name'                      => 'Pikachu',
				'set_name'                       => 'Base Set',
				'set_code'                       => 'base',
				'card_number'                    => '58/102',
				'status'                         => InventoryStatus::AVAILABLE,
				'raw_or_graded'                  => 'RAW',
				'condition_code'                 => 'nm',
				'barcode'                        => 'pcs-000001',
				'sku'                            => 'pcs-pika-000001',
				'location_id'                    => '3',
				'actor_user_id'                  => '22',
				'sale_currency'                  => 'usd',
				'minimum_sale_price_minor_units' => '150',
				'sale_price_minor_units'         => 250,
				'online_visibility'              => 'visible',
				'kiosk_visibility'               => 'staff_only',
				'price_lock'                     => 'yes',
			);
		}
	}
}
