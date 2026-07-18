<?php
/**
 * WordPress inventory search benchmark fixture and baseline runner.
 *
 * Intended to run through WP-CLI in disposable staging/integration databases.
 *
 * @package TCGStorePlatform
 */

use TCGStorePlatform\Api\V1\InventorySearchRouteHandler;
use TCGStorePlatform\Api\V1\OfflineRestRequestData;
use TCGStorePlatform\Inventory\InventorySearchRepository;
use TCGStorePlatform\Migrations\MigrationRunner;
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

$assert(
	'1' === getenv( 'TCG_ALLOW_INVENTORY_SEARCH_BENCHMARK' ),
	'Set TCG_ALLOW_INVENTORY_SEARCH_BENCHMARK=1 to seed and benchmark inventory search.'
);
$assert(
	function_exists( 'wp_get_environment_type' ) && 'production' !== wp_get_environment_type(),
	'Inventory search benchmark must not run in production.'
);
$assert(
	Version::DATABASE === ( new MigrationRunner() )->current_version(),
	'Inventory search benchmark requires the current database target.'
);

global $wpdb;

$locations_table = $wpdb->prefix . 'tcg_inventory_locations';
$inventory_table = $wpdb->prefix . 'tcg_inventory_items';
$benchmark_code  = 'PUG-BENCH-SEARCH';
$row_count       = 50000;
$batch_size      = 500;
$now             = '2026-06-07 12:00:00.000000';

$quote = static fn ( mixed $value ): string => "'" . esc_sql( (string) $value ) . "'";

$delete_existing = static function () use ( $wpdb, $locations_table, $inventory_table, $benchmark_code ): void {
	$wpdb->query(
		$wpdb->prepare(
			"DELETE FROM {$inventory_table} WHERE barcode LIKE %s OR sku LIKE %s OR notes = %s", // phpcs:ignore WordPress.DB.PreparedSQL.InterpolatedNotPrepared
			$benchmark_code . '-%',
			$benchmark_code . '-%',
			$benchmark_code
		)
	);
	$wpdb->query(
		$wpdb->prepare(
			"DELETE FROM {$locations_table} WHERE code = %s", // phpcs:ignore WordPress.DB.PreparedSQL.InterpolatedNotPrepared
			$benchmark_code
		)
	);
};

$delete_existing();

$location_inserted = $wpdb->insert(
	$locations_table,
	array(
		'public_id'     => '00000000-0000-4000-8000-999999999999',
		'location_type' => 'benchmark',
		'code'          => $benchmark_code,
		'name'          => 'Pug Benchmark Search Location',
		'timezone'      => 'America/New_York',
		'is_active'     => 1,
		'sort_order'    => 999,
		'created_at'    => $now,
		'updated_at'    => $now,
	),
	array( '%s', '%s', '%s', '%s', '%s', '%d', '%d', '%s', '%s' )
);

$assert( 1 === $location_inserted, 'Benchmark location insert failed.' );

$location_id = (int) $wpdb->insert_id;
$assert( 0 < $location_id, 'Benchmark location ID was not assigned.' );

$seed_started = microtime( true );
$wpdb->query( 'START TRANSACTION' );

try {
	for ( $offset = 0; $offset < $row_count; $offset += $batch_size ) {
		$values = array();
		$limit  = min( $row_count, $offset + $batch_size );

		for ( $index = $offset + 1; $index <= $limit; ++$index ) {
			$number       = str_pad( (string) $index, 5, '0', STR_PAD_LEFT );
			$is_available = 0 !== $index % 5;
			$is_visible   = 0 === $index % 2;
			$status       = $is_available ? 'available' : ( 0 === $index % 3 ? 'reserved' : 'sold' );
			$price        = number_format( 1 + ( $index % 200 ) / 2, 2, '.', '' );
			$minimum      = number_format( max( 0.5, (float) $price - 0.5 ), 2, '.', '' );

			$values[] = '(' . implode(
				', ',
				array(
					$quote( '00000000-0000-4000-8000-' . str_pad( (string) $index, 12, '0', STR_PAD_LEFT ) ),
					$quote( 'pokemon' ),
					$quote( 'Benchmark Card ' . $number ),
					$quote( 'Pug Benchmark Set ' . ( $index % 20 ) ),
					$quote( 'PGB' . str_pad( (string) ( $index % 20 ), 2, '0', STR_PAD_LEFT ) ),
					$quote( (string) ( $index % 500 ) ),
					(string) ( 1999 + ( $index % 25 ) ),
					$quote( 0 === $index % 7 ? 'graded' : 'raw' ),
					$quote( 0 === $index % 7 ? '' : 'nm' ),
					$quote( $benchmark_code . '-BC-' . $number ),
					$quote( $benchmark_code . '-SKU-' . $number ),
					$quote( $minimum ),
					$quote( 'USD' ),
					$quote( $price ),
					$quote( 'USD' ),
					$quote( $price ),
					$quote( $price ),
					$quote( $minimum ),
					$quote( 'USD' ),
					(string) $location_id,
					$quote( $is_visible ? 'visible' : 'hidden' ),
					$quote( 'visible' ),
					$quote( 'visible' ),
					$quote( $status ),
					$quote( $benchmark_code ),
					$quote( $now ),
					$quote( $now ),
					'1',
				)
			) . ')';
		}

		$sql = "INSERT INTO {$inventory_table} (public_id, game, card_name, set_name, set_code, card_number, year, raw_or_graded, condition_code, barcode, sku, cost, cost_currency, market_price, market_price_currency, suggested_price, sale_price, minimum_sale_price, sale_currency, location_id, online_visibility, kiosk_visibility, pos_visibility, status, notes, created_at, updated_at, row_version) VALUES " . implode( ', ', $values ); // phpcs:ignore WordPress.DB.PreparedSQL.InterpolatedNotPrepared
		$wpdb->query( $sql ); // phpcs:ignore WordPress.DB.PreparedSQL.NotPrepared

		if ( '' !== $wpdb->last_error ) {
			throw new RuntimeException( 'Benchmark inventory insert failed: ' . $wpdb->last_error );
		}
	}

	$wpdb->query( 'COMMIT' );
} catch ( Throwable $error ) {
	$wpdb->query( 'ROLLBACK' );
	$delete_existing();
	$fail( $error->getMessage() );
}

