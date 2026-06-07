<?php
/**
 * Offline device token lookup planner tests.
 *
 * @package TCGStorePlatform
 */

namespace TCGStorePlatform\Tests\Unit;

use TCGStorePlatform\Offline\OfflineDeviceTokenLookupPlanner;
use TCGStorePlatform\Tests\TestCase;

final class OfflineDeviceTokenLookupPlannerTest extends TestCase {
	private const DEVICE_TOKEN = 'test-device-token-abcdefghijklmnopqrstuvwxyz-123456';

	public function test_lookup_plan_builds_hash_filter_and_secret_free_audit_payload(): void {
		$plan = ( new OfflineDeviceTokenLookupPlanner() )->plan(
			array(
				'Authorization' => 'Bearer ' . self::DEVICE_TOKEN,
			)
		);

		$expected_hash = OfflineDeviceTokenLookupPlanner::token_hash( self::DEVICE_TOKEN );
		$audit         = $plan->audit_payload();

		$this->assert_true( $plan->is_valid() );
		$this->assert_same( $expected_hash, $plan->token_hash() );
		$this->assert_same( array( 'token_hash' => $expected_hash ), $plan->lookup_filters() );
		$this->assert_same( substr( $expected_hash, 0, 12 ), $plan->token_fingerprint() );
		$this->assert_same( 'offline_device_token_lookup_planned', $audit['action'] );
		$this->assert_same( substr( $expected_hash, 0, 12 ), $audit['token_fingerprint'] );
		$this->assert_true( $audit['has_lookup_filter'] );
		$this->assert_false( array_key_exists( 'device_token', $audit ) );
		$this->assert_false( array_key_exists( 'token_hash', $audit ) );
	}

	public function test_lookup_planner_accepts_normalized_wordpress_header_arrays(): void {
		$plan = ( new OfflineDeviceTokenLookupPlanner() )->plan(
			array(
				'http-authorization' => array( 'Bearer ' . self::DEVICE_TOKEN ),
			)
		);

		$this->assert_true( $plan->is_valid() );
		$this->assert_same(
			OfflineDeviceTokenLookupPlanner::token_hash( self::DEVICE_TOKEN ),
			$plan->lookup_filters()['token_hash']
		);
	}

	public function test_lookup_planner_rejects_missing_malformed_and_short_tokens(): void {
		$planner = new OfflineDeviceTokenLookupPlanner();

		$missing = $planner->plan( array() );
		$basic   = $planner->plan(
			array(
				'Authorization' => 'Basic ' . self::DEVICE_TOKEN,
			)
		);
		$short   = $planner->plan(
			array(
				'Authorization' => 'Bearer short',
			)
		);

		$this->assert_false( $missing->is_valid() );
		$this->assert_same( array( 'authorization_header_required' ), $missing->errors() );
		$this->assert_false( $basic->is_valid() );
		$this->assert_same( array( 'authorization_header_invalid' ), $basic->errors() );
		$this->assert_false( $short->is_valid() );
		$this->assert_same( array( 'device_token_invalid' ), $short->errors() );
		$this->assert_same( array(), $short->lookup_filters() );
		$this->assert_false( $short->audit_payload()['has_lookup_filter'] );
	}
}
