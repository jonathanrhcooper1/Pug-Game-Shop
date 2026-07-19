<?php
/**
 * WordPress integration smoke verification.
 *
 * Intended to run through WP-CLI after the plugin is activated in a real
 * WordPress install.
 *
 * @package TCGStorePlatform
 */

use TCGStorePlatform\Api\V1\InventoryRouteBootstrapper;
use TCGStorePlatform\Api\V1\OfflineRouteBootstrapper;
use TCGStorePlatform\Api\V1\PosPaymentRouteBootstrapper;
use TCGStorePlatform\Auth\RoleManager;
use TCGStorePlatform\Migrations\BuylistSchema;
use TCGStorePlatform\Migrations\CustomerCreditSchema;
use TCGStorePlatform\Migrations\EventsSchema;
use TCGStorePlatform\Migrations\FoundationSchema;
use TCGStorePlatform\Migrations\InventoryPricingSchema;
use TCGStorePlatform\Migrations\MigrationRunner;
use TCGStorePlatform\Migrations\OfflineSyncSchema;
use TCGStorePlatform\Migrations\PosPaymentSchema;
use TCGStorePlatform\Migrations\ProviderPriceObservationSchema;
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
$assert( '0.203.1' === Version::PLUGIN, 'Unexpected plugin version.' );
$assert( Version::DATABASE >= 14, 'Unexpected database target version.' );
$assert( Version::DATABASE === (int) get_option( MigrationRunner::VERSION_OPTION, 0 ), 'Database version option was not updated.' );
$assert( 3 === (int) get_option( RoleManager::VERSION_OPTION, 0 ), 'Role version option was not updated.' );

