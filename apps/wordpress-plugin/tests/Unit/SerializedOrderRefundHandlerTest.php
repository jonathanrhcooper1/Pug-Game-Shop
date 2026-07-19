<?php
/**
 * WooCommerce serialized refund handler tests.
 *
 * @package TCGStorePlatform
 */

namespace {
	if ( ! class_exists( 'SerializedRefundTestItem' ) ) {
		class SerializedRefundTestItem {
			public function __construct( private int $id, private array $metadata, private int $quantity = 1 ) {
			}

			public function get_id(): int {
				return $this->id;
			}

			public function get_meta( string $key, bool $single = true ): mixed {
				unset( $single );

				return $this->metadata[ $key ] ?? '';
			}

			public function get_quantity(): int {
				return $this->quantity;
			}
		}
	}

	if ( ! class_exists( 'SerializedRefundTestOrder' ) ) {
		class SerializedRefundTestOrder {
			public array $notes = array();

			public function __construct( private int $id, private array $items, private int $parent_id = 0 ) {
			}

			public function get_id(): int {
				return $this->id;
			}

			public function get_parent_id(): int {
				return $this->parent_id;
			}

			public function get_items( string $type = 'line_item' ): array {
				unset( $type );

				return $this->items;
			}

			public function add_order_note( string $note ): void {
				$this->notes[] = $note;
			}
		}
	}

	if ( ! class_exists( 'SerializedRefundTestRepository' ) ) {
		class SerializedRefundTestRepository {
			public array $transitions = array();
			public function __construct( private array $result ) {
			}

			public function move_to_return_review( array $transition, int $refund_id ): array {
				$this->transitions[] = array( 'transition' => $transition, 'refund_id' => $refund_id );

				return $this->result;
			}
		}
	}
}

namespace TCGStorePlatform\Tests\Unit {
	use TCGStorePlatform\Tests\TestCase;
	use TCGStorePlatform\WooCommerce\SerializedOrderRefundHandler;

	final class SerializedOrderRefundHandlerTest extends TestCase {
		public function test_partial_refund_moves_only_the_exact_refunded_serialized_line(): void {
			$order = new \SerializedRefundTestOrder(
				401,
				array(
					301 => new \SerializedRefundTestItem( 301, $this->metadata( 501, 601 ) ),
					302 => new \SerializedRefundTestItem( 302, $this->metadata( 502, 602 ) ),
				)
			);
			$refund = new \SerializedRefundTestOrder(
				701,
				array( new \SerializedRefundTestItem( 801, array( '_refunded_item_id' => 302 ), -1 ) ),
				401
			);
			$repository = new \SerializedRefundTestRepository( $this->changed_result( 502 ) );
			$handler = $this->handler( $order, $refund, $repository );

			$result = $handler->handle( 401, 701 );

			$this->assert_same( 'return_review', $result['status'] );
			$this->assert_same( 1, $result['changed'] );
			$this->assert_same( 1, count( $repository->transitions ) );
			$this->assert_same( 302, $repository->transitions[0]['transition']['order_item_id'] );
			$this->assert_same( 502, $repository->transitions[0]['transition']['inventory_id'] );
			$this->assert_same( 701, $repository->transitions[0]['refund_id'] );
			$this->assert_same( 1, count( $order->notes ) );
			$this->assert_contains( 'non-sellable return review', $order->notes[0] );
			$this->assert_contains( 'no payment action was performed', $order->notes[0] );
		}

		public function test_replayed_refund_does_not_duplicate_order_notes(): void {
			$order = new \SerializedRefundTestOrder( 401, array( 301 => new \SerializedRefundTestItem( 301, $this->metadata( 501, 601 ) ) ) );
			$refund = new \SerializedRefundTestOrder( 701, array( new \SerializedRefundTestItem( 801, array( '_refunded_item_id' => 301 ), -1 ) ), 401 );
			$repository = new \SerializedRefundTestRepository(
				array(
					'status' => 'return_review',
					'code' => 'serialized_return_already_recorded',
					'changed' => false,
					'idempotent' => true,
					'inventory_id' => 501,
					'errors' => array(),
				)
			);

			$result = $this->handler( $order, $refund, $repository )->handle( 401, 701 );

			$this->assert_same( 'idempotent', $result['status'] );
			$this->assert_same( 1, $result['idempotent'] );
			$this->assert_same( 0, count( $order->notes ) );
		}

		public function test_rejects_refund_whose_parent_is_not_the_supplied_order(): void {
			$order = new \SerializedRefundTestOrder( 401, array() );
			$refund = new \SerializedRefundTestOrder( 701, array(), 999 );
			$repository = new \SerializedRefundTestRepository( $this->changed_result( 501 ) );

			$result = $this->handler( $order, $refund, $repository )->handle( 401, 701 );

			$this->assert_same( 'failed', $result['status'] );
			$this->assert_same( array( 'refund_order_pair_invalid' ), $result['codes'] );
			$this->assert_same( 0, count( $repository->transitions ) );
		}

		public function test_nonserialized_refund_line_is_skipped_without_inventory_write(): void {
			$order = new \SerializedRefundTestOrder( 401, array( 301 => new \SerializedRefundTestItem( 301, array() ) ) );
			$refund = new \SerializedRefundTestOrder( 701, array( new \SerializedRefundTestItem( 801, array( '_refunded_item_id' => 301 ), -1 ) ), 401 );
			$repository = new \SerializedRefundTestRepository( $this->changed_result( 501 ) );

			$result = $this->handler( $order, $refund, $repository )->handle( 401, 701 );

			$this->assert_same( 'skipped', $result['status'] );
			$this->assert_same( 0, count( $repository->transitions ) );
			$this->assert_same( 0, count( $order->notes ) );
		}

		private function handler( object $order, object $refund, object $repository ): SerializedOrderRefundHandler {
			return new SerializedOrderRefundHandler(
				null,
				static fn ( int $id ): mixed => 401 === $id ? $order : ( 701 === $id ? $refund : null ),
				static fn (): object => $repository
			);
		}

		/** @return array<string, mixed> */
		private function metadata( int $inventory_id, int $reservation_id ): array {
			return array(
				'_tcg_serialized_inventory' => '1',
				'_tcg_inventory_id' => $inventory_id,
				'_tcg_reservation_id' => $reservation_id,
				'_tcg_owner_token_hash' => str_repeat( 'a', 64 ),
				'_tcg_price_minor_units' => 1500,
				'_tcg_currency' => 'USD',
				'_tcg_reservation_expires' => '2026-07-18 12:00:00',
				'_tcg_snapshot_hash' => str_repeat( 'b', 64 ),
			);
		}

		/** @return array<string, mixed> */
		private function changed_result( int $inventory_id ): array {
			return array(
				'status' => 'return_review',
				'code' => 'serialized_inventory_moved_to_return_review',
				'changed' => true,
				'idempotent' => false,
				'inventory_id' => $inventory_id,
				'errors' => array(),
			);
		}
	}
}
