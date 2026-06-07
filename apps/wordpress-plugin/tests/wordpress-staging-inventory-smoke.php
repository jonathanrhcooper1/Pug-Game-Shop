<?php
/**
 * WordPress staging smoke verification for the staff inventory search route.
 *
 * Intended to run through WP-CLI after staging feature flags and runtime gates
 * are enabled in a disposable WordPress integration site.
 *
 * @package TCGStorePlatform
 */

use TCGStorePlatform\FeatureFlags\FeatureFlags;
use TCGStorePlatform\Settings\InventoryRouteRuntimeSettings;
use TCGStorePlatform\Settings\Settings;

if ( ! defined( 'ABSPATH' ) ) {
	fwrite( STDERR, "This script must run inside WordPress.\n" );
	exit( 1 );
}

$fail = static function ( string $message ): void {
	fwrite( STDERR, "FAIL {$message}\n" );
	exit( 1 );
};

$assert = static function ( bool $condition, string $message ) use ( $fail ): void {
	if ( ! $condition ) {
		$fail( $message );
	}
};

$assert(
	function_exists( 'wp_get_environment_type' ) && 'staging' === wp_get_environment_type(),
	'WP_ENVIRONMENT_TYPE must be staging for inventory staging smoke coverage.'
);
$assert( FeatureFlags::is_available( 'inventory_pricing' ), 'Inventory feature flag should be staging-available.' );
$assert( FeatureFlags::is_enabled( 'inventory_pricing' ), 'Inventory feature flag should be enabled for staging smoke.' );

$runtime = InventoryRouteRuntimeSettings::from_settings( Settings::all() );
$assert( true === ( $runtime['staff_search_route_enabled'] ?? null ), 'Staff inventory search gate should be enabled.' );
$assert( false === ( $runtime['public_search_route_enabled'] ?? null ), 'Public inventory search gate should remain disabled.' );

global $wpdb;

$now                 = '2026-06-07 12:00:00.000000';
$locations_table     = $wpdb->prefix . 'tcg_inventory_locations';
$inventory_table     = $wpdb->prefix . 'tcg_inventory_items';
$location_public_id  = '00000000-0000-4000-8000-000000000101';
$inventory_public_id = '00000000-0000-4000-8000-000000000201';
$seed_barcode        = 'PUG-STAGE-PKM-BASE-058';
$seed_sku            = 'PUG-STAGE-PKM-BASE-058';

$wpdb->query(
	$wpdb->prepare(
		"DELETE FROM {$inventory_table} WHERE public_id = %s OR barcode = %s OR sku = %s", // phpcs:ignore WordPress.DB.PreparedSQL.InterpolatedNotPrepared
		$inventory_public_id,
		$seed_barcode,
		$seed_sku
	)
);
$wpdb->query(
	$wpdb->prepare(
		"DELETE FROM {$locations_table} WHERE public_id = %s OR code = %s", // phpcs:ignore WordPress.DB.PreparedSQL.InterpolatedNotPrepared
		$location_public_id,
		'SHOWCASE-A'
	)
);

$location_inserted = $wpdb->insert(
	$locations_table,
	array(
		'public_id'     => $location_public_id,
		'location_type' => 'showcase',
		'code'          => 'SHOWCASE-A',
		'name'          => 'Showcase A',
		'timezone'      => 'America/New_York',
		'is_active'     => 1,
		'sort_order'    => 10,
		'created_at'    => $now,
		'updated_at'    => $now,
		'row_version'   => 1,
	)
);
$assert( false !== $location_inserted, 'Staging smoke location seed insert failed.' );

$location_id = (int) $wpdb->insert_id;
$assert( $location_id > 0, 'Staging smoke location seed did not produce an ID.' );

