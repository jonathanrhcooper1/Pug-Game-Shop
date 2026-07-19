<?php
/**
 * WooCommerce feature compatibility declarations.
 *
 * @package TCGStorePlatform
 */

namespace TCGStorePlatform\WooCommerce;

use TCGStorePlatform\Version;

final class Compatibility {
	/**
	 * Declare HPOS compatibility only after its lifecycle suite is verified.
	 *
	 * @param string $plugin_file Main plugin file.
	 */
	public static function declare( string $plugin_file ): void {
		$features_util = '\Automattic\WooCommerce\Utilities\FeaturesUtil';

		if ( ! class_exists( $features_util ) ) {
			return;
		}

		$features_util::declare_compatibility(
			'custom_order_tables',
			$plugin_file,
			Version::HPOS_COMPATIBILITY_VERIFIED
		);
	}

	public static function hpos_status(): string {
		return Version::HPOS_COMPATIBILITY_VERIFIED ? 'verified' : 'pending_verification';
	}
}
