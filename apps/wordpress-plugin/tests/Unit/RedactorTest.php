<?php
/**
 * Log redaction tests.
 *
 * @package TCGStorePlatform
 */

namespace TCGStorePlatform\Tests\Unit;

use TCGStorePlatform\Logging\Redactor;
use TCGStorePlatform\Tests\TestCase;

final class RedactorTest extends TestCase {
	public function test_sensitive_keys_are_redacted_recursively(): void {
		$result = Redactor::redact(
			array(
				'api_key' => 'secret-value',
				'nested'  => array(
					'manager_pin' => '1234',
					'safe'        => 'visible',
				),
			)
		);

		$this->assert_same( '[redacted]', $result['api_key'] );
		$this->assert_same( '[redacted]', $result['nested']['manager_pin'] );
		$this->assert_same( 'visible', $result['nested']['safe'] );
	}

	public function test_bearer_and_query_secrets_are_redacted(): void {
		$value  = 'Bearer abc.def?x=1 https://example.test?api_key=abc123&safe=yes';
		$result = Redactor::redact( $value );

		$this->assert_not_contains( 'abc.def', $result );
		$this->assert_not_contains( 'abc123', $result );
		$this->assert_contains( 'safe=yes', $result );
	}
}
