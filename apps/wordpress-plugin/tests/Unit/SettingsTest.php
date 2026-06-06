<?php
/**
 * Settings tests.
 *
 * @package TCGStorePlatform
 */

namespace TCGStorePlatform\Tests\Unit;

use TCGStorePlatform\Settings\Settings;
use TCGStorePlatform\Tests\TestCase;

final class SettingsTest extends TestCase {
	public function test_invalid_log_level_falls_back_to_warning(): void {
		$result = Settings::sanitize( array( 'logging_level' => 'everything' ) );

		$this->assert_same( 'warning', $result['logging_level'] );
	}

	public function test_daily_schedule_cannot_be_changed(): void {
		$result = Settings::sanitize(
			array(
				'daily_run_time' => '01:30',
				'daily_timezone' => 'UTC',
			)
		);

		$this->assert_same( '09:00', $result['daily_run_time'] );
		$this->assert_same( 'America/New_York', $result['daily_timezone'] );
	}

	public function test_topdeck_settings_are_sanitized(): void {
		$result = Settings::sanitize(
			array(
				'topdeck_api_key'        => ' sandbox-test-key ',
				'topdeck_base_url'       => 'https://topdeck.example.test/api',
				'topdeck_rate_limit'     => 120,
				'topdeck_create_enabled' => '1',
			)
		);

		$this->assert_same( 'sandbox-test-key', $result['topdeck_api_key'] );
		$this->assert_same( 'https://topdeck.example.test/api', $result['topdeck_base_url'] );
		$this->assert_same( 120, $result['topdeck_rate_limit'] );
		$this->assert_true( $result['topdeck_create_enabled'] );
	}

	public function test_topdeck_base_url_must_be_https(): void {
		$result = Settings::sanitize(
			array(
				'topdeck_base_url'   => 'http://topdeck.example.test/api',
				'topdeck_rate_limit' => 999,
			)
		);

		$this->assert_same( 'https://topdeck.gg/api', $result['topdeck_base_url'] );
		$this->assert_same( 60, $result['topdeck_rate_limit'] );
	}
}
