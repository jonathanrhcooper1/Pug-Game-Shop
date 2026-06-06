<?php
/**
 * Dependency-free unit test runner.
 *
 * @package TCGStorePlatform
 */

declare(strict_types=1);

$plugin_root = dirname( __DIR__ );

require_once $plugin_root . '/src/Autoloader.php';
require_once __DIR__ . '/TestCase.php';

\TCGStorePlatform\Autoloader::register( $plugin_root . '/src' );

$test_files = glob( __DIR__ . '/Unit/*Test.php' ) ?: array();
$failures   = array();
$test_count = 0;

foreach ( $test_files as $test_file ) {
	require_once $test_file;
}

foreach ( get_declared_classes() as $class_name ) {
	if ( ! is_subclass_of( $class_name, \TCGStorePlatform\Tests\TestCase::class ) ) {
		continue;
	}

	$test_case = new $class_name();

	foreach ( get_class_methods( $test_case ) as $method_name ) {
		if ( ! str_starts_with( $method_name, 'test_' ) ) {
			continue;
		}

		++$test_count;

		try {
			$test_case->{$method_name}();
			echo "PASS {$class_name}::{$method_name}\n";
		} catch ( Throwable $error ) {
			$failures[] = "{$class_name}::{$method_name}: {$error->getMessage()}";
			echo "FAIL {$class_name}::{$method_name}\n";
		}
	}
}

echo "\n{$test_count} tests, " . count( $failures ) . " failures.\n";

if ( $failures ) {
	foreach ( $failures as $failure ) {
		echo "- {$failure}\n";
	}

	exit( 1 );
}
