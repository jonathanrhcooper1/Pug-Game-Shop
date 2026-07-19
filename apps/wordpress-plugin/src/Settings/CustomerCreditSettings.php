<?php
/**
 * Customer credit policy settings.
 *
 * @package TCGStorePlatform
 */

namespace TCGStorePlatform\Settings;

final class CustomerCreditSettings {
	public const KEY = 'customer_credit';

	/**
	 * @return array<string, mixed>
	 */
	public static function defaults(): array {
		return array(
			'local_store_only'                       => true,
			'online_redemption_enabled'              => false,
			'manager_approval_threshold_minor_units' => 10000,
		);
	}

	/**
	 * @param mixed                $value Submitted settings.
	 * @param array<string, mixed> $fallback Existing safe settings.
	 * @return array<string, mixed>
	 */
	public static function sanitize( mixed $value, array $fallback = array() ): array {
		$value     = is_array( $value ) ? $value : array();
		$fallback  = array_merge( self::defaults(), $fallback );
		$threshold = (int) ( $value['manager_approval_threshold_minor_units'] ?? $fallback['manager_approval_threshold_minor_units'] );

		if ( $threshold < 0 ) {
			$threshold = 0;
		}

		$local_store_only          = array_key_exists( 'local_store_only', $value )
			? ! empty( $value['local_store_only'] )
			: (bool) $fallback['local_store_only'];
		$online_redemption_enabled = array_key_exists( 'online_redemption_enabled', $value )
			? ! empty( $value['online_redemption_enabled'] )
			: (bool) $fallback['online_redemption_enabled'];

		if ( $local_store_only ) {
			$online_redemption_enabled = false;
		}

		return array(
			'local_store_only'                       => $local_store_only,
			'online_redemption_enabled'              => $online_redemption_enabled,
			'manager_approval_threshold_minor_units' => $threshold,
		);
	}

	/**
	 * @param array<string, mixed> $settings Platform settings.
	 */
	public static function online_redemption_enabled( array $settings ): bool {
		$policy = self::sanitize( $settings[ self::KEY ] ?? array() );

		return ! $policy['local_store_only'] && $policy['online_redemption_enabled'];
	}

	private function __construct() {
	}
}