$inventory_inserted = $wpdb->insert(
	$inventory_table,
	array(
		'public_id'             => $inventory_public_id,
		'provider_name'         => 'manual',
		'provider_card_id'      => 'stage-pokemon-base-58',
		'game'                  => 'pokemon',
		'card_name'             => 'Pikachu',
		'set_name'              => 'Base Set',
		'set_code'              => 'BASE',
		'card_number'           => '58',
		'printed_number'        => '58/102',
		'year'                  => 1999,
		'rarity'                => 'Common',
		'rarity_code'           => 'C',
		'variant'               => 'Unlimited',
		'finish'                => 'Regular',
		'language'              => 'EN',
		'raw_or_graded'         => 'raw',
		'condition_code'        => 'NM',
		'barcode'               => $seed_barcode,
		'sku'                   => $seed_sku,
		'cost'                  => '1.0000',
		'cost_currency'         => 'USD',
		'market_price'          => '3.0000',
		'market_price_currency' => 'USD',
		'suggested_price'       => '3.3000',
		'sale_price'            => '3.5000',
		'minimum_sale_price'    => '1.0000',
		'sale_currency'         => 'USD',
		'pricing_source'        => 'staging_smoke_seed',
		'pricing_formula'       => 'manual_seed',
		'price_lock'            => 0,
		'price_floor_hit'       => 0,
		'location_id'           => $location_id,
		'online_visibility'     => 'visible',
		'kiosk_visibility'      => 'visible',
		'pos_visibility'        => 'visible',
		'status'                => 'available',
		'notes'                 => 'Disposable staging smoke seed.',
		'staff_notes'           => 'Seeded by wordpress-staging-inventory-smoke.php',
		'date_acquired'         => $now,
		'date_listed'           => $now,
		'created_by'            => 1,
		'updated_by'            => 1,
		'created_at'            => $now,
		'updated_at'            => $now,
		'row_version'           => 1,
	)
);
$assert( false !== $inventory_inserted, 'Staging smoke inventory seed insert failed.' );

wp_set_current_user( 1 );
do_action( 'rest_api_init' );

$routes = rest_get_server()->get_routes();
$assert( isset( $routes['/tcg-store/v1/inventory/search'] ), 'Staging inventory search route was not registered.' );
$assert( ! isset( $routes['/tcg-store/v1/inventory'] ), 'Inventory create route should remain unregistered on staging smoke.' );
$assert( ! isset( $routes['/tcg-store/v1/pos/events'] ), 'POS event route should remain unregistered on staging smoke.' );

$request = new WP_REST_Request( 'GET', '/tcg-store/v1/inventory/search' );
$request->set_param( 'q', 'Pikachu' );
$request->set_param( 'visibility', 'staff' );
$request->set_param( 'page', '1' );
$request->set_param( 'page_size', '10' );

$search_response = rest_do_request( $request );
$assert( ! $search_response->is_error(), 'Inventory search REST route returned an error.' );
$assert( 200 === $search_response->get_status(), 'Inventory search REST route did not return HTTP 200.' );

$search_data = $search_response->get_data();
$assert( is_array( $search_data ), 'Inventory search response is not an array.' );
$assert( 'inventory_search_read_ready' === ( $search_data['code'] ?? null ), 'Inventory search response did not report ready read status.' );
$assert( true === ( $search_data['meta']['route_connected_reads_enabled'] ?? null ), 'Inventory search reads should be enabled.' );
$assert( true === ( $search_data['meta']['route_connected_writes_deferred'] ?? null ), 'Inventory search writes should remain deferred.' );
$assert( true === ( $search_data['meta']['woocommerce_projection_deferred'] ?? null ), 'WooCommerce projection should remain deferred.' );
$assert( true === ( $search_data['meta']['square_inventory_projection_deferred'] ?? null ), 'Square projection should remain deferred.' );
$assert( 1 === (int) ( $search_data['data']['meta']['total'] ?? -1 ), 'Disposable staging smoke inventory should return the seeded card.' );
$assert( 'staff' === ( $search_data['data']['meta']['visibility'] ?? null ), 'Inventory search should preserve staff visibility.' );
$assert( false === ( $search_data['data']['meta']['public_redaction'] ?? null ), 'Staff inventory search should not use public redaction.' );

