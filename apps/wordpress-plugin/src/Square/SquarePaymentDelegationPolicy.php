<?php
/**
 * Square payment ownership boundary.
 *
 * @package TCGStorePlatform
 */

namespace TCGStorePlatform\Square;

final class SquarePaymentDelegationPolicy {
	public const EXTENSION_STATUS          = 'required_for_payments';
	public const PAYMENT_CAPTURE_AUTHORITY = 'official_woocommerce_square_extension';
	public const GATEWAY_MODE              = 'delegated_to_official_extension';
	public const INVENTORY_SYNC_SCOPE      = 'catalog_inventory_projection_and_reconciliation_only';

	/**
	 * @return array<string, mixed>
	 */
	public static function audit_payload(): array {
		$extension_status = ( new WooCommerceSquareExtensionStatus() )->readiness_summary();

		return array(
			'payment_capture_deferred'                     => true,
			'woocommerce_gateway_capture_deferred'         => true,
			'official_square_payment_extension'            => self::EXTENSION_STATUS,
			'official_woocommerce_square_extension_required' => true,
			'official_woocommerce_square_extension_status' => $extension_status['status'],
			'official_woocommerce_square_extension_active' => $extension_status['extension_active'],
			'official_woocommerce_square_extension_readiness' => $extension_status,
			'payment_capture_authority'                    => self::PAYMENT_CAPTURE_AUTHORITY,
			'plugin_square_payment_capture_allowed'        => false,
			'plugin_square_refund_execution_allowed'       => false,
			'plugin_square_custom_gateway_allowed'         => false,
			'plugin_square_payment_gateway_mode'           => self::GATEWAY_MODE,
			'square_payment_capture_scope'                 => self::PAYMENT_CAPTURE_AUTHORITY,
			'square_inventory_sync_scope'                  => self::INVENTORY_SYNC_SCOPE,
			'platform_square_payment_gateway_implementation' => 'disabled',
			'platform_square_payment_gateway_configuration_ui' => 'disabled',
		);
	}

	public static function status_label(): string {
		return 'Delegated to WooCommerce Square';
	}

	public static function admin_note(): string {
		return 'official WooCommerce Square extension owns payment capture/refunds; platform syncs serialized inventory only';
	}
}
