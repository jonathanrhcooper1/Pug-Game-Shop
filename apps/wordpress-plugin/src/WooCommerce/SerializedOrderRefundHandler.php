<?php
/**
 * Handles WooCommerce refunds for exact serialized inventory lines.
 *
 * @package TCGStorePlatform
 */

namespace TCGStorePlatform\WooCommerce;

use Closure;

final class SerializedOrderRefundHandler {
	private SerializedOrderLifecyclePlanner $planner;
	private Closure $order_loader;
	private Closure $repository_factory;

	public function __construct(
		?SerializedOrderLifecyclePlanner $planner = null,
		?callable $order_loader = null,
		?callable $repository_factory = null
	) {
		$this->planner            = $planner ?? new SerializedOrderLifecyclePlanner();
		$this->order_loader       = Closure::fromCallable(
			$order_loader ?? static fn ( int $order_id ): mixed => function_exists( 'wc_get_order' ) ? wc_get_order( $order_id ) : null
		);
		$this->repository_factory = Closure::fromCallable(
			$repository_factory ?? static function (): SerializedReturnReviewRepository {
				global $wpdb;

				return new SerializedReturnReviewRepository( $wpdb );
			}
		);
	}

	/**
	 * @return array{status:string,changed:int,idempotent:int,failed:int,codes:list<string>}
	 */
	public function handle( int $order_id, int $refund_id ): array {
		if ( $order_id <= 0 || $refund_id <= 0 ) {
			return $this->failure( 'refund_identifiers_invalid' );
		}

		$order  = ( $this->order_loader )( $order_id );
		$refund = ( $this->order_loader )( $refund_id );
		if ( ! $this->valid_order_pair( $order, $refund, $order_id ) ) {
			return $this->failure( 'refund_order_pair_invalid' );
		}

		$order_items  = $this->items_by_id( $order );
		$refund_items = $this->refund_original_item_ids( $refund );
		$line_items   = array();
		foreach ( $refund_items as $original_item_id ) {
			$item = $order_items[ $original_item_id ] ?? null;
			if ( ! is_object( $item ) ) {
				continue;
			}

			$line_items[] = array(
				'order_item_id' => $original_item_id,
				'metadata'      => $this->serialized_metadata( $item ),
			);
		}

		if ( array() === $line_items ) {
			return array(
				'status'     => 'skipped',
				'changed'    => 0,
				'idempotent' => 0,
				'failed'     => 0,
				'codes'      => array( 'refund_has_no_serialized_lines' ),
			);
		}

		$plan = $this->planner->plan( SerializedOrderLifecyclePlanner::ACTION_ORDER_REFUNDED, $order_id, $line_items );
		if ( array() !== $plan->errors() ) {
			$this->add_order_note( $order, $refund_id, 0, array( 'serialized_refund_metadata_invalid' ) );

			return $this->failure( 'serialized_refund_metadata_invalid' );
		}
		if ( ! $plan->has_work() ) {
			return array(
				'status'     => 'skipped',
				'changed'    => 0,
				'idempotent' => 0,
				'failed'     => 0,
				'codes'      => array( 'refund_has_no_serialized_lines' ),
			);
		}

		$repository = ( $this->repository_factory )();
		$changed    = 0;
		$idempotent = 0;
		$failed     = 0;
		$codes      = array();
		foreach ( $plan->transitions() as $transition ) {
			$result      = $repository->move_to_return_review( $transition, $refund_id );
			$codes[]     = (string) $result['code'];
			$changed    += ! empty( $result['changed'] ) ? 1 : 0;
			$idempotent += ! empty( $result['idempotent'] ) ? 1 : 0;
			$failed     += 'failed' === (string) $result['status'] ? 1 : 0;
		}

		if ( $changed > 0 || $failed > 0 ) {
			$this->add_order_note( $order, $refund_id, $changed, $codes );
		}

		return array(
			'status'     => $failed > 0 ? 'partial_failure' : ( $changed > 0 ? 'return_review' : 'idempotent' ),
			'changed'    => $changed,
			'idempotent' => $idempotent,
			'failed'     => $failed,
			'codes'      => array_values( array_unique( $codes ) ),
		);
	}

