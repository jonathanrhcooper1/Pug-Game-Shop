<?php
/**
 * Inventory mark-sold route handler tests.
 *
 * @package TCGStorePlatform
 */

namespace {
	if ( ! class_exists( 'wpdb' ) ) {
		class wpdb {
			public string $prefix = 'wp_';
		}
	}

	if ( ! defined( 'ARRAY_A' ) ) {
		define( 'ARRAY_A', 'ARRAY_A' );
	}

	if ( ! class_exists( 'InventoryMarkSoldRouteHandlerWpdb' ) ) {
		class InventoryMarkSoldRouteHandlerWpdb extends \wpdb {
			public string $prefix             = 'wp_';
			public int $prepare_count         = 0;
			public int $get_row_count         = 0;
			public int $get_results_count     = 0;
			public int $query_count           = 0;
			public string $last_prepare_query = '';
			public string $last_query         = '';
			public array $last_prepare_args   = array();
			public array $prepare_args_history = array();
			public array $queries             = array();
			private array $rows;
			private int|false $query_result;
			private array $group_rows;

			/**
			 * @param list<array<string, mixed>|null> $rows Rows returned by get_row.
			 * @param list<array<string, mixed>>      $group_rows Rows returned by get_results.
			 */
			public function __construct( array $rows, int|false $query_result = 1, array $group_rows = array() ) {
				$this->rows         = array_values( $rows );
				$this->query_result = $query_result;
				$this->group_rows   = array_values( $group_rows );
			}

			/**
			 * @param list<mixed> $args Prepared arguments.
			 */
			public function prepare( string $query, array $args ): string {
				++$this->prepare_count;
				$this->last_prepare_query = $query;
				$this->last_prepare_args  = array_values( $args );
				$this->prepare_args_history[] = array_values( $args );

				return 'prepared:' . $query;
			}

			/**
			 * @return array<string, mixed>|null
			 */
			public function get_row( string $query, string $output_type ): ?array {
				unset( $output_type );

				++$this->get_row_count;
				$this->last_query = $query;

				return array() === $this->rows ? null : array_shift( $this->rows );
			}

			/**
			 * @return list<array<string, mixed>>
			 */
			public function get_results( string $query, string $output_type ): array {
				unset( $output_type );

				++$this->get_results_count;
				$this->last_query = $query;

				return $this->group_rows;
			}

			public function query( string $query ): int|false {
				++$this->query_count;
				$this->last_query = $query;
				$this->queries[]  = $query;

				return $this->query_result;
			}
		}
	}
}

namespace TCGStorePlatform\Tests\Unit {

	use TCGStorePlatform\Api\V1\InventoryMarkSoldRouteHandler;
	use TCGStorePlatform\Api\V1\OfflineRestRequestData;
	use TCGStorePlatform\Inventory\InventoryStatus;
	use TCGStorePlatform\Tests\TestCase;

	final class InventoryMarkSoldRouteHandlerTest extends TestCase {
		public function test_rejects_missing_identity_key_or_square_reference(): void {
			$handler = new InventoryMarkSoldRouteHandler(
				new \InventoryMarkSoldRouteHandlerWpdb( array() ),
				'wp_',
				null,
				null,
				static fn (): string => '2026-06-09 20:45:00'
			);

			$missing_identity = $handler->mark_inventory_item_sold(
				new OfflineRestRequestData(
					array( 'square_receipt_reference' => 'SQ-1' ),
					array(),
					array(),
					array( 'idempotency-key' => 'sale-1' )
				)
			);
			$this->assert_same( 'invalid', $missing_identity['status'] );
			$this->assert_same( 'inventory_identity_required', $missing_identity['code'] );

			$missing_key = $handler->mark_inventory_item_sold(
				new OfflineRestRequestData(
					array( 'square_receipt_reference' => 'SQ-1' ),
					array(),
					array( 'inventory_id' => 'wp-inventory-001' ),
					array()
				)
			);
			$this->assert_same( 'invalid', $missing_key['status'] );
			$this->assert_same( 'idempotency_key_required', $missing_key['code'] );

			$missing_reference = $handler->mark_inventory_item_sold(
				new OfflineRestRequestData(
					array(),
					array(),
					array( 'inventory_id' => 'wp-inventory-001' ),
					array( 'idempotency-key' => 'sale-1' )
				)
			);
			$this->assert_same( 'invalid', $missing_reference['status'] );
			$this->assert_same( 'square_reference_required', $missing_reference['code'] );
		}

