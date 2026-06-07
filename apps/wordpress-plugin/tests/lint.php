<?php
/**
 * PHP syntax lint runner.
 *
 * @package TCGStorePlatform
 */

declare(strict_types=1);

$root      = dirname( __DIR__ );
$iterator  = new RecursiveIteratorIterator(
	new RecursiveDirectoryIterator( $root, FilesystemIterator::SKIP_DOTS )
);
$failures  = array();
$file_count = 0;

foreach ( $iterator as $file ) {
	if ( 'php' !== strtolower( $file->getExtension() ) ) {
		continue;
	}

	if ( str_contains( $file->getPathname(), DIRECTORY_SEPARATOR . 'vendor' . DIRECTORY_SEPARATOR ) ) {
		continue;
	}

	++$file_count;
	$command = escapeshellarg( PHP_BINARY ) . ' -l ' . escapeshellarg( $file->getPathname() );
	$output  = array();
	$status  = 0;

	exec( $command, $output, $status );

	if ( 0 !== $status ) {
		$failures[] = $file->getPathname() . ': ' . implode( "\n", $output );
	}
}

echo "{$file_count} PHP files checked, " . count( $failures ) . " failures.\n";

if ( $failures ) {
	foreach ( $failures as $failure ) {
		echo "- {$failure}\n";
	}

	exit( 1 );
}
