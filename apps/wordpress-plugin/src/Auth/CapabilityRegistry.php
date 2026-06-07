<?php
/**
 * Platform role and capability definitions.
 *
 * @package TCGStorePlatform
 */

namespace TCGStorePlatform\Auth;

final class CapabilityRegistry {
	/**
	 * @return list<string>
	 */
	public static function all(): array {
		return array(
			'view_inventory',
			'edit_inventory',
			'create_inventory',
			'delete_inventory',
			'print_labels',
			'edit_prices',
			'override_minimum_price',
			'view_credit',
			'adjust_credit',
			'redeem_credit',
			'approve_buylist',
			'manage_events',
			'manage_pos',
			'manage_settings',
			'view_reports',
			'resolve_conflicts',
		);
	}

	/**
	 * @return list<string>
	 */
	public static function staff(): array {
		return array(
			'view_inventory',
			'edit_inventory',
			'create_inventory',
			'print_labels',
			'edit_prices',
			'view_credit',
			'redeem_credit',
			'manage_events',
		);
	}

	/**
	 * @return list<string>
	 */
	public static function manager(): array {
		return self::all();
	}

	/**
	 * @return array<string, list<string>>
	 */
	public static function roles(): array {
		return array(
			'tcg_store_staff'   => self::staff(),
			'tcg_store_manager' => self::manager(),
			'tcg_store_system'  => self::all(),
		);
	}

	private function __construct() {
	}
}
