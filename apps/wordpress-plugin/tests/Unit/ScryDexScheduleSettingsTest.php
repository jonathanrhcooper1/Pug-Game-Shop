<?php
/**
 * ScryDex scheduled refresh settings tests.
 *
 * @package TCGStorePlatform
 */

namespace TCGStorePlatform\Tests\Unit;

use TCGStorePlatform\Settings\ScryDexScheduleSettings;
use TCGStorePlatform\Tests\TestCase;

final class ScryDexScheduleSettingsTest extends TestCase {
	public function test_defaults_keep_scheduled_refresh_fully_deferred(): void {
		$status = ScryDexScheduleSettings::public_status( ScryDexScheduleSettings::defaults() );

		$this->assert_same( 'blocked', $status['status'] );
		$this->assert_false( $status['configured'] );
		$this->assert_false( $status['enabled'] );
		$this->assert_false( $status['network_requests_enabled'] );
		$this->assert_false( $status['database_writes_enabled'] );
		$this->assert_false( $status['execute_database_writes'] );
		$this->assert_same( array( 'pokemon' ), $status['game_keys'] );
		$this->assert_true( in_array( 'scrydex_scheduled_refresh_disabled', $status['configuration_issues'], true ) );
		$this->assert_true( in_array( 'scrydex_scheduled_network_requests_disabled', $status['configuration_issues'], true ) );
		$this->assert_true( in_array( 'scrydex_scheduled_database_writes_disabled', $status['configuration_issues'], true ) );
	}

	public function test_configured_schedule_reports_ready_without_secrets(): void {
		$status = ScryDexScheduleSettings::public_status(
			array(
				'enabled'                  => true,
				'game_keys'                => array( 'pokemon', 'lorcana' ),
				'cards_page_size'          => 200,
				'max_pages_per_game_run'   => 5,
				'network_requests_enabled' => true,
				'database_writes_enabled'  => true,
				'execute_database_writes'  => true,
			)
		);

		$this->assert_same( 'ready', $status['status'] );
		$this->assert_true( $status['configured'] );
		$this->assert_same( array( 'pokemon', 'lorcana' ), $status['game_keys'] );
		$this->assert_same( 200, $status['cards_page_size'] );
		$this->assert_same( 5, $status['max_pages_per_game_run'] );
		$this->assert_true( $status['credential_values_redacted'] );
		$this->assert_true( $status['provider_result_bodies_not_logged'] );
		$this->assert_same( array(), $status['configuration_issues'] );
	}
}