		public function test_marks_public_inventory_item_sold_and_defers_square_payment_capture(): void {
			$initial = $this->inventory_row( InventoryStatus::AVAILABLE, 7 );
			$updated = array_merge(
				$initial,
				array(
					'status'      => InventoryStatus::SOLD,
					'date_sold'   => '2026-06-09 20:45:00',
					'row_version' => 8,
				)
			);
			$database = new \InventoryMarkSoldRouteHandlerWpdb( array( $initial, $updated ) );
			$handler  = new InventoryMarkSoldRouteHandler(
				$database,
				'wp_',
				null,
				null,
				static fn (): string => '2026-06-09 20:45:00'
			);

			$response = $handler->mark_inventory_item_sold(
				$this->request(
					array(
						'square_receipt_reference' => 'SQ-SALE-001',
						'sync_woocommerce_product' => false,
					),
					'wp-inventory-001',
					'square-sale-op-001'
				)
			);

			$this->assert_same( 'sold', $response['status'] );
			$this->assert_same( 'inventory_item_marked_sold', $response['code'] );
			$this->assert_same( 'wp-inventory-001', $response['data']['public_id'] );
			$this->assert_same( InventoryStatus::AVAILABLE, $response['data']['previous_status'] );
			$this->assert_same( InventoryStatus::SOLD, $response['data']['status'] );
			$this->assert_same( 'SQ-SALE-001', $response['data']['square_receipt_reference'] );
			$this->assert_same( '2026-06-09 20:45:00', $response['data']['date_sold'] );
			$this->assert_false( $response['meta']['idempotent'] );
			$this->assert_same( 'official_woocommerce_square_extension', $response['meta']['provider_payment_capture'] );
			$this->assert_true( $response['meta']['square_payment_delegated'] );
			$this->assert_true( $response['meta']['provider_inventory_write_deferred'] );
			$this->assert_false( $response['meta']['woocommerce_product_sync']['requested'] );
			$this->assert_same( 1, $database->query_count );
			$this->assert_contains( 'UPDATE `wp_tcg_inventory_items`', $database->queries[0] );
			$this->assert_same(
				array(
					InventoryStatus::SOLD,
					'2026-06-09 20:45:00',
					'sold_pos_square',
					'2026-06-09 20:45:00',
					'wp-inventory-001',
					InventoryStatus::AVAILABLE,
					InventoryStatus::RESERVED,
				),
				$database->prepare_args_history[1]
			);
		}

		public function test_returns_idempotent_success_when_inventory_is_already_sold(): void {
			$database = new \InventoryMarkSoldRouteHandlerWpdb( array( $this->inventory_row( InventoryStatus::SOLD, 8 ) ) );
			$handler  = new InventoryMarkSoldRouteHandler( $database );

			$response = $handler->mark_inventory_item_sold(
				$this->request(
					array( 'square_receipt_reference' => 'SQ-SALE-001' ),
					'wp-inventory-001',
					'square-sale-op-001'
				)
			);

			$this->assert_same( 'sold', $response['status'] );
			$this->assert_same( 'inventory_item_already_sold', $response['code'] );
			$this->assert_true( $response['meta']['idempotent'] );
			$this->assert_same( 0, $database->query_count );
		}

		public function test_rejects_invalid_status_transition(): void {
			$database = new \InventoryMarkSoldRouteHandlerWpdb( array( $this->inventory_row( 'pending_intake', 3 ) ) );
			$handler  = new InventoryMarkSoldRouteHandler( $database );

			$response = $handler->mark_inventory_item_sold(
				$this->request(
					array( 'square_receipt_reference' => 'SQ-SALE-001' ),
					'wp-inventory-001',
					'square-sale-op-001'
				)
			);

			$this->assert_same( 'invalid', $response['status'] );
			$this->assert_same( 'inventory_status_transition_invalid', $response['code'] );
			$this->assert_same( 'pending_intake', $response['meta']['previous_status'] );
			$this->assert_same( 0, $database->query_count );
		}

		/**
		 * @param array<string, mixed> $body Body params.
		 */
		private function request( array $body, string $inventory_id, string $idempotency_key ): OfflineRestRequestData {
			return new OfflineRestRequestData(
				$body,
				array(),
				array( 'inventory_id' => $inventory_id ),
				array( 'idempotency-key' => $idempotency_key )
			);
		}

		/**
		 * @return array<string, mixed>
		 */
		private function inventory_row( string $status, int $row_version ): array {
			return array(
				'inventory_id'             => 41,
				'public_id'                => 'wp-inventory-001',
				'reference_card_id'        => 215,
				'provider_name'            => 'scrydex',
				'provider_card_id'         => 'scrydex-pokemon-base-004',
				'card_name'                => 'Charizard',
				'barcode'                  => 'PUG-WP-CHARIZARD',
				'sku'                      => 'PUG-WP-CHARIZARD',
				'status'                   => $status,
				'date_sold'                => InventoryStatus::SOLD === $status ? '2026-06-09 20:44:00' : '',
				'row_version'              => $row_version,
				'sale_currency'            => 'USD',
				'woocommerce_product_id'   => 9001,
			);
		}
	}
}
