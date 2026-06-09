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

$route_has_method = static function ( array $routes, string $path, string $method ): bool {
	$method = strtoupper( $method );

	if ( ! isset( $routes[ $path ] ) || ! is_array( $routes[ $path ] ) ) {
		return false;
	}

	foreach ( $routes[ $path ] as $endpoint ) {
		if ( ! is_array( $endpoint ) ) {
			continue;
		}

		$methods = $endpoint['methods'] ?? array();

		if ( is_string( $methods ) && strtoupper( $methods ) === $method ) {
			return true;
		}

		if ( is_array( $methods ) && true === ( $methods[ $method ] ?? false ) ) {
			return true;
		}
	}

	return false;
};

$assert(
	function_exists( 'wp_get_environment_type' ) && 'staging' === wp_get_environment_type(),
	'WP_ENVIRONMENT_TYPE must be staging for inventory staging smoke coverage.'
);
$assert( FeatureFlags::is_available( 'inventory_pricing' ), 'Inventory feature flag should be staging-available.' );
$assert( FeatureFlags::is_enabled( 'inventory_pricing' ), 'Inventory feature flag should be enabled for staging smoke.' );

$runtime = InventoryRouteRuntimeSettings::from_settings( Settings::all() );
$assert( true === ( $runtime['staff_search_route_enabled'] ?? null ), 'Staff inventory search gate should be enabled.' );
$assert( true === ( $runtime['staff_create_route_enabled'] ?? null ), 'Staff inventory create gate should be enabled.' );
$assert( false === ( $runtime['public_search_route_enabled'] ?? null ), 'Public inventory search gate should remain disabled.' );

global $wpdb;

$now                 = '2026-06-07 12:00:00.000000';
$locations_table     = $wpdb->prefix . 'tcg_inventory_locations';
$inventory_table     = $wpdb->prefix . 'tcg_inventory_items';
$price_log_table     = $wpdb->prefix . 'tcg_price_change_log';
$reference_table     = $wpdb->prefix . 'tcg_reference_cards';
$variants_table      = $wpdb->prefix . 'tcg_reference_variants';
$observations_table  = $wpdb->prefix . 'tcg_provider_price_observations';
$location_public_id  = '00000000-0000-4000-8000-000000000101';
$inventory_public_id = '00000000-0000-4000-8000-000000000201';
$reference_public_id = '00000000-0000-4000-8000-000000000301';
$reference_provider_id = 'scrydex-stage-charizard-004';
$seed_barcode        = 'PUG-STAGE-PKM-BASE-058';
$seed_sku            = 'PUG-STAGE-PKM-BASE-058';
$create_barcode      = 'PUG-STAGE-PKM-BULBA-001';
$create_sku          = 'PUG-STAGE-PKM-BULBA-001';

