<?php
/**
 * Serialized return-review persistence tests.
 *
 * @package TCGStorePlatform
 */

namespace {
	if ( ! class_exists( 'wpdb' ) ) {
		class wpdb {
			public string $prefix = 'wp_';
		}
	}

	if ( ! class_exists( 'SerializedReturnReviewWpdb' ) ) {
		class SerializedReturnReviewWpdb extends \wpdb {
			public string $prefix = 'wp_';
			public array $prepare_queries = array();
			public array $prepare_args = array();
			public array $queries = array();
			public array $inserts = array();
			private array $rows;
			private array $query_results;
			private array $insert_results;

			public function __construct( array $rows, array $query_results = array(), array $insert_results = array() ) {
				$this->rows = array_values( $rows );
				$this->query_results = array_values( $query_results );
				$this->insert_results = array_values( $insert_results );
			}

			public function prepare( string $query, array $args ): string {
				$this->prepare_queries[] = $query;
				$this->prepare_args[] = array_values( $args );

				return 'prepared:' . (string) count( $this->prepare_queries );
			}

			public function get_row( string $query, string $output_type ): ?array {
				unset( $query, $output_type );

				return array() === $this->rows ? null : array_shift( $this->rows );
			}

			public function query( string $query ): int|false {
				$this->queries[] = $query;

				return array() === $this->query_results ? 1 : array_shift( $this->query_results );
			}

			public function insert( string $table, array $data ): int|false {
				$this->inserts[] = array( 'table' => $table, 'data' => $data );

				return array() === $this->insert_results ? 1 : array_shift( $this->insert_results );
			}
		}
	}
}

namespace TCGStorePlatform\Tests\Unit {
	use TCGStorePlatform\Inventory\InventoryStatus;
	use TCGStorePlatform\Reservations\ReservationStatus;
	use TCGStorePlatform\Tests\TestCase;
	use TCGStorePlatform\WooCommerce\SerializedReturnReviewRepository;

	final class SerializedReturnReviewRepositoryTest extends TestCase {
		public function test_moves_only_sold_inventory_to_return_review_without_changing_quantity(): void {
			$database = new \SerializedReturnReviewWpdb(
				array(
					null,
					$this->inventory( InventoryStatus::SOLD ),
					$this->reservation(),
				),
				array( 1, 1, 1 )
			);
			$result = ( new SerializedReturnReviewRepository( $database ) )->move_to_return_review( $this->transition(), 701 );

			$this->assert_same( 'return_review', $result['status'] );
			$this->assert_same( 'serialized_inventory_moved_to_return_review', $result['code'] );
			$this->assert_true( $result['changed'] );
			$this->assert_false( $result['idempotent'] );
			$this->assert_same( 2, count( $database->inserts ) );
			$this->assert_same( 'wp_tcg_inventory_movements', $database->inserts[0]['table'] );
			$this->assert_same( 'woocommerce_refund_return_review', $database->inserts[0]['data']['movement_reason'] );
			$this->assert_same( 'wp_tcg_audit_log', $database->inserts[1]['table'] );
			$this->assert_same( 'woocommerce_refund_return_review', $database->inserts[1]['data']['action_name'] );
			$this->assert_contains( 'UPDATE `wp_tcg_inventory_items`', $database->prepare_queries[3] );
			$this->assert_not_contains( 'quantity_on_hand', $database->prepare_queries[3] );
			$this->assert_same( InventoryStatus::RETURN_REVIEW, $database->prepare_args[3][0] );
			$this->assert_same( InventoryStatus::SOLD, $database->prepare_args[3][5] );
			$this->assert_same( 'START TRANSACTION', $database->queries[0] );
			$this->assert_same( 'COMMIT', $database->queries[2] );
		}

		public function test_replay_is_idempotent_and_does_not_write_inventory_or_audit_again(): void {
			$database = new \SerializedReturnReviewWpdb(
				array(
					array( 'movement_id' => 77 ),
					$this->inventory( InventoryStatus::RETURN_REVIEW ),
				),
				array( 1, 1 )
			);
			$result = ( new SerializedReturnReviewRepository( $database ) )->move_to_return_review( $this->transition(), 701 );

			$this->assert_same( 'serialized_return_already_recorded', $result['code'] );
			$this->assert_false( $result['changed'] );
			$this->assert_true( $result['idempotent'] );
			$this->assert_same( 0, count( $database->inserts ) );
			$this->assert_same( 2, count( $database->queries ) );
			$this->assert_same( 'COMMIT', $database->queries[1] );
		}

		public function test_rejects_non_sold_inventory_without_releasing_or_incrementing_it(): void {
			$database = new \SerializedReturnReviewWpdb(
				array( null, $this->inventory( InventoryStatus::AVAILABLE ) ),
				array( 1, 1 )
			);
			$result = ( new SerializedReturnReviewRepository( $database ) )->move_to_return_review( $this->transition(), 701 );

			$this->assert_same( 'return_review_inventory_not_sold', $result['code'] );
			$this->assert_false( $result['changed'] );
			$this->assert_same( 0, count( $database->inserts ) );
			$this->assert_same( 'ROLLBACK', $database->queries[1] );
		}

		public function test_rejects_reservation_that_does_not_match_the_serialized_inventory(): void {
			$reservation = $this->reservation();
			$reservation['inventory_id'] = 999;
			$database = new \SerializedReturnReviewWpdb(
				array( null, $this->inventory( InventoryStatus::SOLD ), $reservation ),
				array( 1, 1 )
			);
			$result = ( new SerializedReturnReviewRepository( $database ) )->move_to_return_review( $this->transition(), 701 );

			$this->assert_same( 'return_review_reservation_mismatch', $result['code'] );
			$this->assert_same( 0, count( $database->inserts ) );
			$this->assert_same( 'ROLLBACK', $database->queries[1] );
		}

		/** @return array<string, mixed> */
		private function inventory( string $status ): array {
			return array(
				'inventory_id'    => 501,
				'public_id'       => 'inventory-501',
				'status'          => $status,
				'quantity_on_hand' => 1,
				'location_id'     => 4,
				'row_version'     => 9,
			);
		}

		/** @return array<string, mixed> */
		private function reservation(): array {
			return array(
				'reservation_id' => 601,
				'inventory_id'   => 501,
				'order_id'       => 401,
				'status'         => ReservationStatus::CONVERTED,
			);
		}

		/** @return array<string, mixed> */
		private function transition(): array {
			return array(
				'operation'               => 'mark_return_review',
				'target_inventory_status' => InventoryStatus::RETURN_REVIEW,
				'inventory_id'            => 501,
				'reservation_id'          => 601,
				'order_id'                => 401,
				'order_item_id'           => 301,
				'idempotency_key'         => 'woo-order_refunded-401-example',
			);
		}
	}
}
