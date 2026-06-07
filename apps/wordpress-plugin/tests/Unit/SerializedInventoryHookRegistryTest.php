<?php
/**
 * WooCommerce serialized inventory hook registry tests.
 *
 * @package TCGStorePlatform
 */

namespace TCGStorePlatform\Tests\Unit;

use TCGStorePlatform\Tests\TestCase;
use TCGStorePlatform\WooCommerce\SerializedInventoryHookRegistry;

final class SerializedInventoryHookRegistryTest extends TestCase {
	public function test_expected_woocommerce_lifecycle_hooks_are_tracked(): void {
		$registry = new SerializedInventoryHookRegistry();

		$this->assert_same(
			array(
				'woocommerce_add_cart_item_data',
				'woocommerce_get_cart_item_from_session',
				'woocommerce_check_cart_items',
				'woocommerce_before_calculate_totals',
				'woocommerce_checkout_create_order_line_item',
				'woocommerce_checkout_order_processed',
				'woocommerce_payment_complete',
				'woocommerce_order_status_failed',
				'woocommerce_order_status_cancelled',
				'woocommerce_cart_item_removed',
				'woocommerce_order_refunded',
				'woocommerce_store_api_validate_cart_item',
			),
			$registry->hook_names()
		);
	}

	public function test_live_hook_registration_remains_disabled_by_default(): void {
		foreach ( ( new SerializedInventoryHookRegistry() )->contracts() as $contract ) {
			$this->assert_false(
				$contract->live_enabled_by_default(),
				$contract->hook_name() . ' should remain staging-gated.'
			);
		}
	}

	public function test_contracts_have_unique_hook_names(): void {
		$hook_names = ( new SerializedInventoryHookRegistry() )->hook_names();

		$this->assert_same(
			count( $hook_names ),
			count( array_unique( $hook_names ) )
		);
	}

	public function test_payment_completion_contract_shape_is_stable(): void {
		$contract = ( new SerializedInventoryHookRegistry() )->find( 'woocommerce_payment_complete' );

		$this->assert_true( null !== $contract );
		$this->assert_same( 'convert_paid_exact_inventory_reservations', $contract->handler_method() );
		$this->assert_same( SerializedInventoryHookRegistry::PHASE_PAYMENT, $contract->phase() );
		$this->assert_same( 10, $contract->priority() );
		$this->assert_same( 1, $contract->accepted_args() );
	}

	public function test_store_api_contract_is_kept_separate_from_classic_checkout(): void {
		$contract = ( new SerializedInventoryHookRegistry() )->find( 'woocommerce_store_api_validate_cart_item' );

		$this->assert_true( null !== $contract );
		$this->assert_same( SerializedInventoryHookRegistry::PHASE_STORE_API, $contract->phase() );
		$this->assert_same( 2, $contract->accepted_args() );
	}
}
