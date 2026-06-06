<?php
/**
 * Feature flag definitions.
 *
 * @package TCGStorePlatform
 */

namespace TCGStorePlatform\FeatureFlags;

final class FeatureFlagRegistry {
	/**
	 * @return array<string, array{label:string,default:bool,available:bool,phase:int}>
	 */
	public static function definitions(): array {
		return array(
			'core'                     => array(
				'label'     => 'Platform foundation',
				'default'   => true,
				'available' => true,
				'phase'     => 1,
			),
			'inventory_pricing'        => array(
				'label'     => 'Inventory and pricing',
				'default'   => false,
				'available' => false,
				'phase'     => 2,
			),
			'scrydex_sync'             => array(
				'label'     => 'ScryDex sync',
				'default'   => false,
				'available' => false,
				'phase'     => 3,
			),
			'woocommerce_reservations' => array(
				'label'     => 'WooCommerce reservations',
				'default'   => false,
				'available' => false,
				'phase'     => 4,
			),
			'kiosk_pick_queue'         => array(
				'label'     => 'Kiosk and pick queue',
				'default'   => false,
				'available' => false,
				'phase'     => 5,
			),
			'customer_credit'          => array(
				'label'     => 'Customer credit',
				'default'   => false,
				'available' => false,
				'phase'     => 6,
			),
			'buylist'                  => array(
				'label'     => 'Buylist',
				'default'   => false,
				'available' => false,
				'phase'     => 6,
			),
			'offline_sync'             => array(
				'label'     => 'Offline application sync',
				'default'   => false,
				'available' => false,
				'phase'     => 7,
			),
			'pos_payments'             => array(
				'label'     => 'POS and payment adapters',
				'default'   => false,
				'available' => false,
				'phase'     => 8,
			),
			'events_topdeck'           => array(
				'label'     => 'Events and TopDeck',
				'default'   => false,
				'available' => false,
				'phase'     => 9,
			),
		);
	}

	private function __construct() {
	}
}