	private function valid_order_pair( mixed $order, mixed $refund, int $order_id ): bool {
		if ( ! is_object( $order ) || ! is_object( $refund ) || ! method_exists( $order, 'get_items' ) || ! method_exists( $refund, 'get_items' ) ) {
			return false;
		}

		if ( method_exists( $order, 'get_id' ) && (int) $order->get_id() !== $order_id ) {
			return false;
		}

		return ! method_exists( $refund, 'get_parent_id' ) || (int) $refund->get_parent_id() === $order_id;
	}

	/** @return array<int, object> */
	private function items_by_id( object $order ): array {
		$items = array();
		foreach ( $order->get_items( 'line_item' ) as $key => $item ) {
			if ( ! is_object( $item ) ) {
				continue;
			}
			$item_id = method_exists( $item, 'get_id' ) ? (int) $item->get_id() : (int) $key;
			if ( $item_id > 0 ) {
				$items[ $item_id ] = $item;
			}
		}

		return $items;
	}

	/** @return list<int> */
	private function refund_original_item_ids( object $refund ): array {
		$ids = array();
		foreach ( $refund->get_items( 'line_item' ) as $item ) {
			if ( ! is_object( $item ) || ! method_exists( $item, 'get_meta' ) ) {
				continue;
			}
			$quantity = method_exists( $item, 'get_quantity' ) ? abs( (int) $item->get_quantity() ) : 1;
			$item_id  = (int) $item->get_meta( '_refunded_item_id', true );
			if ( $quantity > 0 && $item_id > 0 ) {
				$ids[ $item_id ] = $item_id;
			}
		}

		return array_values( $ids );
	}

	/** @return array<string, mixed> */
	private function serialized_metadata( object $item ): array {
		$metadata = array();
		if ( ! method_exists( $item, 'get_meta' ) ) {
			return $metadata;
		}

		foreach ( $this->required_metadata_keys() as $key ) {
			$metadata[ $key ] = $item->get_meta( $key, true );
		}

		return $metadata;
	}

	/** @return list<string> */
	private function required_metadata_keys(): array {
		return array(
			'_tcg_serialized_inventory',
			'_tcg_inventory_id',
			'_tcg_reservation_id',
			'_tcg_owner_token_hash',
			'_tcg_price_minor_units',
			'_tcg_currency',
			'_tcg_reservation_expires',
			'_tcg_snapshot_hash',
		);
	}

	/** @param list<string> $codes */
	private function add_order_note( object $order, int $refund_id, int $changed, array $codes ): void {
		if ( ! method_exists( $order, 'add_order_note' ) ) {
			return;
		}

		if ( $changed > 0 ) {
			$template = $this->success_note_template();
			$order->add_order_note(
				sprintf(
					$template,
					$refund_id,
					$changed
				)
			);

			return;
		}

		$template = $this->failure_note_template();
		$order->add_order_note(
			sprintf(
				$template,
				$refund_id,
				implode( ', ', array_values( array_unique( $codes ) ) )
			)
		);
	}

	private function success_note_template(): string {
		if ( function_exists( '__' ) ) {
			/* translators: 1: refund ID, 2: item count. */
			return __( 'Refund #%1$d moved %2$d serialized item(s) to non-sellable return review. Quantity was not increased and no payment action was performed.', 'tcg-store-platform' );
		}

		return 'Refund #%1$d moved %2$d serialized item(s) to non-sellable return review. Quantity was not increased and no payment action was performed.';
	}

	private function failure_note_template(): string {
		if ( function_exists( '__' ) ) {
			/* translators: 1: refund ID, 2: internal error codes. */
			return __( 'Refund #%1$d could not move serialized inventory to return review (%2$s). No inventory was released and no payment action was performed.', 'tcg-store-platform' );
		}

		return 'Refund #%1$d could not move serialized inventory to return review (%2$s). No inventory was released and no payment action was performed.';
	}

	/** @return array{status:string,changed:int,idempotent:int,failed:int,codes:list<string>} */
	private function failure( string $code ): array {
		return array(
			'status'     => 'failed',
			'changed'    => 0,
			'idempotent' => 0,
			'failed'     => 1,
			'codes'      => array( $code ),
		);
	}
}
