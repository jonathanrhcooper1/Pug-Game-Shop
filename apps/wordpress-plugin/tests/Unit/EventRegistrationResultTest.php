<?php
/**
 * Event registration result tests.
 *
 * @package TCGStorePlatform
 */

namespace TCGStorePlatform\Tests\Unit;

use TCGStorePlatform\Events\EventRegistrationResult;
use TCGStorePlatform\Tests\TestCase;

final class EventRegistrationResultTest extends TestCase {
	public function test_failure_response_can_include_validation_errors(): void {
		$result = EventRegistrationResult::failure(
			'validation_failed',
			'Registration details are incomplete or invalid.',
			400,
			array( 'email_invalid' )
		);

		$response = $result->to_response();

		$this->assert_false( $result->is_success() );
		$this->assert_same( 400, $result->status_code() );
		$this->assert_same( array( 'email_invalid' ), $response['errors'] );
	}

	public function test_success_response_supports_idempotent_code(): void {
		$result = EventRegistrationResult::success(
			array(
				'public_id' => 'registration-public-1',
				'status'    => 'reserved',
			),
			'Registration was already recorded for this idempotency key.',
			200,
			'already_registered'
		);

		$response = $result->to_response();

		$this->assert_true( $result->is_success() );
		$this->assert_same( 200, $result->status_code() );
		$this->assert_same( 'already_registered', $response['code'] );
	}
}
