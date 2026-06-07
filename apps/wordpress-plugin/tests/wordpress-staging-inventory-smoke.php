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

wp_set_current_user( 1 );
do_action( 'rest_api_init' );

$routes = rest_get_server()->get_routes();
$assert( isset( $routes['/tcg-store/v1/inventory/search'] ), 'Staging inventory search route was not registered.' );
$assert( ! isset( $routes['/tcg-store/v1/inventory'] ), 'Inventory create route should remain unregistered on staging smoke.' );
$assert( ! isset( $routes['/tcg-store/v1/pos/events'] ), 'POS event route should remain unregistered on staging smoke.' );

$request = new WP_REST_Request( 'GET', '/tcg-store/v1/inventory/search' );
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
$assert( 0 === (int) ( $search_data['data']['meta']['total'] ?? -1 ), 'Disposable staging smoke inventory should start empty.' );
$assert( 'staff' === ( $search_data['data']['meta']['visibility'] ?? null ), 'Inventory search should preserve staff visibility.' );
$assert( false === ( $search_data['data']['meta']['public_redaction'] ?? null ), 'Staff inventory search should not use public redaction.' );

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
