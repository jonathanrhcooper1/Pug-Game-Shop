<?php
/**
 * WordPress integration smoke verification.
 *
 * Intended to run through WP-CLI after the plugin is activated in a real
 * WordPress install.
 *
 * @package TCGStorePlatform
 */

use TCGStorePlatform\Auth\RoleManager;
use TCGStorePlatform\Migrations\BuylistSchema;
use TCGStorePlatform\Migrations\CustomerCreditSchema;
use TCGStorePlatform\Migrations\EventsTopDeckSchema;
use TCGStorePlatform\Migrations\FoundationSchema;
use TCGStorePlatform\Migrations\InventoryPricingSchema;
use TCGStorePlatform\Migrations\MigrationRunner;
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

global $wpdb;

$assert( class_exists( Version::class ), 'Plugin classes were not loaded.' );
$assert( '0.44.0' === Version::PLUGIN, 'Unexpected plugin version.' );
$assert( 7 === Version::DATABASE, 'Unexpected database target version.' );
$assert( 7 === (int) get_option( MigrationRunner::VERSION_OPTION, 0 ), 'Database version option was not updated.' );
$assert( 1 === (int) get_option( RoleManager::VERSION_OPTION, 0 ), 'Role version option was not updated.' );

$tables = array_merge(
	FoundationSchema::tables( $wpdb->prefix, $wpdb->get_charset_collate() ),
	InventoryPricingSchema::tables( $wpdb->prefix, $wpdb->get_charset_collate() ),
	EventsTopDeckSchema::tables( $wpdb->prefix, $wpdb->get_charset_collate() ),
	CustomerCreditSchema::tables( $wpdb->prefix, $wpdb->get_charset_collate() ),
	BuylistSchema::tables( $wpdb->prefix, $wpdb->get_charset_collate() ),
	SyncSchema::tables( $wpdb->prefix, $wpdb->get_charset_collate() ),
	ReservationSchema::tables( $wpdb->prefix, $wpdb->get_charset_collate() )
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

wp_set_current_user( 1 );
do_action( 'rest_api_init' );

$routes = rest_get_server()->get_routes();
$assert( isset( $routes['/tcg-store/v1/health'] ), 'Health REST route was not registered.' );
$assert( isset( $routes['/tcg-store/v1/events'] ), 'Events REST list route was not registered.' );
$assert( isset( $routes['/tcg-store/v1/events/(?P<slug>[a-zA-Z0-9_-]+)'] ), 'Events REST detail route was not registered.' );
$assert( isset( $routes['/tcg-store/v1/events/(?P<slug>[a-zA-Z0-9_-]+)/register'] ), 'Events REST registration route was not registered.' );

$response = rest_do_request( '/tcg-store/v1/health' );
$assert( ! $response->is_error(), 'Health REST route returned an error.' );
$assert( 200 === $response->get_status(), 'Health REST route did not return HTTP 200.' );

$data = $response->get_data();
$assert( is_array( $data ), 'Health response is not an array.' );
$assert( '0.44.0' === ( $data['version'] ?? null ), 'Health response reported the wrong plugin version.' );
$assert( 7 === (int) ( $data['database']['current'] ?? 0 ), 'Health response reported the wrong current schema.' );
$assert( 7 === (int) ( $data['database']['target'] ?? 0 ), 'Health response reported the wrong target schema.' );
$assert( true === ( $data['features']['core']['enabled'] ?? null ), 'Core feature is not enabled.' );
$assert( false === ( $data['features']['inventory_pricing']['enabled'] ?? null ), 'Inventory feature flag should remain disabled.' );

echo "PASS WordPress integration smoke test\n";
