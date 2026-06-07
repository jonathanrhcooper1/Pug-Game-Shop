<?php
/**
 * Square payment delegation policy tests.
 *
 * @package TCGStorePlatform
 */

namespace TCGStorePlatform\Tests\Unit;

use TCGStorePlatform\Square\SquarePaymentDelegationPolicy;
use TCGStorePlatform\Tests\TestCase;

final class SquarePaymentDelegationPolicyTest extends TestCase {
	public function test_policy_delegates_square_payments_to_official_woocommerce_extension(): void {
		$payload = SquarePaymentDelegationPolicy::audit_payload();

		$this->assert_same( 'Delegated to WooCommerce Square', SquarePaymentDelegationPolicy::status_label() );
		$this->assert_same( 'required_for_payments', $payload['official_square_payment_extension'] );
		$this->assert_true( $payload['official_woocommerce_square_extension_required'] );
		$this->assert_same( 'official_woocommerce_square_extension', $payload['payment_capture_authority'] );
		$this->assert_false( $payload['plugin_square_payment_capture_allowed'] );
		$this->assert_false( $payload['plugin_square_refund_execution_allowed'] );
		$this->assert_false( $payload['plugin_square_custom_gateway_allowed'] );
		$this->assert_same( 'delegated_to_official_extension', $payload['plugin_square_payment_gateway_mode'] );
		$this->assert_same( 'catalog_inventory_projection_and_reconciliation_only', $payload['square_inventory_sync_scope'] );
		$this->assert_same( 'disabled', $payload['platform_square_payment_gateway_implementation'] );
		$this->assert_contains( 'serialized inventory only', SquarePaymentDelegationPolicy::admin_note() );
	}
}