$tables = array_merge(
	FoundationSchema::tables( $wpdb->prefix, $wpdb->get_charset_collate() ),
	InventoryPricingSchema::tables( $wpdb->prefix, $wpdb->get_charset_collate() ),
	EventsSchema::tables( $wpdb->prefix, $wpdb->get_charset_collate() ),
	CustomerCreditSchema::tables( $wpdb->prefix, $wpdb->get_charset_collate() ),
	BuylistSchema::tables( $wpdb->prefix, $wpdb->get_charset_collate() ),
	SyncSchema::tables( $wpdb->prefix, $wpdb->get_charset_collate() ),
	ReservationSchema::tables( $wpdb->prefix, $wpdb->get_charset_collate() ),
	OfflineSyncSchema::tables( $wpdb->prefix, $wpdb->get_charset_collate() ),
	PosPaymentSchema::tables( $wpdb->prefix, $wpdb->get_charset_collate() ),
	ProviderPriceObservationSchema::tables( $wpdb->prefix, $wpdb->get_charset_collate() )
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
$assert( $manager->has_cap( 'manage_pos' ), 'Manager role cannot manage POS/payment staging.' );
$assert( $staff->has_cap( 'view_inventory' ), 'Staff role cannot view inventory.' );
$assert( ! $staff->has_cap( 'override_minimum_price' ), 'Staff role can override minimum price.' );
$assert( ! $staff->has_cap( 'manage_pos' ), 'Staff role can manage POS/payment staging.' );
$assert(
	$has_hook_callback( 'rest_api_init', OfflineRouteBootstrapper::class, 'bootstrap_current_routes', 20 ),
	'Offline route bootstrapper was not registered on rest_api_init.'
);
$assert(
	$has_hook_callback( 'rest_api_init', PosPaymentRouteBootstrapper::class, 'bootstrap_current_routes', 21 ),
	'POS/payment route bootstrapper was not registered on rest_api_init.'
);
$assert(
	$has_hook_callback( 'rest_api_init', InventoryRouteBootstrapper::class, 'bootstrap_current_routes', 22 ),
	'Inventory route bootstrapper was not registered on rest_api_init.'
);

wp_set_current_user( 1 );
do_action( 'rest_api_init' );

$routes = rest_get_server()->get_routes();
$assert( isset( $routes['/tcg-store/v1/health'] ), 'Health REST route was not registered.' );
$assert( isset( $routes['/tcg-store/v1/events'] ), 'Events REST list route was not registered.' );
$assert( isset( $routes['/tcg-store/v1/events/(?P<slug>[a-zA-Z0-9_-]+)'] ), 'Events REST detail route was not registered.' );
$assert( isset( $routes['/tcg-store/v1/events/(?P<slug>[a-zA-Z0-9_-]+)/register'] ), 'Events REST registration route was not registered.' );
$assert( isset( $routes['/tcg-store/v1/events/(?P<slug>[a-zA-Z0-9_-]+)/check-ins'] ), 'Events REST check-in route was not registered.' );
$assert( ! isset( $routes['/tcg-store/v1/offline/pull'] ), 'Offline pull route should remain unregistered.' );
$assert( ! isset( $routes['/tcg-store/v1/offline/push'] ), 'Offline push route should remain unregistered.' );
$assert( ! isset( $routes['/tcg-store/v1/pos/events'] ), 'POS event route should remain unregistered.' );
$assert( ! isset( $routes['/tcg-store/v1/payments/fee-snapshots'] ), 'Payment fee snapshot route should remain unregistered.' );
$assert( ! isset( $routes['/tcg-store/v1/inventory/search'] ), 'Inventory search route should remain unregistered.' );
$assert( ! isset( $routes['/tcg-store/v1/inventory'] ), 'Inventory create route should remain unregistered.' );
$response = rest_do_request( '/tcg-store/v1/health' );
$assert( ! $response->is_error(), 'Health REST route returned an error.' );
$assert( 200 === $response->get_status(), 'Health REST route did not return HTTP 200.' );

$data = $response->get_data();
$assert( is_array( $data ), 'Health response is not an array.' );
$assert( Version::PLUGIN === ( $data['version'] ?? null ), 'Health response reported the wrong plugin version.' );
$assert( Version::DATABASE === (int) ( $data['database']['current'] ?? 0 ), 'Health response reported the wrong current schema.' );
$assert( Version::DATABASE === (int) ( $data['database']['target'] ?? 0 ), 'Health response reported the wrong target schema.' );
$assert( true === ( $data['features']['core']['enabled'] ?? null ), 'Core feature is not enabled.' );
$assert( false === ( $data['features']['inventory_pricing']['enabled'] ?? null ), 'Inventory feature flag should remain disabled.' );
$assert( is_array( $data['staging_safety'] ?? null ), 'Health response should expose staging safety status.' );
$assert( 'inactive' === ( $data['staging_safety']['status'] ?? null ), 'Default staging safety status should be inactive.' );
$assert( false === ( $data['staging_safety']['public_indexing_blocked'] ?? null ), 'Default integration smoke should not block indexing outside staging.' );
$assert( false === ( $data['staging_safety']['real_customer_emails_disabled'] ?? null ), 'Default integration smoke should not suppress email outside staging.' );
$assert( true === ( $data['staging_safety']['payment_capture_deferred'] ?? null ), 'Health staging safety should keep payment capture deferred.' );
$assert( true === ( $data['staging_safety']['provider_inventory_deferred'] ?? null ), 'Health staging safety should keep provider inventory writes deferred.' );
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
$assert( true === ( $data['offline_connector_manifest']['profile_manifest_ready'] ?? null ), 'Offline connector manifest should be staged ready.' );
$assert( 5 === (int) ( $data['offline_connector_manifest']['offline_route_count'] ?? 0 ), 'Offline connector manifest should report every offline route.' );
$assert( false === ( $data['offline_connector_manifest']['credentials_synced_to_app'] ?? null ), 'Offline connector manifest should not sync credentials to the app.' );
$assert( 'offline_device_token' === ( $data['offline_connector_manifest']['wordpress']['auth_mode'] ?? null ), 'Offline connector manifest should require offline device-token auth.' );
$assert( 'desktop_secure_store' === ( $data['offline_connector_manifest']['wordpress']['credential_storage'] ?? null ), 'Offline connector manifest should keep device credentials in desktop secure storage.' );
$assert( 'official_woocommerce_square_extension' === ( $data['offline_connector_manifest']['square']['payment_authority'] ?? null ), 'Offline connector manifest should delegate Square payments to the official extension.' );
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
$assert( true === ( $data['offline_registered_device_sync_handlers']['push_canonical_mutation_planner_ready'] ?? null ), 'Offline push canonical mutation planner should be staged ready.' );
$assert( true === ( $data['offline_registered_device_sync_handlers']['push_canonical_mutation_sql_ready'] ?? null ), 'Offline push canonical mutation SQL planning should be staged ready.' );
$assert( true === ( $data['offline_registered_device_sync_handlers']['push_canonical_mutation_sql_template_ready'] ?? null ), 'Offline push canonical mutation SQL templates should be staged ready.' );
$assert( true === ( $data['offline_registered_device_sync_handlers']['push_canonical_mutation_repository_ready'] ?? null ), 'Offline push canonical mutation repository should be staged ready.' );
$assert( true === ( $data['offline_registered_device_sync_handlers']['push_canonical_mutation_repository_execution_gate_ready'] ?? null ), 'Offline push canonical mutation repository execution gate should be staged ready.' );
$assert( true === ( $data['offline_registered_device_sync_handlers']['push_canonical_mutation_transaction_preflight_ready'] ?? null ), 'Offline push canonical mutation transaction preflight should be staged ready.' );
$assert( true === ( $data['offline_registered_device_sync_handlers']['push_canonical_mutation_planning_deferred'] ?? null ), 'Offline push canonical mutation planning should remain deferred.' );
$assert( true === ( $data['offline_registered_device_sync_handlers']['push_canonical_mutation_sql_execution_deferred'] ?? null ), 'Offline push canonical mutation SQL execution should remain deferred.' );
$assert( true === ( $data['offline_registered_device_sync_handlers']['push_canonical_mutation_repository_execution_gate_deferred'] ?? null ), 'Offline push canonical mutation repository execution gate should remain deferred.' );
$assert( true === ( $data['offline_registered_device_sync_handlers']['push_canonical_mutation_repository_transaction_deferred'] ?? null ), 'Offline push canonical mutation repository transaction adapter should remain deferred.' );
$assert( true === ( $data['offline_registered_device_sync_handlers']['push_canonical_mutation_transaction_preflight_deferred'] ?? null ), 'Offline push canonical mutation transaction preflight should remain deferred.' );
$assert( true === ( $data['offline_registered_device_sync_handlers']['push_canonical_mutation_transaction_execution_deferred'] ?? null ), 'Offline push canonical mutation transaction execution should remain deferred.' );
$assert( true === ( $data['offline_registered_device_sync_handlers']['push_canonical_mutation_repository_deferred'] ?? null ), 'Offline push canonical mutation repository should remain deferred.' );
$assert( true === ( $data['offline_registered_device_sync_handlers']['push_snapshot_query_planner_ready'] ?? null ), 'Offline push snapshot query planner should be staged ready.' );
$assert( true === ( $data['offline_registered_device_sync_handlers']['push_snapshot_query_sql_ready'] ?? null ), 'Offline push snapshot query SQL planning should be staged ready.' );
$assert( true === ( $data['offline_registered_device_sync_handlers']['push_snapshot_query_sql_template_ready'] ?? null ), 'Offline push snapshot query SQL templates should be staged ready.' );
$assert( true === ( $data['offline_registered_device_sync_handlers']['push_snapshot_repository_ready'] ?? null ), 'Offline push snapshot repository should be staged ready.' );
$assert( true === ( $data['offline_registered_device_sync_handlers']['push_snapshot_route_provider_ready'] ?? null ), 'Offline push snapshot route provider should be staged ready.' );
$assert( true === ( $data['offline_registered_device_sync_handlers']['push_snapshot_route_provider_deferred'] ?? null ), 'Offline push snapshot route provider should remain deferred.' );
$assert( true === ( $data['offline_registered_device_sync_handlers']['push_operation_options_provider_ready'] ?? null ), 'Offline push operation-options provider should be staged ready.' );
$assert( true === ( $data['offline_registered_device_sync_handlers']['push_operation_options_provider_deferred'] ?? null ), 'Offline push operation-options provider should remain deferred.' );
$assert( true === ( $data['offline_registered_device_sync_handlers']['push_existing_operation_rows_query_ready'] ?? null ), 'Offline push existing operation row query planner should be staged ready.' );
$assert( true === ( $data['offline_registered_device_sync_handlers']['push_existing_operation_rows_query_sql_ready'] ?? null ), 'Offline push existing operation row SQL planning should be staged ready.' );
$assert( true === ( $data['offline_registered_device_sync_handlers']['push_existing_operation_rows_query_sql_template_ready'] ?? null ), 'Offline push existing operation row SQL template should be staged ready.' );
$assert( true === ( $data['offline_registered_device_sync_handlers']['push_existing_operation_rows_repository_ready'] ?? null ), 'Offline push existing operation row repository should be staged ready.' );
$assert( true === ( $data['offline_registered_device_sync_handlers']['push_existing_operation_rows_route_provider_ready'] ?? null ), 'Offline push existing operation row route provider should be staged ready.' );
$assert( true === ( $data['offline_registered_device_sync_handlers']['push_existing_operation_rows_route_provider_deferred'] ?? null ), 'Offline push existing operation row route provider should remain deferred.' );
$assert( true === ( $data['offline_registered_device_sync_handlers']['push_existing_operation_rows_query_execution_deferred'] ?? null ), 'Offline push existing operation row query execution should remain deferred.' );
$assert( true === ( $data['offline_registered_device_sync_handlers']['push_existing_operation_rows_repository_deferred'] ?? null ), 'Offline push existing operation row repository should remain deferred.' );
$assert( true === ( $data['offline_registered_device_sync_handlers']['push_existing_operation_rows_route_reads_deferred'] ?? null ), 'Offline push existing operation row route reads should remain deferred.' );
$assert( true === ( $data['offline_registered_device_sync_handlers']['push_snapshot_repo_execution_deferred'] ?? null ), 'Offline push snapshot repository execution should remain deferred.' );
$assert( true === ( $data['offline_registered_device_sync_handlers']['push_snapshot_query_execution_deferred'] ?? null ), 'Offline push snapshot query execution should remain deferred.' );
$assert( true === ( $data['offline_registered_device_sync_handlers']['push_snapshot_repository_deferred'] ?? null ), 'Offline push snapshot repository should remain deferred.' );
$assert( true === ( $data['offline_registered_device_sync_handlers']['push_snapshot_route_reads_deferred'] ?? null ), 'Offline push snapshot route reads should remain deferred.' );
$assert( true === ( $data['offline_registered_device_sync_handlers']['push_route_handler_ready'] ?? null ), 'Offline push route handler should be staged ready.' );
$assert( true === ( $data['offline_registered_device_sync_handlers']['push_route_persistence_provider_ready'] ?? null ), 'Offline push route persistence provider should be staged ready.' );
$assert( true === ( $data['offline_registered_device_sync_handlers']['push_handler_dependency_factory_ready'] ?? null ), 'Offline push handler dependency factory should be staged ready.' );
$assert( false === ( $data['offline_registered_device_sync_handlers']['push_handler_route_dependencies_ready'] ?? null ), 'Offline push handler route dependencies should remain deferred by default.' );
$assert( false === ( $data['offline_registered_device_sync_handlers']['push_handler_route_execution_enabled'] ?? null ), 'Offline push handler route execution should remain disabled by default.' );
$assert( false === ( $data['offline_registered_device_sync_handlers']['push_handler_existing_operation_rows_ready'] ?? null ), 'Offline push handler existing row route reads should remain unconfigured by default.' );
$assert( true === ( $data['offline_registered_device_sync_handlers']['push_handler_existing_operation_rows_deferred'] ?? null ), 'Offline push handler existing row route reads should remain deferred.' );
$assert( true === ( $data['offline_registered_device_sync_handlers']['push_handler_canonical_mutation_planner_ready'] ?? null ), 'Offline push handler canonical mutation planner should be staged ready.' );
$assert( true === ( $data['offline_registered_device_sync_handlers']['push_handler_canonical_mutation_planning_deferred'] ?? null ), 'Offline push handler canonical mutation planning should remain deferred by default.' );
$assert( false === ( $data['offline_registered_device_sync_handlers']['push_handler_canonical_mutation_sql_ready'] ?? null ), 'Offline push handler canonical mutation SQL planning should remain unconfigured by default.' );
$assert( true === ( $data['offline_registered_device_sync_handlers']['push_handler_canonical_mutation_sql_planning_deferred'] ?? null ), 'Offline push handler canonical mutation SQL planning should remain deferred by default.' );
$assert( true === ( $data['offline_registered_device_sync_handlers']['push_handler_canonical_mutation_sql_execution_deferred'] ?? null ), 'Offline push handler canonical mutation SQL execution should remain deferred.' );
$assert( true === ( $data['offline_registered_device_sync_handlers']['push_handler_canonical_repository_ready'] ?? null ), 'Offline push handler canonical repository should be staged ready.' );
$assert( true === ( $data['offline_registered_device_sync_handlers']['push_handler_canonical_repository_staging_deferred'] ?? null ), 'Offline push handler canonical repository staging should remain deferred by default.' );
$assert( true === ( $data['offline_registered_device_sync_handlers']['push_handler_canonical_repository_execution_deferred'] ?? null ), 'Offline push handler canonical repository execution should remain deferred.' );
$assert( true === ( $data['offline_registered_device_sync_handlers']['push_handler_canonical_repository_execution_gate_deferred'] ?? null ), 'Offline push handler canonical repository execution gate should remain deferred.' );
$assert( true === ( $data['offline_registered_device_sync_handlers']['push_handler_canonical_repository_transaction_deferred'] ?? null ), 'Offline push handler canonical repository transaction adapter should remain deferred.' );
$assert( true === ( $data['offline_registered_device_sync_handlers']['push_handler_canonical_transaction_preflight_deferred'] ?? null ), 'Offline push handler canonical transaction preflight should remain deferred.' );
$assert( true === ( $data['offline_registered_device_sync_handlers']['push_handler_canonical_transaction_execution_deferred'] ?? null ), 'Offline push handler canonical transaction execution should remain deferred.' );
$assert( true === ( $data['offline_registered_device_sync_handlers']['push_handler_canonical_repository_deferred'] ?? null ), 'Offline push handler canonical mutation repository should remain deferred.' );
$assert( true === ( $data['offline_registered_device_sync_handlers']['push_handler_canonical_writes_deferred'] ?? null ), 'Offline push handler canonical writes should remain deferred.' );
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
$assert( 'offline_device_pairing_request' === ( $data['offline_device_pairing_route_readiness']['app_pairing_contract']['action'] ?? null ), 'Offline pairing app contract should report the pairing request action.' );
$assert( '/wp-json/tcg-store/v1/offline/devices/register' === ( $data['offline_device_pairing_route_readiness']['app_pairing_contract']['rest_path'] ?? null ), 'Offline pairing app contract should report the device register route.' );
$assert( 'desktop_secure_store' === ( $data['offline_device_pairing_route_readiness']['app_pairing_contract']['device_token_storage'] ?? null ), 'Offline pairing app contract should require desktop secure token storage.' );
$assert( false === ( $data['offline_device_pairing_route_readiness']['app_pairing_contract']['credential_values_synced_to_app'] ?? null ), 'Offline pairing app contract should not sync credential values to the app.' );
$assert( false === ( $data['offline_device_pairing_route_readiness']['handler_injected'] ?? null ), 'Offline pairing readiness should not report a default handler.' );
$assert( false === ( $data['offline_device_pairing_route_readiness']['permission_callback_ready'] ?? null ), 'Offline pairing readiness permission should remain locked.' );
$assert( true === ( $data['offline_device_pairing_route_readiness']['registration_deferred'] ?? null ), 'Offline pairing route registration should remain deferred.' );
$assert( 'blocked' === ( $data['pos_payment_route_readiness']['status'] ?? null ), 'POS/payment route readiness should remain blocked.' );
$assert( false === ( $data['pos_payment_route_readiness']['feature_enabled'] ?? null ), 'POS/payment feature should remain disabled.' );
$assert( 8 === (int) ( $data['pos_payment_route_readiness']['planned_route_count'] ?? 0 ), 'POS/payment readiness should report planned routes.' );
$assert( 0 === (int) ( $data['pos_payment_route_readiness']['registerable_route_count'] ?? -1 ), 'POS/payment readiness should report zero registerable routes.' );
$assert( true === ( $data['pos_payment_route_readiness']['registration_deferred'] ?? null ), 'POS/payment route registration should remain deferred.' );
$assert( true === ( $data['pos_payment_route_readiness']['route_connected_reads_deferred'] ?? null ), 'POS/payment route reads should remain deferred.' );
$assert( false === ( $data['pos_payment_route_readiness']['route_handlers_configured'] ?? null ), 'POS/payment route handlers should remain unconfigured by default.' );
$assert( false === ( $data['pos_payment_route_readiness']['permission_callbacks_configured'] ?? null ), 'POS/payment permission callbacks should remain unconfigured by default.' );
$assert( true === ( $data['pos_payment_route_readiness']['provider_capture_deferred'] ?? null ), 'POS/payment provider capture should remain deferred.' );
$pos_payment_routes = $data['pos_payment_route_readiness']['route_registration_summary'] ?? array();
$assert( is_array( $pos_payment_routes ), 'POS/payment route summary should be present.' );
$assert( false === ( $pos_payment_routes['POST /pos/events']['should_register'] ?? null ), 'POS event ingestion route should remain unregistered.' );
$assert( true === ( $pos_payment_routes['POST /pos/events']['route_connected_writes_deferred'] ?? null ), 'POS event ingestion writes should remain deferred.' );
$assert( false === ( $pos_payment_routes['POST /payments/webhooks/(?P<provider>[a-zA-Z0-9_-]+)']['should_register'] ?? null ), 'Payment webhook route should remain unregistered.' );
$assert( false === ( $pos_payment_routes['POST /payments/webhooks/(?P<provider>[a-zA-Z0-9_-]+)']['webhook_verifier_ready'] ?? null ), 'Payment webhook verifier should remain unconfigured.' );
$assert( true === ( $pos_payment_routes['GET /payments/fee-snapshots']['route_connected_reads_deferred'] ?? null ), 'Payment fee snapshot route reads should remain deferred.' );
$assert( false === ( $pos_payment_routes['GET /payments/fee-snapshots']['should_register'] ?? null ), 'Payment fee snapshot route should remain unregistered.' );
$assert( 'blocked' === ( $data['pos_payment_route_bootstrap']['status'] ?? null ), 'POS/payment route bootstrap should remain blocked.' );
$assert( false === ( $data['pos_payment_route_bootstrap']['feature_enabled'] ?? null ), 'POS/payment route bootstrap feature should remain disabled.' );
$assert( 8 === (int) ( $data['pos_payment_route_bootstrap']['planned_route_count'] ?? 0 ), 'POS/payment route bootstrap should report planned routes.' );
$assert( 0 === (int) ( $data['pos_payment_route_bootstrap']['registerable_route_count'] ?? -1 ), 'POS/payment route bootstrap should report zero registerable routes.' );
$assert( false === ( $data['pos_payment_route_bootstrap']['should_register_routes'] ?? null ), 'POS/payment route bootstrap should not register routes.' );
$assert( true === ( $data['pos_payment_route_bootstrap']['registration_deferred'] ?? null ), 'POS/payment route bootstrap should remain deferred.' );
$assert( 'blocked' === ( $data['pos_payment_route_dependencies']['status'] ?? null ), 'POS/payment route dependencies should remain blocked.' );
$assert( false === ( $data['pos_payment_route_dependencies']['configured'] ?? null ), 'POS/payment route dependencies should not be fully configured by default.' );
$assert( 8 === (int) ( $data['pos_payment_route_dependencies']['route_contract_count'] ?? 0 ), 'POS/payment route dependencies should report planned route contracts.' );
$assert( 8 === (int) ( $data['pos_payment_route_dependencies']['controller_handler_count'] ?? -1 ), 'POS/payment parser-only handlers should be staged by default.' );
$assert( true === ( $data['pos_payment_route_dependencies']['controller_handlers_configured'] ?? null ), 'POS/payment parser-only handlers should be configured by default.' );
$assert( true === ( $data['pos_payment_route_dependencies']['capability_permission_callbacks_configured'] ?? null ), 'POS/payment capability callbacks should be available inside WordPress.' );
$assert( false === ( $data['pos_payment_route_dependencies']['webhook_signature_verifier_configured'] ?? null ), 'POS/payment webhook verifier should remain unconfigured by default.' );
$assert( true === ( $data['pos_payment_route_dependencies']['registrar_ready'] ?? null ), 'POS/payment registrar dependency should be staged ready.' );
$assert( true === ( $data['pos_payment_route_dependencies']['bootstrapper_ready'] ?? null ), 'POS/payment bootstrapper dependency should be staged ready.' );
$assert( 0 === (int) ( $data['pos_payment_route_dependencies']['registerable_route_count'] ?? -1 ), 'POS/payment dependencies should not report registerable routes by default.' );
$assert( true === ( $data['pos_payment_route_dependencies']['route_registration_deferred'] ?? null ), 'POS/payment dependency route registration should remain deferred.' );
$assert( true === ( $data['pos_payment_route_dependencies']['route_connected_reads_deferred'] ?? null ), 'POS/payment dependency route reads should remain deferred.' );
$assert( false === ( $data['pos_payment_route_dependencies']['route_connected_reads_ready'] ?? null ), 'POS/payment dependency route reads should not be ready by default.' );
$assert( true === ( $data['pos_payment_route_dependencies']['route_connected_writes_deferred'] ?? null ), 'POS/payment dependency route writes should remain deferred.' );
$assert( 'blocked' === ( $data['woocommerce_square_extension']['status'] ?? null ), 'WooCommerce Square extension should report blocked when the official extension is not active.' );
$assert( false === ( $data['woocommerce_square_extension']['extension_active'] ?? null ), 'WooCommerce Square extension should report inactive by default.' );
$assert( true === ( $data['woocommerce_square_extension']['square_network_writes_deferred'] ?? null ), 'WooCommerce Square extension status should not enable Square network writes.' );
$assert( 'ready' === ( $data['square_inventory_batch_sync']['status'] ?? null ), 'Square inventory batch sync should report ready sandbox planning.' );
$assert( true === ( $data['square_inventory_batch_sync']['batch_sync_planning_ready'] ?? null ), 'Square inventory batch sync readiness should report staged planning ready.' );
$assert( 2 === (int) ( $data['square_inventory_batch_sync']['ready_count'] ?? 0 ), 'Square inventory batch sync should report two ready probe rows.' );
$assert( 4 === (int) ( $data['square_inventory_batch_sync']['operation_count'] ?? 0 ), 'Square inventory batch sync should report catalog and inventory operation plans.' );
$assert( true === ( $data['square_inventory_batch_sync']['network_request_deferred'] ?? null ), 'Square inventory batch sync should defer Square network writes.' );
$assert( true === ( $data['square_inventory_batch_sync']['payment_capture_deferred'] ?? null ), 'Square inventory batch sync should defer payment capture.' );
$assert( 'blocked' === ( $data['inventory_route_bootstrap']['status'] ?? null ), 'Inventory route bootstrap should remain blocked.' );
$assert( false === ( $data['inventory_route_bootstrap']['feature_enabled'] ?? null ), 'Inventory route bootstrap feature should remain disabled.' );
$assert( 16 === (int) ( $data['inventory_route_bootstrap']['planned_route_count'] ?? 0 ), 'Inventory route bootstrap should report planned routes.' );
$assert( 0 === (int) ( $data['inventory_route_bootstrap']['registerable_route_count'] ?? -1 ), 'Inventory route bootstrap should report zero registerable routes.' );
$assert( false === ( $data['inventory_route_bootstrap']['should_register_routes'] ?? null ), 'Inventory route bootstrap should not register routes.' );
$assert( true === ( $data['inventory_route_bootstrap']['registration_deferred'] ?? null ), 'Inventory route bootstrap should remain deferred.' );
$inventory_routes = $data['inventory_route_bootstrap']['route_registration_summary'] ?? array();
$assert( is_array( $inventory_routes ), 'Inventory route summary should be present.' );
$assert( false === ( $inventory_routes['GET /inventory/search']['should_register'] ?? null ), 'Inventory search route should remain unregistered.' );
$assert( true === ( $inventory_routes['GET /inventory/search']['route_connected_reads_deferred'] ?? null ), 'Inventory search route reads should remain deferred.' );
$assert( false === ( $inventory_routes['POST /inventory']['should_register'] ?? null ), 'Inventory create route should remain unregistered.' );
$assert( true === ( $inventory_routes['POST /inventory']['route_connected_writes_deferred'] ?? null ), 'Inventory create route writes should remain deferred.' );
$assert( 'blocked' === ( $data['inventory_route_dependencies']['status'] ?? null ), 'Inventory route dependencies should remain blocked.' );
$assert( false === ( $data['inventory_route_dependencies']['configured'] ?? null ), 'Inventory route dependencies should not be fully configured by default.' );
$assert( 16 === (int) ( $data['inventory_route_dependencies']['route_contract_count'] ?? 0 ), 'Inventory route dependencies should report planned route contracts.' );
$assert( 4 === (int) ( $data['inventory_route_dependencies']['staged_handler_route_count'] ?? 0 ), 'Inventory route dependencies should report every staged inventory handler.' );
$assert( 0 === (int) ( $data['inventory_route_dependencies']['controller_handler_count'] ?? -1 ), 'Inventory route handlers should remain uninjected by default.' );
$assert( false === ( $data['inventory_route_dependencies']['controller_handlers_configured'] ?? null ), 'Inventory route handlers should not be configured by default.' );
$assert( 9 === (int) ( $data['inventory_route_dependencies']['permission_callback_count'] ?? 0 ), 'Inventory route dependencies should expose every protected capability callback inside WordPress.' );
$assert( true === ( $data['inventory_route_dependencies']['capability_permission_callbacks_configured'] ?? null ), 'Inventory capability callbacks should use the WordPress capability checker.' );
$assert( false === ( $data['inventory_route_dependencies']['public_read_routes_enabled'] ?? null ), 'Inventory public reads should remain disabled by default.' );
$assert( true === ( $data['inventory_route_dependencies']['registrar_ready'] ?? null ), 'Inventory registrar dependency should be staged ready.' );
$assert( 0 === (int) ( $data['inventory_route_dependencies']['registerable_route_count'] ?? -1 ), 'Inventory dependencies should not report registerable routes by default.' );
$assert( true === ( $data['inventory_route_dependencies']['route_registration_deferred'] ?? null ), 'Inventory dependency route registration should remain deferred.' );
$assert( true === ( $data['inventory_route_dependencies']['route_connected_reads_deferred'] ?? null ), 'Inventory dependency route reads should remain deferred.' );
$assert( false === ( $data['inventory_route_dependencies']['route_connected_reads_ready'] ?? null ), 'Inventory dependency route reads should not be ready by default.' );
$assert( true === ( $data['inventory_route_dependencies']['route_connected_writes_deferred'] ?? null ), 'Inventory dependency route writes should remain deferred.' );
echo "PASS WordPress integration smoke test\n";