$wpdb->query(
	$wpdb->prepare(
		"DELETE FROM {$price_log_table} WHERE inventory_id IN (SELECT inventory_id FROM {$inventory_table} WHERE public_id = %s OR barcode IN (%s, %s) OR sku IN (%s, %s))", // phpcs:ignore WordPress.DB.PreparedSQL.InterpolatedNotPrepared
		$inventory_public_id,
		$seed_barcode,
		$create_barcode,
		$seed_sku,
		$create_sku
	)
);
$wpdb->query(
	$wpdb->prepare(
		"DELETE FROM {$inventory_table} WHERE public_id = %s OR barcode IN (%s, %s) OR sku IN (%s, %s)", // phpcs:ignore WordPress.DB.PreparedSQL.InterpolatedNotPrepared
		$inventory_public_id,
		$seed_barcode,
		$create_barcode,
		$seed_sku,
		$create_sku
	)
);
$wpdb->query(
	$wpdb->prepare(
		"DELETE FROM {$locations_table} WHERE public_id = %s OR code = %s", // phpcs:ignore WordPress.DB.PreparedSQL.InterpolatedNotPrepared
		$location_public_id,
		'SHOWCASE-A'
	)
);
$wpdb->query(
	$wpdb->prepare(
		"DELETE FROM {$observations_table} WHERE provider_name = %s AND provider_card_id = %s", // phpcs:ignore WordPress.DB.PreparedSQL.InterpolatedNotPrepared
		'scrydex',
		$reference_provider_id
	)
);
$wpdb->query(
	$wpdb->prepare(
		"DELETE FROM {$variants_table} WHERE reference_card_id IN (SELECT reference_card_id FROM {$reference_table} WHERE public_id = %s OR provider_card_id = %s)", // phpcs:ignore WordPress.DB.PreparedSQL.InterpolatedNotPrepared
		$reference_public_id,
		$reference_provider_id
	)
);
$wpdb->query(
	$wpdb->prepare(
		"DELETE FROM {$reference_table} WHERE public_id = %s OR provider_card_id = %s", // phpcs:ignore WordPress.DB.PreparedSQL.InterpolatedNotPrepared
		$reference_public_id,
		$reference_provider_id
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

$reference_inserted = $wpdb->insert(
	$reference_table,
	array(
		'public_id'           => $reference_public_id,
		'provider_name'       => 'scrydex',
		'provider_card_id'    => $reference_provider_id,
		'game'                => 'pokemon',
		'name'                => 'Charizard',
		'normalized_name'     => 'charizard',
		'set_name'            => 'Base Set',
		'set_code'            => 'BASE',
		'card_number'         => '4',
		'printed_number'      => '4/102',
		'year'                => 1999,
		'rarity'              => 'Rare Holo',
		'rarity_code'         => 'RH',
		'language'            => 'English',
		'language_code'       => 'EN',
		'release_date'        => '1999-01-09',
		'front_image_url'     => 'https://images.pokemontcg.io/base1/4_hires.png',
		'back_image_url'      => 'https://images.pokemontcg.io/cardback.png',
		'search_text'         => 'Charizard Base Set 4/102 holo unlimited shadowless pokemon',
		'provider_updated_at' => $now,
		'created_at'          => $now,
		'updated_at'          => $now,
		'row_version'         => 1,
	)
);
$assert( false !== $reference_inserted, 'Staging smoke reference card seed insert failed.' );

$reference_id = (int) $wpdb->insert_id;
$assert( $reference_id > 0, 'Staging smoke reference card seed did not produce an ID.' );

$variant_rows = array(
	array(
		'provider_variant_id'        => 'scrydex-stage-charizard-004-holo-unlimited',
		'variant'                    => 'Unlimited',
		'finish'                     => 'Holofoil',
		'parallel_name'              => '',
		'edition'                    => 'Base Set',
		'language'                   => 'English',
		'raw_or_graded_support'      => 'both',
		'normalized_attributes_json' => '{"condition_support":["NM","LP","MP","HP","DMG"],"finish":"holofoil"}',
	),
	array(
		'provider_variant_id'        => 'scrydex-stage-charizard-004-shadowless',
		'variant'                    => 'Shadowless',
		'finish'                     => 'Holofoil',
		'parallel_name'              => 'Shadowless',
		'edition'                    => 'Base Set',
		'language'                   => 'English',
		'raw_or_graded_support'      => 'both',
		'normalized_attributes_json' => '{"condition_support":["NM","LP","MP","HP","DMG"],"finish":"holofoil","printing":"shadowless"}',
	),
);

foreach ( $variant_rows as $variant_row ) {
	$variant_inserted = $wpdb->insert(
		$variants_table,
		array_merge(
			array(
				'reference_card_id' => $reference_id,
				'created_at'        => $now,
				'updated_at'        => $now,
			),
			$variant_row
		)
	);
	$assert( false !== $variant_inserted, 'Staging smoke reference variant seed insert failed.' );
}

$observation_inserted = $wpdb->insert(
	$observations_table,
	array(
		'public_id'           => '00000000-0000-4000-8000-000000000401',
		'reference_card_id'   => $reference_id,
		'provider_name'       => 'scrydex',
		'provider_card_id'    => $reference_provider_id,
		'game'                => 'pokemon',
		'market_price'        => '250.0000',
		'currency'            => 'USD',
		'source_observed_at'  => $now,
		'provider_updated_at' => $now,
		'observed_at'         => $now,
		'sync_job_id'         => null,
		'created_at'          => $now,
	)
);
$assert( false !== $observation_inserted, 'Staging smoke price observation seed insert failed.' );

wp_set_current_user( 1 );
do_action( 'rest_api_init' );

$routes = rest_get_server()->get_routes();
$assert( isset( $routes['/tcg-store/v1/reference/search'] ), 'Reference card search route was not registered.' );
$assert( $route_has_method( $routes, '/tcg-store/v1/reference/search', 'GET' ), 'Reference card search route should allow GET on staging smoke.' );
$assert( isset( $routes['/tcg-store/v1/inventory/search'] ), 'Staging inventory search route was not registered.' );
$assert( isset( $routes['/tcg-store/v1/inventory'] ), 'Inventory create route path should be registered on staging smoke.' );
$assert( $route_has_method( $routes, '/tcg-store/v1/inventory', 'POST' ), 'Inventory create route should allow POST on staging smoke.' );
$assert( ! $route_has_method( $routes, '/tcg-store/v1/inventory', 'GET' ), 'Inventory list route should remain unregistered on staging smoke.' );
$assert( ! isset( $routes['/tcg-store/v1/pos/events'] ), 'POS event route should remain unregistered on staging smoke.' );

$create_request = new WP_REST_Request( 'POST', '/tcg-store/v1/inventory' );
$create_request->set_header( 'idempotency-key', 'staging-intake-smoke-001' );
$create_request->set_body_params(
	array(
		'source'                         => 'staff',
		'game'                           => 'pokemon',
		'card_name'                      => 'Bulbasaur',
		'set_name'                       => 'Base Set',
		'set_code'                       => 'BASE',
		'card_number'                    => '44',
		'printed_number'                 => '44/102',
		'status'                         => 'available',
		'raw_or_graded'                  => 'raw',
		'condition_code'                 => 'NM',
		'barcode'                        => $create_barcode,
		'sku'                            => $create_sku,
		'location_id'                    => $location_id,
		'actor_user_id'                  => 1,
		'sale_currency'                  => 'USD',
		'minimum_sale_price_minor_units' => 100,
		'sale_price_minor_units'         => 250,
		'online_visibility'              => 'visible',
		'kiosk_visibility'               => 'visible',
		'pos_visibility'                 => 'visible',
	)
);

$create_response = rest_do_request( $create_request );
$assert( ! $create_response->is_error(), 'Inventory create REST route returned an error.' );

$create_data = $create_response->get_data();
$assert( is_array( $create_data ), 'Inventory create response is not an array.' );
$assert( 'created' === ( $create_data['status'] ?? null ), 'Inventory create response did not report created status.' );
$assert( 201 === (int) ( $create_data['status_code'] ?? 0 ), 'Inventory create response did not report created status code.' );
$assert( 'inventory_item_created' === ( $create_data['code'] ?? null ), 'Inventory create response did not report created code.' );
$assert( 'PUG-STAGE-PKM-BULBA-001' === ( $create_data['data']['sku'] ?? null ), 'Inventory create response should expose created SKU.' );
$assert( true === ( $create_data['data']['price_change_log_persisted'] ?? null ), 'Inventory create should persist the initial price change log.' );
$assert( 1 === (int) ( $create_data['data']['price_change_log_row_count'] ?? 0 ), 'Inventory create should report one price change log row.' );
$assert( false === ( $create_data['meta']['route_connected_writes_deferred'] ?? null ), 'Inventory create writes should execute in staging smoke.' );
$assert( true === ( $create_data['meta']['woocommerce_projection_deferred'] ?? null ), 'Inventory create should keep WooCommerce projection deferred.' );
$assert( true === ( $create_data['meta']['square_inventory_projection_deferred'] ?? null ), 'Inventory create should keep Square projection deferred.' );
$assert( false === ( $create_data['meta']['external_projection_planning_deferred'] ?? null ), 'Inventory create should plan external projections without executing writes.' );
$assert( true === ( $create_data['meta']['label_print_deferred'] ?? null ), 'Inventory create should keep labels deferred.' );
$projections = $create_data['meta']['projections'] ?? null;
$assert( is_array( $projections ), 'Inventory create should expose projection contracts.' );
$assert( 'inventory_external_projection_plans' === ( $projections['action'] ?? null ), 'Inventory create should expose projection plan action.' );
$assert( true === ( $projections['network_request_deferred'] ?? null ), 'Inventory create projection plans should defer network calls.' );
$woo_projection = is_array( $projections['woocommerce_product_projection'] ?? null ) ? $projections['woocommerce_product_projection'] : array();
$assert( 'woocommerce' === ( $woo_projection['provider'] ?? null ), 'Inventory create should expose WooCommerce projection provider.' );
$assert( 'ready' === ( $woo_projection['status'] ?? null ), 'Inventory create WooCommerce projection should be ready.' );
$assert( true === ( $woo_projection['woocommerce_write_deferred'] ?? null ), 'WooCommerce projection should keep product writes deferred.' );
$woo_operations = is_array( $woo_projection['product_operations'] ?? null ) ? $woo_projection['product_operations'] : array();
$assert( isset( $woo_operations[0] ) && is_array( $woo_operations[0] ), 'WooCommerce projection should expose a product operation.' );
$assert( 'create_product' === ( $woo_operations[0]['operation'] ?? null ), 'WooCommerce projection should plan a product create.' );
$assert( 'PUG-STAGE-PKM-BULBA-001' === ( $woo_operations[0]['product']['sku'] ?? null ), 'WooCommerce projection should use the created SKU.' );
$square_projection = is_array( $projections['square_inventory_projection'] ?? null ) ? $projections['square_inventory_projection'] : array();
$assert( 'square' === ( $square_projection['provider'] ?? null ), 'Inventory create should expose Square projection provider.' );
$assert( true === ( $square_projection['network_request_deferred'] ?? null ), 'Square projection should keep network calls deferred.' );

$created_inventory_id = (int) ( $create_data['data']['inventory_id'] ?? 0 );
$assert( $created_inventory_id > 0, 'Inventory create response should expose a created inventory ID.' );

$price_log_row = $wpdb->get_row(
	$wpdb->prepare(
		"SELECT * FROM {$price_log_table} WHERE inventory_id = %d LIMIT 1", // phpcs:ignore WordPress.DB.PreparedSQL.InterpolatedNotPrepared
		$created_inventory_id
	),
	ARRAY_A
);
$assert( is_array( $price_log_row ), 'Inventory create should write a price change log row.' );
$assert( '2.50' === number_format( (float) ( $price_log_row['new_sale_price'] ?? 0 ), 2, '.', '' ), 'Price change log should record created sale price.' );
$assert( '1.00' === number_format( (float) ( $price_log_row['minimum_sale_price'] ?? 0 ), 2, '.', '' ), 'Price change log should record created minimum sale price.' );
$assert( 'USD' === ( $price_log_row['currency'] ?? null ), 'Price change log should record created currency.' );
$assert( 'staff' === ( $price_log_row['change_source'] ?? null ), 'Price change log should record intake source.' );
$assert( 'initial_inventory_intake' === ( $price_log_row['reason'] ?? null ), 'Price change log should record intake reason.' );

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

$created_search_request = new WP_REST_Request( 'GET', '/tcg-store/v1/inventory/search' );
$created_search_request->set_param( 'q', 'Bulbasaur' );
$created_search_request->set_param( 'visibility', 'staff' );
$created_search_request->set_param( 'page', '1' );
$created_search_request->set_param( 'page_size', '10' );

$created_search_response = rest_do_request( $created_search_request );
$assert( ! $created_search_response->is_error(), 'Created inventory search REST route returned an error.' );
$assert( 200 === $created_search_response->get_status(), 'Created inventory search REST route did not return HTTP 200.' );

$created_search_data = $created_search_response->get_data();
$assert( is_array( $created_search_data ), 'Created inventory search response is not an array.' );
$assert( 1 === (int) ( $created_search_data['data']['meta']['total'] ?? -1 ), 'Created inventory search should return the created card.' );

$created_items = $created_search_data['data']['items'] ?? array();
$assert( is_array( $created_items ) && isset( $created_items[0] ) && is_array( $created_items[0] ), 'Created inventory search should return a row.' );
$assert( 'Bulbasaur' === ( $created_items[0]['card_name'] ?? null ), 'Created inventory search should return the Bulbasaur card.' );
$assert( 'PUG-STAGE-PKM-BULBA-001' === ( $created_items[0]['sku'] ?? null ), 'Created inventory search should expose the created SKU.' );
$assert( '2.50' === ( $created_items[0]['sale_price'] ?? null ), 'Created inventory search should normalize created sale price.' );

$reference_request = new WP_REST_Request( 'GET', '/tcg-store/v1/reference/search' );
$reference_request->set_param( 'q', 'Charizard' );
$reference_request->set_param( 'game', 'pokemon' );
$reference_request->set_param( 'limit', '5' );

$reference_response = rest_do_request( $reference_request );
$assert( ! $reference_response->is_error(), 'Reference card search REST route returned an error.' );
$assert( 200 === $reference_response->get_status(), 'Reference card search REST route did not return HTTP 200.' );

$reference_data = $reference_response->get_data();
$assert( is_array( $reference_data ), 'Reference card search response is not an array.' );
$assert( 'reference_search_read_ready' === ( $reference_data['code'] ?? null ), 'Reference search should report ready status.' );
$assert( 'wordpress_catalog_cache' === ( $reference_data['data']['source'] ?? null ), 'Reference search should read from the WordPress catalog cache.' );
$assert( 1 === (int) ( $reference_data['data']['meta']['total'] ?? -1 ), 'Reference search should return the seeded card.' );
$assert( false === ( $reference_data['data']['meta']['live_provider_request'] ?? null ), 'Reference search should not call the live provider in the route.' );
$assert( false === ( $reference_data['data']['meta']['credentials_in_response'] ?? null ), 'Reference search should not expose credentials.' );

$reference_cards = $reference_data['data']['cards'] ?? array();
$assert( is_array( $reference_cards ) && isset( $reference_cards[0] ) && is_array( $reference_cards[0] ), 'Reference search should return a card row.' );
$assert( 'Charizard' === ( $reference_cards[0]['card_name'] ?? null ), 'Reference search should return the seeded Charizard card.' );
$assert( 'https://images.pokemontcg.io/base1/4_hires.png' === ( $reference_cards[0]['image_url'] ?? null ), 'Reference search should expose the card image URL.' );
$assert( '250.00' === ( $reference_cards[0]['market_price']['amount'] ?? null ), 'Reference search should expose the market price.' );
$assert( 25000 === (int) ( $reference_cards[0]['market_price_minor_units'] ?? 0 ), 'Reference search should expose price minor units.' );
$assert( 'USD' === ( $reference_cards[0]['currency'] ?? null ), 'Reference search should expose the price currency.' );
$assert( false === ( $reference_cards[0]['live_provider_request'] ?? null ), 'Reference search card should not come from a live provider request.' );

$reference_variants = $reference_cards[0]['variants'] ?? array();
$assert( is_array( $reference_variants ) && 2 === count( $reference_variants ), 'Reference search should expose seeded variants.' );
$assert( 'Holofoil' === ( $reference_variants[0]['finish'] ?? null ), 'Reference search should expose variant finish.' );
$assert( '' !== ( $reference_variants[0]['provider_variant_id'] ?? '' ), 'Reference search should expose provider variant IDs.' );

$health_response = rest_do_request( '/tcg-store/v1/health' );
$assert( ! $health_response->is_error(), 'Health REST route returned an error during staging smoke.' );
$assert( 200 === $health_response->get_status(), 'Health REST route did not return HTTP 200 during staging smoke.' );

$health = $health_response->get_data();
$assert( is_array( $health ), 'Health response is not an array during staging smoke.' );
$assert( true === ( $health['features']['inventory_pricing']['available'] ?? null ), 'Health should report inventory staging availability.' );
$assert( true === ( $health['features']['inventory_pricing']['enabled'] ?? null ), 'Health should report inventory staging enablement.' );
$assert( 'ready' === ( $health['inventory_route_bootstrap']['status'] ?? null ), 'Inventory route bootstrap should be ready on staging smoke.' );
$assert( true === ( $health['inventory_route_bootstrap']['feature_enabled'] ?? null ), 'Inventory route bootstrap feature should be enabled.' );
$assert( 3 === (int) ( $health['inventory_route_bootstrap']['registerable_route_count'] ?? 0 ), 'Reference search, staff inventory search, and create should be registerable.' );
$assert( true === ( $health['inventory_route_bootstrap']['should_register_routes'] ?? null ), 'Inventory route bootstrap should register staging search and create.' );
$assert( false === ( $health['inventory_route_bootstrap']['registration_deferred'] ?? null ), 'Inventory route bootstrap should not be deferred.' );

$inventory_routes = $health['inventory_route_bootstrap']['route_registration_summary'] ?? array();
$assert( is_array( $inventory_routes ), 'Inventory route summary should be present during staging smoke.' );
$assert( true === ( $inventory_routes['GET /reference/search']['should_register'] ?? null ), 'Reference card search should be registerable.' );
$assert( false === ( $inventory_routes['GET /reference/search']['route_connected_reads_deferred'] ?? null ), 'Reference card search reads should not be deferred.' );
$assert( true === ( $inventory_routes['GET /reference/search']['route_connected_writes_deferred'] ?? null ), 'Reference card search writes should remain deferred.' );
$assert( true === ( $inventory_routes['GET /inventory/search']['should_register'] ?? null ), 'Staff inventory search should be registerable.' );
$assert( false === ( $inventory_routes['GET /inventory/search']['route_connected_reads_deferred'] ?? null ), 'Staff inventory search reads should not be deferred.' );
$assert( true === ( $inventory_routes['GET /inventory/search']['route_connected_writes_deferred'] ?? null ), 'Staff inventory search writes should remain deferred.' );
$assert( true === ( $inventory_routes['POST /inventory']['should_register'] ?? null ), 'Inventory create route should be registerable.' );
$assert( false === ( $inventory_routes['POST /inventory']['route_connected_writes_deferred'] ?? null ), 'Inventory create writes should not be deferred.' );
$assert( true === ( $inventory_routes['POST /inventory']['woocommerce_projection_deferred'] ?? null ), 'Inventory create WooCommerce projection should remain deferred.' );
$assert( true === ( $inventory_routes['POST /inventory']['square_inventory_projection_deferred'] ?? null ), 'Inventory create Square projection should remain deferred.' );
$assert( true === ( $inventory_routes['POST /inventory']['label_print_deferred'] ?? null ), 'Inventory create labels should remain deferred.' );

$dependencies = $health['inventory_route_dependencies'] ?? array();
$assert( is_array( $dependencies ), 'Inventory route dependency summary should be present during staging smoke.' );
$assert( false === ( $dependencies['public_read_routes_enabled'] ?? null ), 'Public inventory reads should remain disabled.' );
$assert( true === ( $dependencies['reference_search_handler_ready'] ?? null ), 'Reference card search handler should be route-ready.' );
$assert( true === ( $dependencies['inventory_search_route_handler_ready'] ?? null ), 'Inventory search handler should be route-ready.' );
$assert( false === ( $dependencies['inventory_search_route_reads_deferred'] ?? null ), 'Inventory search handler reads should not be deferred.' );
$assert( true === ( $dependencies['inventory_intake_route_handler_ready'] ?? null ), 'Inventory intake handler should be route-ready.' );
$assert( false === ( $dependencies['inventory_intake_route_writes_deferred'] ?? null ), 'Inventory intake writes should not be deferred.' );

echo "PASS WordPress staging inventory smoke test\n";