$seed_elapsed_ms = (int) round( ( microtime( true ) - $seed_started ) * 1000 );
$seeded_count    = (int) $wpdb->get_var(
	$wpdb->prepare(
		"SELECT COUNT(*) FROM {$inventory_table} WHERE notes = %s", // phpcs:ignore WordPress.DB.PreparedSQL.InterpolatedNotPrepared
		$benchmark_code
	)
);

$assert( $row_count === $seeded_count, 'Benchmark fixture did not seed 50,000 rows.' );

$handler           = new InventorySearchRouteHandler(
	new InventorySearchRepository( $wpdb ),
	null,
	null,
	$wpdb->prefix
);
$max_elapsed_ms    = max( 0, (int) getenv( 'TCG_INVENTORY_SEARCH_BENCHMARK_MAX_MS' ) );
$benchmark_results = array();

$run_benchmark = static function (
	string $name,
	array $query,
	int $expected_total,
	int $expected_rows
) use (
	$handler,
	$assert,
	$max_elapsed_ms,
	&$benchmark_results
): void {
	$started    = microtime( true );
	$response   = $handler->search_inventory_items(
		new OfflineRestRequestData(
			array(),
			$query,
			array(),
			array()
		)
	);
	$elapsed_ms = (int) round( ( microtime( true ) - $started ) * 1000 );
	$data       = is_array( $response['data'] ?? null ) ? $response['data'] : array();
	$items      = is_array( $data['items'] ?? null ) ? $data['items'] : array();
	$meta       = is_array( $data['meta'] ?? null ) ? $data['meta'] : array();

	$assert( 'ready' === ( $response['status'] ?? null ), "{$name} did not return a ready search response." );
	$assert( (int) ( $meta['total'] ?? -1 ) === $expected_total, "{$name} total mismatch." );
	$assert( count( $items ) === $expected_rows, "{$name} row count mismatch." );

	if ( 0 < $max_elapsed_ms ) {
		$assert( $max_elapsed_ms >= $elapsed_ms, "{$name} exceeded configured benchmark threshold." );
	}

	$benchmark_results[] = array(
		'name'       => $name,
		'elapsed_ms' => $elapsed_ms,
		'total'      => (int) ( $meta['total'] ?? 0 ),
		'row_count'  => count( $items ),
		'page'       => (int) ( $meta['page'] ?? 0 ),
		'page_size'  => (int) ( $meta['page_size'] ?? 0 ),
	);
};

$run_benchmark(
	'public visible available text search page 1',
	array(
		'q'          => 'Benchmark Card',
		'game'       => 'pokemon',
		'visibility' => 'public',
		'sort'       => 'relevance',
		'page'       => '1',
		'page_size'  => '25',
	),
	20000,
	25
);

$run_benchmark(
	'staff available deep pagination',
	array(
		'game'       => 'pokemon',
		'visibility' => 'staff',
		'status'     => 'available',
		'sort'       => 'name_asc',
		'page'       => '400',
		'page_size'  => '100',
	),
	40000,
	100
);

$run_benchmark(
	'staff barcode scan lookup',
	array(
		'q'          => $benchmark_code . '-BC-00420',
		'visibility' => 'staff',
		'sort'       => 'relevance',
		'page'       => '1',
		'page_size'  => '25',
	),
	1,
	1
);

if ( '1' === getenv( 'TCG_INVENTORY_SEARCH_BENCHMARK_CLEANUP' ) ) {
	$delete_existing();
}

echo wp_json_encode(
	array(
		'status'          => 'PASS',
		'fixture_rows'    => $seeded_count,
		'seed_elapsed_ms' => $seed_elapsed_ms,
		'benchmarks'      => $benchmark_results,
	),
	JSON_PRETTY_PRINT
) . "\n";
