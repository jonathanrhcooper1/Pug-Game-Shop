<?php
/**
 * WooCommerce hook contracts for serialized inventory checkout lifecycle.
 *
 * @package TCGStorePlatform
 */

namespace TCGStorePlatform\WooCommerce;

final class SerializedInventoryHookRegistry {
	public const PHASE_CART       = 'cart';
	public const PHASE_CHECKOUT   = 'checkout';
	public const PHASE_ORDER      = 'order';
	public const PHASE_PAYMENT    = 'payment';
	public const PHASE_REFUND     = 'refund';
	public const PHASE_STORE_API  = 'store_api';
	public const PHASE_VALIDATION = 'validation';

	/**
	 * @return list<HookContract>
	 */
	public function contracts(): array {
		return array(
			new HookContract(
				'woocommerce_add_cart_item_data',
				'reserve_exact_inventory_at_add_to_cart',
				self::PHASE_CART,
				10,
				4,
				false,
				'Create or replay an exact inventory reservation before a serialized card enters the cart.'
			),
			new HookContract(
				'woocommerce_get_cart_item_from_session',
				'restore_exact_inventory_cart_metadata',
				self::PHASE_CART,
				10,
				3,
				false,
				'Restore reservation metadata from WooCommerce session data without changing the reserved item.'
			),
			new HookContract(
				'woocommerce_check_cart_items',
				'validate_exact_inventory_cart_items',
				self::PHASE_VALIDATION,
				10,
				0,
				false,
				'Reject expired, missing, or duplicated serialized reservation metadata before checkout.'
			),
			new HookContract(
				'woocommerce_before_calculate_totals',
				'apply_exact_inventory_price_snapshots',
				self::PHASE_CART,
				20,
				1,
				false,
				'Apply immutable reservation price snapshots instead of recalculating serialized item prices.'
			),
			new HookContract(
				'woocommerce_checkout_create_order_line_item',
				'attach_exact_inventory_order_line_metadata',
				self::PHASE_CHECKOUT,
				10,
				4,
				false,
				'Copy inventory, reservation, owner-token, and price snapshot metadata onto order lines.'
			),
			new HookContract(
				'woocommerce_checkout_order_processed',
				'mark_exact_inventory_reservations_checkout_pending',
				self::PHASE_ORDER,
				10,
				3,
				false,
				'Link reservation holds to the created order while payment capture is still pending.'
			),
			new HookContract(
				'woocommerce_payment_complete',
				'convert_paid_exact_inventory_reservations',
				self::PHASE_PAYMENT,
				10,
				1,
				false,
				'Convert paid serialized reservations to sold exactly once after successful payment.'
			),
			new HookContract(
				'woocommerce_order_status_failed',
				'release_failed_order_exact_inventory_reservations',
				self::PHASE_PAYMENT,
				10,
				1,
				false,
				'Release serialized reservations when payment fails and the item has not been sold.'
			),
			new HookContract(
				'woocommerce_order_status_cancelled',
				'release_cancelled_order_exact_inventory_reservations',
				self::PHASE_ORDER,
				10,
				1,
				false,
				'Release serialized reservations when an order is cancelled before fulfillment.'
			),
			new HookContract(
				'woocommerce_cart_item_removed',
				'release_removed_cart_exact_inventory_reservation',
				self::PHASE_CART,
				10,
				2,
				false,
				'Release an exact inventory reservation when its WooCommerce cart line is removed.'
			),
			new HookContract(
				'woocommerce_order_refunded',
				'mark_refunded_exact_inventory_pending_review',
				self::PHASE_REFUND,
				10,
				2,
				false,
				'Move refunded serialized items to pending review instead of silently making them available.'
			),
			new HookContract(
				'woocommerce_store_api_validate_cart_item',
				'validate_store_api_exact_inventory_cart_item',
				self::PHASE_STORE_API,
				10,
				2,
				false,
				'Mirror exact inventory cart validation for Cart and Checkout Blocks Store API flows.'
			),
		);
	}

	/**
	 * @return list<string>
	 */
	public function hook_names(): array {
		return array_map(
			static fn ( HookContract $contract ): string => $contract->hook_name(),
			$this->contracts()
		);
	}

	public function find( string $hook_name ): ?HookContract {
		foreach ( $this->contracts() as $contract ) {
			if ( $contract->hook_name() === $hook_name ) {
				return $contract;
			}
		}

		return null;
	}
}
