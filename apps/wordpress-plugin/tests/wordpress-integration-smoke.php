<?php
/**
 * WordPress integration smoke verification.
 *
 * Intended to run through WP-CLI after the plugin is activated in a real
 * WordPress install.
 *
 * @package TCGStorePlatform
 */

use TCGStorePlatform\Api\V1\OfflineRouteBootstrapper;
use TCGStorePlatform\Auth\RoleManager;
use TCGStorePlatform\Migrations\BuylistSchema;
use TCGStorePlatform\Migrations\CustomerCreditSchema;
use TCGStorePlatform\Migrations\EventsTopDeckSchema;
use TCGStorePlatform\Migrations\FoundationSchema;
use TCGStorePlatform\Migrations\InventoryPricingSchema;
use TCGStorePlatform\Migrations\MigrationRunner;
use TCGStorePlatform\Migrations\OfflineSyncSchema;
use TCGStorePlatform\Migrations\ReservationSchema;
use TCGStorePlatform\Migrations\SyncSchema;
use TCGStorePlatform\Version;

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

$has_hook_callback = static function (
	string $hook_name,
	string $class_name,
	string $method_name,
	?int $expected_priority = null
): bool {
	global $wp_filter;

	$hook = $wp_filter[ $hook_name ] ?? null;
	if ( ! is_object( $hook ) || ! isset( $hook->callbacks ) || ! is_array( $hook->callbacks ) ) {
		return false;
	}

	foreach ( $hook->callbacks as $priority => $callbacks ) {
		if ( null !== $expected_priority && (int) $priority !== $expected_priority ) {
			continue;
		}

		if ( ! is_array( $callbacks ) ) {
			continue;
		}

		foreach ( $callbacks as $callback ) {
			$function = is_array( $callback ) && array_key_exists( 'function', $callback )
				? $callback['function']
				: $callback;

			if ( ! is_array( $function ) || 2 !== count( $function ) || ! is_string( $function[1] ) ) {
				continue;
			}

			$target = $function[0];
			if (
				$method_name === $function[1]
				&& (
					( is_object( $target ) && $target instanceof $class_name )
					|| ( is_string( $target ) && is_a( $target, $class_name, true ) )
				)
			) {
				return true;
			}
		}
	}

	return false;
};

global $wpdb;

$assert( class_exists( Version::class ), 'Plugin classes were not loaded.' );
$assert( '0.81.0' === Version::PLUGIN, 'Unexpected plugin version.' );
$assert( 8 === Version::DATABASE, 'Unexpected database target version.' );
$assert( 8 === (int) get_option( MigrationRunner::VERSION_OPTION, 0 ), 'Database version option was not updated.' );
$assert( 1 === (int) get_option( RoleManager::VERSION_OPTION, 0 ), 'Role version option was not updated.' );

$tables = array_merge(
	FoundationSchema::tables( $wpdb->prefix, $wpdb->get_charset_collate() ),
	InventoryPricingSchema::tables( $wpdb->prefix, $wpdb->get_charset_collate() ),
	EventsTopDeckSchema::tables( $wpdb->prefix, $wpdb->get_charset_collate() ),
	CustomerCreditSchema::tables( $wpdb->prefix, $wpdb->get_charset_collate() ),
	BuylistSchema::tables( $wpdb->prefix, $wpdb->get_charset_collate() ),
	SyncSchema::tables( $wpdb->prefix, $wpdb->get_charset_collate() ),
	ReservationSchema::tables( $wpdb->prefix, $wpdb->get_charset_collate() ),
	OfflineSyncSchema::tables( $wpdb->prefix, $wpdb->get_charset_collate() )
);

foreach ( array_keys( $tables ) as $table_name ) {
	$found = $wpdb->get_var(
		$wpdb->prepare( 'SHOW TABLES LIKE %s', $wpdb->esc_like( $table_name ) )
	);

	$assert( $found === $table_name, "Expected table is missing: {$table_name}" );
}

$manager = get_role( 'tcg_store_manager' );
$staff   = get_role( 'tcg_store_staff' );
$kiosk   = get_role( 'tcg_store_kiosk' );

$assert( null !== $manager, 'Manager role was not created.' );
$assert( null !== $staff, 'Staff role was not created.' );
$assert( null !== $kiosk, 'Kiosk role was not created.' );
$assert( $manager->has_cap( 'override_minimum_price' ), 'Manager role cannot override minimum price.' );
$assert( $staff->has_cap( 'view_inventory' ), 'Staff role cannot view inventory.' );
$assert( ! $staff->has_cap( 'override_minimum_price' ), 'Staff role can override minimum price.' );
$assert(
	$has_hook_callback( 'rest_api_init', OfflineRouteBootstrapper::class, 'bootstrap_current_routes', 20 ),
	'Offline route bootstrapper was not registered on rest_api_init.'
);

wp_set_current_user( 1 );
do_action( 'rest_api_init' );

$routes = rest_get_server()->get_routes();
$assert( isset( $routes['/tcg-store/v1/health'] ), 'Health REST route was not registered.' );
$assert( isset( $routes['/tcg-store/v1/events'] ), 'Events REST list route was not registered.' );
$assert( isset( $routes['/tcg-store/v1/events/(?P<slug>[a-zA-Z0-9_-]+)'] ), 'Events REST detail route was not registered.' );
$assert( isset( $routes['/tcg-store/v1/events/(?P<slug>[a-zA-Z0-9_-]+)/register'] ), 'Events REST registration route was not registered.' );
$assert( ! isset( $routes['/tcg-store/v1/offline/pull'] ), 'Offline pull route should remain unregistered.' );
$assert( ! isset( $routes['/tcg-store/v1/offline/push'] ), 'Offline push route should remain unregistered.' );

$response = rest_do_request( '/tcg-store/v1/health' );
$assert( ! $response->is_error(), 'Health REST route returned an error.' );
$assert( 200 === $response->get_status(), 'Health REST route did not return HTTP 200.' );

$data = $response->get_data();
$assert( is_array( $data ), 'Health response is not an array.' );
$assert( '0.81.0' === ( $data['version'] ?? null ), 'Health response reported the wrong plugin version.' );
$assert( 8 === (int) ( $data['database']['current'] ?? 0 ), 'Health response reported the wrong current schema.' );
$assert( 8 === (int) ( $data['database']['target'] ?? 0 ), 'Health response reported the wrong target schema.' );
$assert( true === ( $data['features']['core']['enabled'] ?? null ), 'Core feature is not enabled.' );
$assert( false === ( $data['features']['inventory_pricing']['enabled'] ?? null ), 'Inventory feature flag should remain disabled.' );
$assert( 'blocked' === ( $data['offline_route_bootstrap']['status'] ?? null ), 'Offline route bootstrap should remain blocked.' );
$assert( false === ( $data['offline_route_bootstrap']['feature_enabled'] ?? null ), 'Offline route feature should remain disabled.' );
$assert( 5 === (int) ( $data['offline_route_bootstrap']['planned_route_count'] ?? 0 ), 'Offline route bootstrap should report planned routes.' );
$assert( 0 === (int) ( $data['offline_route_bootstrap']['registerable_route_count'] ?? -1 ), 'Offline route bootstrap should report zero registerable routes.' );
$assert( false === ( $data['offline_route_bootstrap']['should_register_routes'] ?? null ), 'Offline route bootstrap should not register routes.' );
$assert( true === ( $data['offline_route_bootstrap']['registration_deferred'] ?? null ), 'Offline route bootstrap should remain deferred.' );

echo "PASS WordPress integration smoke test\n";
