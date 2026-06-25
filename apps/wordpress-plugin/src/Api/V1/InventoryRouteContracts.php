<?php
/**
 * Planned inventory and card-search REST route contracts.
 *
 * @package TCGStorePlatform
 */

namespace TCGStorePlatform\Api\V1;

final class InventoryRouteContracts {
	private const NAMESPACE = 'tcg-store/v1';

	/**
	 * @return list<array<string, mixed>>
	 */
	public static function route_contracts(): array {
		return array(
			array(
				'namespace'               => self::NAMESPACE,
				'path'                    => '/inventory',
				'method'                  => 'GET',
				'callback'                => 'list_inventory',
				'permission'              => 'view_inventory',
				'live_enabled_by_default' => false,
			),
			array(
				'namespace'               => self::NAMESPACE,
				'path'                    => '/inventory/(?P<inventory_id>\d+)',
				'method'                  => 'GET',
				'callback'                => 'get_inventory_item',
				'permission'              => 'public_visibility_or_view_inventory',
				'live_enabled_by_default' => false,
			),
			array(
				'namespace'               => self::NAMESPACE,
				'path'                    => '/inventory',
				'method'                  => 'POST',
				'callback'                => 'create_inventory_item',
				'permission'              => 'create_inventory',
				'live_enabled_by_default' => false,
			),
			array(
				'namespace'               => self::NAMESPACE,
				'path'                    => '/inventory/(?P<inventory_id>[a-zA-Z0-9_-]+)',
				'method'                  => 'PUT',
				'callback'                => 'update_inventory_item',
				'permission'              => 'edit_inventory',
				'live_enabled_by_default' => false,
			),
			array(
				'namespace'               => self::NAMESPACE,
				'path'                    => '/inventory/(?P<inventory_id>\d+)/reserve',
				'method'                  => 'POST',
				'callback'                => 'reserve_inventory_item',
				'permission'              => 'source_authenticated_principal',
				'live_enabled_by_default' => false,
			),
			array(
				'namespace'               => self::NAMESPACE,
				'path'                    => '/inventory/(?P<inventory_id>\d+)/release',
				'method'                  => 'POST',
				'callback'                => 'release_inventory_item',
				'permission'              => 'reservation_owner_or_staff',
				'live_enabled_by_default' => false,
			),
			array(
				'namespace'               => self::NAMESPACE,
				'path'                    => '/inventory/(?P<inventory_id>[a-zA-Z0-9_-]+)/mark-sold',
				'method'                  => 'POST',
				'callback'                => 'mark_inventory_item_sold',
				'permission'              => 'staff_or_pos_device',
				'live_enabled_by_default' => false,
			),
			array(
				'namespace'               => self::NAMESPACE,
				'path'                    => '/inventory/(?P<inventory_id>\d+)/move',
				'method'                  => 'POST',
				'callback'                => 'move_inventory_item',
				'permission'              => 'edit_inventory',
				'live_enabled_by_default' => false,
			),
			array(
				'namespace'               => self::NAMESPACE,
				'path'                    => '/inventory/(?P<inventory_id>\d+)/price-lock',
				'method'                  => 'POST',
				'callback'                => 'lock_inventory_item_price',
				'permission'              => 'edit_prices',
				'live_enabled_by_default' => false,
			),
			array(
				'namespace'               => self::NAMESPACE,
				'path'                    => '/inventory/bulk-intake',
				'method'                  => 'POST',
				'callback'                => 'bulk_intake_inventory',
				'permission'              => 'create_inventory',
				'live_enabled_by_default' => false,
			),
			array(
				'namespace'               => self::NAMESPACE,
				'path'                    => '/inventory/import',
				'method'                  => 'POST',
				'callback'                => 'import_inventory',
				'permission'              => 'manage_inventory_imports',
				'live_enabled_by_default' => false,
			),
			array(
				'namespace'               => self::NAMESPACE,
				'path'                    => '/inventory/export',
				'method'                  => 'POST',
				'callback'                => 'export_inventory',
				'permission'              => 'view_reports',
				'live_enabled_by_default' => false,
			),
			array(
				'namespace'               => self::NAMESPACE,
				'path'                    => '/search',
				'method'                  => 'GET',
				'callback'                => 'search_public_catalog',
				'permission'              => 'public_filtered_response',
				'live_enabled_by_default' => false,
			),
			array(
				'namespace'               => self::NAMESPACE,
				'path'                    => '/reference/search',
				'method'                  => 'GET',
				'callback'                => 'search_reference_cards',
				'permission'              => 'public_rate_limited',
				'live_enabled_by_default' => false,
			),
			array(
				'namespace'               => self::NAMESPACE,
				'path'                    => '/inventory/search',
				'method'                  => 'GET',
				'callback'                => 'search_inventory_items',
				'permission'              => 'public_or_staff_inventory_fields',
				'live_enabled_by_default' => false,
			),
			array(
				'namespace'               => self::NAMESPACE,
				'path'                    => '/search/versions',
				'method'                  => 'GET',
				'callback'                => 'search_card_versions',
				'permission'              => 'public_filtered_response',
				'live_enabled_by_default' => false,
			),
		);
	}

	private function __construct() {
	}
}
