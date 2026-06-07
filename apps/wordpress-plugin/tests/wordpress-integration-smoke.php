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
$assert( '0.112.0' === Version::PLUGIN, 'Unexpected plugin version.' );
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
$assert( '0.112.0' === ( $data['version'] ?? null ), 'Health response reported the wrong plugin version.' );
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
$route_summary = $data['offline_route_bootstrap']['route_registration_summary'] ?? array();
$assert( is_array( $route_summary ), 'Offline route summary should be present.' );
$assert( true === ( $route_summary['POST /offline/pull']['permission_callback_ready'] ?? null ), 'Offline pull permission callback should be staged ready.' );
$assert( true === ( $route_summary['POST /offline/push']['permission_callback_ready'] ?? null ), 'Offline push permission callback should be staged ready.' );
$assert( true === ( $route_summary['POST /offline/pull']['controller_callback_ready'] ?? null ), 'Offline pull controller callback should be staged ready.' );
$assert( true === ( $route_summary['POST /offline/push']['controller_callback_ready'] ?? null ), 'Offline push controller callback should be staged ready.' );
$assert( false === ( $route_summary['POST /offline/pull']['should_register'] ?? null ), 'Offline pull route should remain unregistered.' );
$assert( false === ( $route_summary['POST /offline/push']['should_register'] ?? null ), 'Offline push route should remain unregistered.' );
$assert( 'ready' === ( $data['offline_registered_device_permissions']['status'] ?? null ), 'Offline registered-device permissions should be staged ready.' );
$assert( true === ( $data['offline_registered_device_permissions']['database_configured'] ?? null ), 'Offline registered-device permissions should report database readiness.' );
$assert( 2 === (int) ( $data['offline_registered_device_permissions']['registered_device_route_count'] ?? 0 ), 'Offline registered-device permissions should report pull/push scope count.' );
$assert( 'ready' === ( $data['offline_registered_device_sync_handlers']['status'] ?? null ), 'Offline registered-device sync handlers should be staged ready.' );
$assert( true === ( $data['offline_registered_device_sync_handlers']['pull_handler_configured'] ?? null ), 'Offline pull handler should be configured.' );
$assert( true === ( $data['offline_registered_device_sync_handlers']['pull_response_ready'] ?? null ), 'Offline pull response handler should be staged ready.' );
$assert( true === ( $data['offline_registered_device_sync_handlers']['pull_device_context_planner_ready'] ?? null ), 'Offline pull device context planner should be staged ready.' );
$assert( true === ( $data['offline_registered_device_sync_handlers']['pull_change_query_ready'] ?? null ), 'Offline pull change-query planner should be staged ready.' );
$assert( true === ( $data['offline_registered_device_sync_handlers']['pull_change_query_sql_ready'] ?? null ), 'Offline pull change-query SQL planning should be staged ready.' );
$assert( true === ( $data['offline_registered_device_sync_handlers']['pull_change_query_sql_template_ready'] ?? null ), 'Offline pull change-query SQL templates should be staged ready.' );
$assert( true === ( $data['offline_registered_device_sync_handlers']['pull_change_repository_ready'] ?? null ), 'Offline pull change repository should be staged ready.' );
$assert( true === ( $data['offline_registered_device_sync_handlers']['pull_change_set_provider_ready'] ?? null ), 'Offline pull change-set provider should be staged ready.' );
$assert( true === ( $data['offline_registered_device_sync_handlers']['pull_route_change_set_provider_ready'] ?? null ), 'Offline pull route change-set provider should be staged ready.' );
$assert( true === ( $data['offline_registered_device_sync_handlers']['pull_cursor_advance_planner_ready'] ?? null ), 'Offline pull cursor advance planner should be staged ready.' );
$assert( true === ( $data['offline_registered_device_sync_handlers']['pull_cursor_advance_sql_ready'] ?? null ), 'Offline pull cursor advance SQL planning should be staged ready.' );
$assert( true === ( $data['offline_registered_device_sync_handlers']['pull_cursor_advance_repository_ready'] ?? null ), 'Offline pull cursor advance repository should be staged ready.' );
$assert( true === ( $data['offline_registered_device_sync_handlers']['pull_route_cursor_advance_provider_ready'] ?? null ), 'Offline pull route cursor advance provider should be staged ready.' );
$assert( true === ( $data['offline_registered_device_sync_handlers']['pull_handler_cursor_advance_ready'] ?? null ), 'Offline pull handler cursor advance orchestration should be staged ready.' );
$assert( true === ( $data['offline_registered_device_sync_handlers']['pull_handler_dependency_factory_ready'] ?? null ), 'Offline pull handler dependency factory should be staged ready.' );
$assert( false === ( $data['offline_registered_device_sync_handlers']['pull_handler_route_dependencies_ready'] ?? null ), 'Offline pull handler route dependencies should remain deferred by default.' );
$assert( false === ( $data['offline_registered_device_sync_handlers']['pull_handler_route_execution_enabled'] ?? null ), 'Offline pull handler route execution should remain disabled by default.' );
$assert( 5 === (int) ( $data['offline_registered_device_sync_handlers']['pull_change_query_domain_count'] ?? 0 ), 'Offline pull change-query planner should report every staged domain.' );
$assert( true === ( $data['offline_registered_device_sync_handlers']['pull_change_query_context_deferred'] ?? null ), 'Offline pull change-query context handoff should remain deferred.' );
$assert( true === ( $data['offline_registered_device_sync_handlers']['pull_device_context_route_deferred'] ?? null ), 'Offline pull device context route handoff should remain deferred.' );
$assert( true === ( $data['offline_registered_device_sync_handlers']['pull_route_connected_reads_deferred'] ?? null ), 'Offline pull route-connected reads should remain deferred by default.' );
$assert( true === ( $data['offline_registered_device_sync_handlers']['pull_change_query_cursor_filter_deferred'] ?? null ), 'Offline pull change-query cursor filtering should remain deferred.' );
$assert( true === ( $data['offline_registered_device_sync_handlers']['pull_change_query_execution_deferred'] ?? null ), 'Offline pull change-query execution should remain deferred.' );
$assert( true === ( $data['offline_registered_device_sync_handlers']['pull_cursor_advance_write_deferred'] ?? null ), 'Offline pull cursor advance writes should remain deferred.' );
$assert( true === ( $data['offline_registered_device_sync_handlers']['pull_cursor_advance_execution_deferred'] ?? null ), 'Offline pull cursor advance SQL execution should remain deferred.' );
$assert( true === ( $data['offline_registered_device_sync_handlers']['pull_cursor_advance_route_deferred'] ?? null ), 'Offline pull cursor advance route execution should remain deferred.' );
$assert( true === ( $data['offline_registered_device_sync_handlers']['pull_route_cursor_advance_route_deferred'] ?? null ), 'Offline pull route cursor advance provider should remain deferred.' );
$assert( true === ( $data['offline_registered_device_sync_handlers']['pull_handler_cursor_advance_deferred'] ?? null ), 'Offline pull handler cursor advance orchestration should remain deferred.' );
$assert( true === ( $data['offline_registered_device_sync_handlers']['pull_handler_route_dependencies_deferred'] ?? null ), 'Offline pull handler route dependency injection should remain deferred.' );
$assert( true === ( $data['offline_registered_device_sync_handlers']['pull_handler_route_cursor_writes_deferred'] ?? null ), 'Offline pull handler route cursor writes should remain deferred.' );
$assert( true === ( $data['offline_registered_device_sync_handlers']['pull_change_repository_route_deferred'] ?? null ), 'Offline pull change repository route connection should remain deferred.' );
$assert( true === ( $data['offline_registered_device_sync_handlers']['pull_change_set_provider_route_deferred'] ?? null ), 'Offline pull change-set provider route connection should remain deferred.' );
$assert( true === ( $data['offline_registered_device_sync_handlers']['push_handler_configured'] ?? null ), 'Offline push handler should be configured.' );
$assert( true === ( $data['offline_registered_device_sync_handlers']['push_persistence_planner_ready'] ?? null ), 'Offline push persistence planner should be staged ready.' );
$assert( true === ( $data['offline_registered_device_sync_handlers']['push_persistence_sql_ready'] ?? null ), 'Offline push persistence SQL planning should be staged ready.' );
$assert( true === ( $data['offline_registered_device_sync_handlers']['push_persistence_sql_template_ready'] ?? null ), 'Offline push persistence SQL templates should be staged ready.' );
$assert( true === ( $data['offline_registered_device_sync_handlers']['push_persistence_repository_ready'] ?? null ), 'Offline push persistence repository should be staged ready.' );
$assert( true === ( $data['offline_registered_device_sync_handlers']['push_snapshot_query_planner_ready'] ?? null ), 'Offline push snapshot query planner should be staged ready.' );
$assert( true === ( $data['offline_registered_device_sync_handlers']['push_snapshot_query_sql_ready'] ?? null ), 'Offline push snapshot query SQL planning should be staged ready.' );
$assert( true === ( $data['offline_registered_device_sync_handlers']['push_snapshot_query_sql_template_ready'] ?? null ), 'Offline push snapshot query SQL templates should be staged ready.' );
$assert( true === ( $data['offline_registered_device_sync_handlers']['push_snapshot_repository_ready'] ?? null ), 'Offline push snapshot repository should be staged ready.' );
$assert( true === ( $data['offline_registered_device_sync_handlers']['push_snapshot_route_provider_ready'] ?? null ), 'Offline push snapshot route provider should be staged ready.' );
$assert( true === ( $data['offline_registered_device_sync_handlers']['push_snapshot_route_provider_deferred'] ?? null ), 'Offline push snapshot route provider should remain deferred.' );
$assert( true === ( $data['offline_registered_device_sync_handlers']['push_snapshot_repo_execution_deferred'] ?? null ), 'Offline push snapshot repository execution should remain deferred.' );
$assert( true === ( $data['offline_registered_device_sync_handlers']['push_snapshot_query_execution_deferred'] ?? null ), 'Offline push snapshot query execution should remain deferred.' );
$assert( true === ( $data['offline_registered_device_sync_handlers']['push_snapshot_repository_deferred'] ?? null ), 'Offline push snapshot repository should remain deferred.' );
$assert( true === ( $data['offline_registered_device_sync_handlers']['push_snapshot_route_reads_deferred'] ?? null ), 'Offline push snapshot route reads should remain deferred.' );
$assert( true === ( $data['offline_registered_device_sync_handlers']['push_route_handler_ready'] ?? null ), 'Offline push route handler should be staged ready.' );
$assert( true === ( $data['offline_registered_device_sync_handlers']['push_route_persistence_provider_ready'] ?? null ), 'Offline push route persistence provider should be staged ready.' );
$assert( true === ( $data['offline_registered_device_sync_handlers']['push_handler_dependency_factory_ready'] ?? null ), 'Offline push handler dependency factory should be staged ready.' );
$assert( false === ( $data['offline_registered_device_sync_handlers']['push_handler_route_dependencies_ready'] ?? null ), 'Offline push handler route dependencies should remain deferred by default.' );
$assert( false === ( $data['offline_registered_device_sync_handlers']['push_handler_route_execution_enabled'] ?? null ), 'Offline push handler route execution should remain disabled by default.' );
$assert( true === ( $data['offline_registered_device_sync_handlers']['push_handler_route_queue_writes_deferred'] ?? null ), 'Offline push handler route queue writes should remain deferred.' );
$assert( true === ( $data['offline_registered_device_sync_handlers']['push_handler_conflict_writes_deferred'] ?? null ), 'Offline push handler route conflict writes should remain deferred.' );
$assert( true === ( $data['offline_registered_device_sync_handlers']['push_persistence_route_deferred'] ?? null ), 'Offline push persistence route execution should remain deferred.' );
$assert( true === ( $data['offline_registered_device_sync_handlers']['push_queue_persistence_deferred'] ?? null ), 'Offline push queue persistence should remain deferred.' );
$assert( true === ( $data['offline_registered_device_sync_handlers']['push_conflict_persistence_deferred'] ?? null ), 'Offline push conflict persistence should remain deferred.' );
$assert( true === ( $data['offline_registered_device_sync_handlers']['push_queue_replay_deferred'] ?? null ), 'Offline push queue replay should remain deferred.' );
$assert( true === ( $data['offline_registered_device_sync_handlers']['push_canonical_mutations_deferred'] ?? null ), 'Offline push canonical mutations should remain deferred.' );
$assert( false === ( $data['offline_registered_device_sync_handlers']['route_connected_writes_ready'] ?? null ), 'Offline sync handlers should keep writes deferred.' );
$assert( 'blocked' === ( $data['offline_device_pairing_route_readiness']['status'] ?? null ), 'Offline pairing readiness should remain blocked.' );
$assert( 'POST /offline/devices/register' === ( $data['offline_device_pairing_route_readiness']['route_key'] ?? null ), 'Offline pairing readiness should report the pairing route.' );
$assert( false === ( $data['offline_device_pairing_route_readiness']['handler_injected'] ?? null ), 'Offline pairing readiness should not report a default handler.' );
$assert( false === ( $data['offline_device_pairing_route_readiness']['permission_callback_ready'] ?? null ), 'Offline pairing readiness permission should remain locked.' );
$assert( true === ( $data['offline_device_pairing_route_readiness']['registration_deferred'] ?? null ), 'Offline pairing route registration should remain deferred.' );

echo "PASS WordPress integration smoke test\n";