$items = $search_data['data']['items'] ?? array();
$assert( is_array( $items ) && isset( $items[0] ) && is_array( $items[0] ), 'Inventory search should return a seeded row.' );
$assert( 'Pikachu' === ( $items[0]['card_name'] ?? null ), 'Inventory search should return the seeded Pikachu card.' );
$assert( 'PUG-STAGE-PKM-BASE-058' === ( $items[0]['sku'] ?? null ), 'Staff inventory search should expose the seeded SKU.' );
$assert( '3.50' === ( $items[0]['sale_price'] ?? null ), 'Inventory search should normalize seeded sale price.' );

$health_response = rest_do_request( '/tcg-store/v1/health' );
$assert( ! $health_response->is_error(), 'Health REST route returned an error during staging smoke.' );
$assert( 200 === $health_response->get_status(), 'Health REST route did not return HTTP 200 during staging smoke.' );

$health = $health_response->get_data();
$assert( is_array( $health ), 'Health response is not an array during staging smoke.' );
$assert( true === ( $health['features']['inventory_pricing']['available'] ?? null ), 'Health should report inventory staging availability.' );
$assert( true === ( $health['features']['inventory_pricing']['enabled'] ?? null ), 'Health should report inventory staging enablement.' );
$assert( 'ready' === ( $health['inventory_route_bootstrap']['status'] ?? null ), 'Inventory route bootstrap should be ready on staging smoke.' );
$assert( true === ( $health['inventory_route_bootstrap']['feature_enabled'] ?? null ), 'Inventory route bootstrap feature should be enabled.' );
$assert( 1 === (int) ( $health['inventory_route_bootstrap']['registerable_route_count'] ?? 0 ), 'Only staff inventory search should be registerable.' );
$assert( true === ( $health['inventory_route_bootstrap']['should_register_routes'] ?? null ), 'Inventory route bootstrap should register staging search.' );
$assert( false === ( $health['inventory_route_bootstrap']['registration_deferred'] ?? null ), 'Inventory route bootstrap should not be deferred.' );

$inventory_routes = $health['inventory_route_bootstrap']['route_registration_summary'] ?? array();
$assert( is_array( $inventory_routes ), 'Inventory route summary should be present during staging smoke.' );
$assert( true === ( $inventory_routes['GET /inventory/search']['should_register'] ?? null ), 'Staff inventory search should be registerable.' );
$assert( false === ( $inventory_routes['GET /inventory/search']['route_connected_reads_deferred'] ?? null ), 'Staff inventory search reads should not be deferred.' );
$assert( true === ( $inventory_routes['GET /inventory/search']['route_connected_writes_deferred'] ?? null ), 'Staff inventory search writes should remain deferred.' );
$assert( false === ( $inventory_routes['POST /inventory']['should_register'] ?? null ), 'Inventory create route should remain unregistered.' );
$assert( true === ( $inventory_routes['POST /inventory']['route_connected_writes_deferred'] ?? null ), 'Inventory create writes should remain deferred.' );

$dependencies = $health['inventory_route_dependencies'] ?? array();
$assert( is_array( $dependencies ), 'Inventory route dependency summary should be present during staging smoke.' );
$assert( false === ( $dependencies['public_read_routes_enabled'] ?? null ), 'Public inventory reads should remain disabled.' );
$assert( true === ( $dependencies['inventory_search_route_handler_ready'] ?? null ), 'Inventory search handler should be route-ready.' );
$assert( false === ( $dependencies['inventory_search_route_reads_deferred'] ?? null ), 'Inventory search handler reads should not be deferred.' );
$assert( true === ( $dependencies['inventory_intake_route_writes_deferred'] ?? null ), 'Inventory intake writes should remain deferred.' );

echo "PASS WordPress staging inventory smoke test\n";
