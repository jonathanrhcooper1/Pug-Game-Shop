<?php
/**
 * ScryDex usage budget settings tests.
 *
 * @package TCGStorePlatform
 */

namespace TCGStorePlatform\Tests\Unit;

use TCGStorePlatform\Settings\ScryDexUsageBudgetSettings;
use TCGStorePlatform\Settings\Settings;
use TCGStorePlatform\Tests\TestCase;

final class ScryDexUsageBudgetSettingsTest extends TestCase {
	public function test_defaults_are_disabled_and_request_safe(): void {
		$defaults = ScryDexUsageBudgetSettings::defaults();
		$status   = ScryDexUsageBudgetSettings::public_status( $defaults );

		$this->assert_false( $defaults['enabled'] );
		$this->assert_same( 0, $defaults['daily_credit_budget'] );
		$this->assert_false( $status['configured'] );
		$this->assert_same( 'blocked', $status['status'] );
		$this->assert_true( $status['provider_usage_requests_deferred'] );
		$this->assert_true( in_array( 'scrydex_usage_budget_disabled', $status['configuration_issues'], true ) );
		$this->assert_true( in_array( 'scrydex_daily_credit_budget_missing', $status['configuration_issues'], true ) );
	}

	public function test_budget_settings_sanitize_and_report_ready_status(): void {
		$settings = ScryDexUsageBudgetSettings::sanitize(
			array(
				'enabled'                        => true,
				'daily_credit_budget'            => '2500',
				'minimum_remaining_credits'      => '250',
				'per_cards_page_credit_estimate' => '8',
				'usage_snapshot_max_age_minutes' => '30',
			)
		);
		$status   = ScryDexUsageBudgetSettings::public_status( $settings );

		$this->assert_true( $status['configured'] );
		$this->assert_same( 'ready', $status['status'] );
		$this->assert_same( 2500, $status['daily_credit_budget'] );
		$this->assert_same( 250, $status['minimum_remaining_credits'] );
		$this->assert_same( 8, $status['per_cards_page_credit_estimate'] );
		$this->assert_same( 30, $status['usage_snapshot_max_age_minutes'] );
		$this->assert_same( array(), $status['configuration_issues'] );
	}

	public function test_minimum_remaining_cannot_exceed_daily_budget(): void {
		$status = ScryDexUsageBudgetSettings::public_status(
			array(
				'enabled'                   => true,
				'daily_credit_budget'       => 100,
				'minimum_remaining_credits' => 250,
			)
		);

		$this->assert_false( $status['configured'] );
		$this->assert_true( in_array( 'scrydex_minimum_remaining_exceeds_daily_budget', $status['configuration_issues'], true ) );
	}

	public function test_platform_settings_include_usage_budget_defaults(): void {
		$defaults = Settings::defaults();

		$this->assert_true( isset( $defaults['scrydex_usage_budget'] ) );
		$this->assert_same( ScryDexUsageBudgetSettings::defaults(), $defaults['scrydex_usage_budget'] );
	}
}
