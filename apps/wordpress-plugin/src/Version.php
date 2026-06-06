<?php
/**
 * Platform version constants.
 *
 * @package TCGStorePlatform
 */

namespace TCGStorePlatform;

final class Version {
	public const PLUGIN              = '0.74.0';
	public const DATABASE            = 8;
	public const MINIMUM_PHP         = '8.1';
	public const MINIMUM_WORDPRESS   = '6.5';
	public const MINIMUM_WOOCOMMERCE = '8.2';

	/**
	 * HPOS remains unverified until WooCommerce lifecycle tests run in Phase 4.
	 */
	public const HPOS_COMPATIBILITY_VERIFIED = false;

	private function __construct() {
	}
}
