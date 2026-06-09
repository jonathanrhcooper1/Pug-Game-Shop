<?php
/**
 * Inventory external mapping repository tests.
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
				$this->row = $row;
				if ( is_array( $query_result ) ) {
					$this->query_results = array_values( $query_result );
				} else {
					$this->query_result = $query_result;
				}
				$this->result_set = $result_set;
				$this->var_result = $var_result;
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

	if ( ! class_exists( 'InventoryExternalMappingWpdb' ) ) {
		class InventoryExternalMappingWpdb extends \wpdb {
			public string $prefix = 'wp_';
			public array $prepare_queries = array();
			public array $prepare_args = array();
			public array $queries = array();

			public function __construct(
				private int|false $query_result = 1,
				string $prefix = 'wp_'
			) {
				$this->prefix = $prefix;
			}

			public function prepare( string $query, array $args ): string {
				$this->prepare_queries[] = $query;
				$this->prepare_args[]    = array_values( $args );

				return 'prepared:' . $query;
			}

			public function query( string $query ): int|false {
				$this->queries[] = $query;

				return $this->query_result;
			}
		}
	}
}

namespace TCGStorePlatform\Tests\Unit {
	use TCGStorePlatform\Inventory\InventoryExternalMappingRepository;
	use TCGStorePlatform\Tests\TestCase;

	final class InventoryExternalMappingRepositoryTest extends TestCase {
		public function test_repository_marks_inventory_row_with_woocommerce_product_mapping(): void {
			$database = new \InventoryExternalMappingWpdb();
			$result   = ( new InventoryExternalMappingRepository( $database ) )->mark_woocommerce_product_synced( 42, 9001 );

			$this->assert_same( 'synced', $result['status'] );
			$this->assert_true( $result['synced'] );
			$this->assert_same( 1, $result['rows_affected'] );
			$this->assert_contains( 'UPDATE `wp_tcg_inventory_items`', $database->prepare_queries[0] );
			$this->assert_contains( '`woocommerce_product_id` = %d', $database->prepare_queries[0] );
			$this->assert_contains( '`external_sync_state` = %s', $database->prepare_queries[0] );
			$this->assert_same( 9001, $database->prepare_args[0][0] );
			$this->assert_same( 'synced', $database->prepare_args[0][1] );
			$this->assert_true( $result['payment_deferred'] );
			$this->assert_true( $result['square_deferred'] );
		}

		public function test_repository_marks_inventory_row_with_square_catalog_mapping(): void {
			$database = new \InventoryExternalMappingWpdb();
			$result   = ( new InventoryExternalMappingRepository( $database ) )->mark_square_catalog_synced(
				42,
				'SQUARE-ITEM-42',
				'SQUARE-VARIATION-42'
			);

			$this->assert_same( 'square_catalog_mapping_update', $result['action'] );
			$this->assert_same( 'square_synced', $result['status'] );
			$this->assert_true( $result['synced'] );
			$this->assert_same( 1, $result['rows_affected'] );
			$this->assert_contains( 'UPDATE `wp_tcg_inventory_items`', $database->prepare_queries[0] );
			$this->assert_contains( '`square_catalog_item_id` = %s', $database->prepare_queries[0] );
			$this->assert_contains( '`square_catalog_variation_id` = %s', $database->prepare_queries[0] );
			$this->assert_contains( '`external_sync_state` = %s', $database->prepare_queries[0] );
			$this->assert_same( 'SQUARE-ITEM-42', $database->prepare_args[0][0] );
			$this->assert_same( 'SQUARE-VARIATION-42', $database->prepare_args[0][1] );
			$this->assert_same( 'square_synced', $database->prepare_args[0][2] );
			$this->assert_false( $result['square_deferred'] );
			$this->assert_true( $result['woocommerce_deferred'] );
			$this->assert_true( $result['payment_deferred'] );
			$this->assert_same( 'SQUARE-ITEM-42', $result['square_catalog_item_id'] );
			$this->assert_same( 'SQUARE-VARIATION-42', $result['square_catalog_variation_id'] );
		}

		public function test_repository_rejects_bad_ids_prefix_and_failed_updates(): void {
			$bad_ids = ( new InventoryExternalMappingRepository( new \InventoryExternalMappingWpdb() ) )
				->mark_woocommerce_product_synced( 0, 9001 );
			$bad_prefix = ( new InventoryExternalMappingRepository( new \InventoryExternalMappingWpdb( 1, 'bad-prefix-' ) ) )
				->mark_woocommerce_product_synced( 42, 9001 );
			$failed = ( new InventoryExternalMappingRepository( new \InventoryExternalMappingWpdb( false ) ) )
				->mark_woocommerce_product_synced( 42, 9001 );
			$bad_square_ids = ( new InventoryExternalMappingRepository( new \InventoryExternalMappingWpdb() ) )
				->mark_square_catalog_synced( 42, '', 'SQUARE-VARIATION-42' );
			$failed_square = ( new InventoryExternalMappingRepository( new \InventoryExternalMappingWpdb( false ) ) )
				->mark_square_catalog_synced( 42, 'SQUARE-ITEM-42', 'SQUARE-VARIATION-42' );

			$this->assert_same( array( 'inventory_external_mapping_ids_invalid' ), $bad_ids['errors'] );
			$this->assert_same( array( 'inventory_external_mapping_table_prefix_mismatch' ), $bad_prefix['errors'] );
			$this->assert_same( array( 'inventory_external_mapping_update_failed' ), $failed['errors'] );
			$this->assert_same( array( 'square_catalog_mapping_ids_invalid' ), $bad_square_ids['errors'] );
			$this->assert_same( array( 'square_catalog_mapping_update_failed' ), $failed_square['errors'] );
			$this->assert_false( $bad_square_ids['square_deferred'] );
		}
	}
}
