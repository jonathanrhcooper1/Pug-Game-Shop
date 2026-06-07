<?php
/**
 * Inventory intake repository tests.
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
				int|false $query_result = 1,
				array|false $result_set = array(),
				mixed $var_result = 0
			) {
				$this->row          = $row;
				$this->query_result = $query_result;
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

				return $this->query_result;
			}
		}
	}

	if ( ! class_exists( 'InventoryIntakeRepositoryWpdb' ) ) {
		class InventoryIntakeRepositoryWpdb extends \wpdb {
			public string $prefix = 'wp_';
			public int $insert_id = 707;
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

			public function __construct(
				private int|false $query_result = 1,
				string $prefix = 'wp_',
				int $insert_id = 707,
				private ?array $row = null
			) {
				$this->prefix    = $prefix;
				$this->insert_id = $insert_id;
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
	use TCGStorePlatform\Inventory\InventoryIntakeParser;
	use TCGStorePlatform\Inventory\InventoryIntakePersistencePlan;
	use TCGStorePlatform\Inventory\InventoryIntakePersistencePlanner;
	use TCGStorePlatform\Inventory\InventoryIntakeRepository;
	use TCGStorePlatform\Inventory\InventoryStatus;
	use TCGStorePlatform\Tests\TestCase;

	final class InventoryIntakeRepositoryTest extends TestCase {
		public function test_repository_inserts_prepared_inventory_intake_plan(): void {
			$plan     = $this->valid_plan();
			$database = new \InventoryIntakeRepositoryWpdb();
			$result   = ( new InventoryIntakeRepository( $database ) )->create( $plan );
			$audit    = $result->audit_payload();

			$this->assert_true( $result->is_inserted() );
			$this->assert_false( $result->is_rejected() );
			$this->assert_same( 'inserted', $result->status() );
			$this->assert_same( 1, $result->rows_affected() );
			$this->assert_same( 707, $result->insert_id() );
			$this->assert_same( array(), $result->errors() );
			$this->assert_same( 2, $database->prepare_count );
			$this->assert_same( 1, $database->get_row_count );
			$this->assert_same( 1, $database->query_count );
			$this->assert_contains( 'INSERT INTO `wp_tcg_inventory_items`', $database->last_prepare_query );
			$this->assert_contains( '`public_id`', $database->last_prepare_query );
			$this->assert_contains( '`row_version`', $database->last_prepare_query );
			$this->assert_contains( 'prepared:INSERT', $database->last_query );
			$this->assert_same( $plan->prepare_arg_count(), count( $database->last_prepare_args ) );
			$this->assert_same( 707, $result->response_payload()['inventory_id'] );
			$this->assert_same( $plan->insert_row()['public_id'], $result->response_payload()['public_id'] );
			$this->assert_same( 'PCS-000001', $result->response_payload()['barcode'] );
			$this->assert_same( 'inventory_intake_repository_insert', $audit['action'] );
			$this->assert_same( 707, $audit['insert_id'] );
			$this->assert_false( $audit['repository_execution_deferred'] );
			$this->assert_true( $audit['route_connected_writes_deferred'] );
			$this->assert_not_contains( 'header-inventory-1', (string) json_encode( $audit ) );
		}

		public function test_repository_rejects_invalid_plans_before_query(): void {
			$plan     = InventoryIntakePersistencePlan::rejected(
				'wp_tcg_inventory_items',
				array( 'table_prefix_invalid' )
			);
			$database = new \InventoryIntakeRepositoryWpdb();
			$result   = ( new InventoryIntakeRepository( $database ) )->create( $plan );

			$this->assert_true( $result->is_rejected() );
			$this->assert_same( null, $result->rows_affected() );
			$this->assert_same( 0, $database->prepare_count );
			$this->assert_same( 0, $database->query_count );
			$this->assert_same( array( 'table_prefix_invalid' ), $result->errors() );
		}

		public function test_repository_rejects_prefix_mismatch_before_query(): void {
			$plan     = $this->valid_plan();
			$database = new \InventoryIntakeRepositoryWpdb( 1, 'shop_' );
			$result   = ( new InventoryIntakeRepository( $database ) )->create( $plan );

			$this->assert_true( $result->is_rejected() );
			$this->assert_same( 0, $database->prepare_count );
			$this->assert_same( 0, $database->query_count );
			$this->assert_same( array( 'inventory_intake_table_prefix_mismatch' ), $result->errors() );
		}

		public function test_repository_rejects_duplicate_barcode_and_sku_before_insert(): void {
			$plan     = $this->valid_plan();
			$database = new \InventoryIntakeRepositoryWpdb(
				1,
				'wp_',
				707,
				array(
					'barcode' => 'PCS-000001',
					'sku'     => 'PCS-PIKA-000001',
				)
			);
			$result   = ( new InventoryIntakeRepository( $database ) )->create( $plan );

			$this->assert_true( $result->is_rejected() );
			$this->assert_same( 1, $database->prepare_count );
			$this->assert_same( 1, $database->get_row_count );
			$this->assert_same( 0, $database->query_count );
			$this->assert_same( 'ARRAY_A', $database->last_output_type );
			$this->assert_contains( 'SELECT barcode, sku FROM `wp_tcg_inventory_items`', $database->last_prepare_query );
			$this->assert_same( array( 'PCS-000001', 'PCS-PIKA-000001' ), $database->last_prepare_args );
			$this->assert_same( array( 'barcode_already_exists', 'sku_already_exists' ), $result->errors() );
		}

		public function test_repository_rejects_failed_and_unexpected_insert_counts(): void {
			$failed_result = ( new InventoryIntakeRepository(
				new \InventoryIntakeRepositoryWpdb( false )
			) )->create( $this->valid_plan() );
			$zero_result   = ( new InventoryIntakeRepository(
				new \InventoryIntakeRepositoryWpdb( 0 )
			) )->create( $this->valid_plan() );
			$two_result    = ( new InventoryIntakeRepository(
				new \InventoryIntakeRepositoryWpdb( 2 )
			) )->create( $this->valid_plan() );

			$this->assert_true( $failed_result->is_rejected() );
			$this->assert_same( array( 'inventory_intake_insert_failed' ), $failed_result->errors() );
			$this->assert_true( $zero_result->is_rejected() );
			$this->assert_same( 0, $zero_result->rows_affected() );
			$this->assert_same( array( 'inventory_intake_insert_no_rows' ), $zero_result->errors() );
			$this->assert_true( $two_result->is_rejected() );
			$this->assert_same( 2, $two_result->rows_affected() );
			$this->assert_same( array( 'inventory_intake_insert_unexpected_rows' ), $two_result->errors() );
		}

		private function valid_plan(): InventoryIntakePersistencePlan {
			$result = ( new InventoryIntakeParser() )->parse(
				array(
					'source'                         => 'Staff',
					'idempotency_key'                => 'body-key-ignored',
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
					'sale_currency'                  => 'usd',
					'minimum_sale_price_minor_units' => '150',
					'sale_price_minor_units'         => 250,
					'online_visibility'              => 'visible',
					'kiosk_visibility'               => 'staff_only',
					'price_lock'                     => 'yes',
				),
				'header-inventory-1',
				22
			);

			$this->assert_true( $result->is_valid() );
			$request = $result->request();
			$this->assert_true( null !== $request );

			return ( new InventoryIntakePersistencePlanner(
				static fn (): string => '2026-06-07 10:30:00.000000'
			) )->plan( $request, 'wp_' );
		}
	}
}
