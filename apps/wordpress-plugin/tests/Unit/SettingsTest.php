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
}
