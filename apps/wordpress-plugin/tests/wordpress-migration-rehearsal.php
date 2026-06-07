<?php
/**
 * WordPress migration rollback/restore rehearsal.
 *
 * Intended to run through WP-CLI only in disposable staging/integration
 * databases after the normal activation smoke has passed.
 *
 * @package TCGStorePlatform
 */

use TCGStorePlatform\Migrations\InventoryPricingSchema;
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
	'1' === getenv( 'TCG_ALLOW_DESTRUCTIVE_MIGRATION_REHEARSAL' ),
	'Set TCG_ALLOW_DESTRUCTIVE_MIGRATION_REHEARSAL=1 to allow rollback rehearsal.'
);
$assert(
	function_exists( 'wp_get_environment_type' ) && 'production' !== wp_get_environment_type(),
	'Migration rollback rehearsal must not run in production.'
);

global $wpdb;

$runner = new MigrationRunner();

$table_exists = static function ( string $table_name ) use ( $wpdb ): bool {
	$found = $wpdb->get_var(
		$wpdb->prepare( 'SHOW TABLES LIKE %s', $wpdb->esc_like( $table_name ) )
	);

	return $found === $table_name;
};

$assert_table_state = static function ( bool $expected_exists, array $tables, string $context ) use ( $assert, $table_exists ): void {
	foreach ( array_keys( $tables ) as $table_name ) {
		$assert(
			$expected_exists === $table_exists( $table_name ),
			sprintf( '%s table state mismatch: %s', $context, $table_name )
		);
	}
};

$inventory_tables = InventoryPricingSchema::tables(
	$wpdb->prefix,
	$wpdb->get_charset_collate()
);

$assert( Version::DATABASE === $runner->current_version(), 'Rehearsal must start from the current database target.' );
$assert_table_state( true, $inventory_tables, 'before rollback' );

$runner->rollback_to( 1 );

$assert( 1 === $runner->current_version(), 'Rollback rehearsal did not reach schema version 1.' );
$assert_table_state( false, $inventory_tables, 'after rollback' );

$applied_versions = $runner->migrate();

$assert(
	array( 2, 3, 4, 5, 6, 7, 8, 9 ) === $applied_versions,
	'Migration restore did not apply versions 2 through 9.'
);
$assert( Version::DATABASE === $runner->current_version(), 'Migration restore did not return to the current target.' );
$assert_table_state( true, $inventory_tables, 'after restore' );

echo "PASS migration rollback/restore rehearsal\n";
