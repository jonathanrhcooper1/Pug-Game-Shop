<?php
/**
 * Minimal dependency-free test case.
 *
 * @package TCGStorePlatform
 */

namespace TCGStorePlatform\Tests;

use RuntimeException;

abstract class TestCase {
	protected function assert_true( bool $condition, string $message = 'Expected condition to be true.' ): void {
		if ( ! $condition ) {
			throw new RuntimeException( $message );
		}
	}

	protected function assert_false( bool $condition, string $message = 'Expected condition to be false.' ): void {
		$this->assert_true( ! $condition, $message );
	}

	protected function assert_same( mixed $expected, mixed $actual, string $message = '' ): void {
		if ( $expected !== $actual ) {
			throw new RuntimeException(
				$message ?: sprintf(
					'Expected %s, received %s.',
					var_export( $expected, true ),
					var_export( $actual, true )
				)
			);
		}
	}

	protected function assert_contains( string $needle, string $haystack, string $message = '' ): void {
		$this->assert_true(
			str_contains( $haystack, $needle ),
			$message ?: sprintf( 'Expected string to contain "%s".', $needle )
		);
	}

	protected function assert_not_contains( string $needle, string $haystack, string $message = '' ): void {
		$this->assert_false(
			str_contains( $haystack, $needle ),
			$message ?: sprintf( 'Expected string not to contain "%s".', $needle )
		);
	}
}
