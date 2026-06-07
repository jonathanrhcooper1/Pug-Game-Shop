<?php
/**
 * Settings tests.
 *
 * @package TCGStorePlatform
 */

namespace TCGStorePlatform\Tests\Unit;

use TCGStorePlatform\Settings\BrandingSettings;
use TCGStorePlatform\Settings\OfflinePairingAuthorizationSettings;
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

	public function test_offline_pairing_authorization_defaults_are_secret_free(): void {
		$defaults = Settings::defaults();
		$policy   = $defaults['offline_pairing_authorization'];

		$this->assert_same( array(), $policy['pairing_code_hashes'] );
		$this->assert_same( array(), $policy['manager_ids'] );
		$this->assert_same( array(), $policy['location_ids'] );
		$this->assert_same( array(), $policy['allowed_scopes_by_mode']['kiosk'] );
		$this->assert_same( '', $policy['expires_at_utc'] );
		$this->assert_false( isset( $policy['pairing_code'] ) );
	}

	public function test_offline_pairing_authorization_settings_are_sanitized(): void {
		$hash   = strtoupper( hash( 'sha256', 'PAIR-2026-REGISTER-DEVICE' ) );
		$result = Settings::sanitize(
			array(
				'offline_pairing_authorization' => array(
					'pairing_code'           => 'PAIR-2026-REGISTER-DEVICE',
					'pairing_code_hashes'    => " {$hash}\nnot-a-hash",
					'manager_ids'            => '42, 0, bad, 42, 7',
					'location_ids'           => array( '2', 'bad', 3, -1 ),
					'allowed_scopes_by_mode' => array(
						'kiosk' => 'offline_pull offline_push kiosk unknown',
						'staff' => array( 'Inventory', 'events', 'events' ),
						'admin' => array( 'conflicts', 'customer_credit' ),
						'bad'   => array( 'offline_pull' ),
					),
					'expires_at_utc'         => '2026-06-06T19:30:00Z',
				),
			)
		);
		$policy = $result['offline_pairing_authorization'];

		$this->assert_same( array( strtolower( $hash ) ), $policy['pairing_code_hashes'] );
		$this->assert_same( array( 42, 7 ), $policy['manager_ids'] );
		$this->assert_same( array( 2, 3 ), $policy['location_ids'] );
		$this->assert_same( array( 'offline_pull', 'offline_push', 'kiosk' ), $policy['allowed_scopes_by_mode']['kiosk'] );
		$this->assert_same( array( 'inventory', 'events' ), $policy['allowed_scopes_by_mode']['staff'] );
		$this->assert_same( array( 'conflicts', 'customer_credit' ), $policy['allowed_scopes_by_mode']['admin'] );
		$this->assert_same( '2026-06-06T19:30:00Z', $policy['expires_at_utc'] );
		$this->assert_false( isset( $policy['pairing_code'] ) );
	}

	public function test_offline_pairing_authorization_policy_preserves_existing_partial_values(): void {
		$hash     = hash( 'sha256', 'PAIR-2026-REGISTER-DEVICE' );
		$existing = array(
			'pairing_code_hashes'    => array( $hash ),
			'manager_ids'            => array( 42 ),
			'location_ids'           => array( 2 ),
			'allowed_scopes_by_mode' => array(
				'kiosk' => array( 'offline_pull', 'offline_push' ),
			),
			'expires_at_utc'         => '2026-06-06T19:30:00Z',
		);

		$policy = OfflinePairingAuthorizationSettings::sanitize(
			array(
				'manager_ids' => array( 99 ),
			),
			$existing
		);

		$this->assert_same( array( $hash ), $policy['pairing_code_hashes'] );
		$this->assert_same( array( 99 ), $policy['manager_ids'] );
		$this->assert_same( array( 2 ), $policy['location_ids'] );
		$this->assert_same( array( 'offline_pull', 'offline_push' ), $policy['allowed_scopes_by_mode']['kiosk'] );
		$this->assert_same( '2026-06-06T19:30:00Z', $policy['expires_at_utc'] );
	}

	public function test_branding_settings_are_sanitized(): void {
		$result = Settings::sanitize(
			array(
				'branding' => array(
					'company_name'       => " Golden\nMoments Cards ",
					'company_short_name' => ' GMC ',
					'logo_url'           => 'http://assets.example.test/logo.png',
					'support_url'        => 'https://support.example.test/help',
					'receipt_footer'     => " Thanks\nfor visiting ",
					'primary_color'      => '#aabbcc',
					'accent_color'       => '#0f0',
					'background_color'   => 'blue',
				),
			)
		);

		$branding = $result['branding'];

		$this->assert_same( 'Golden Moments Cards', $branding['company_name'] );
		$this->assert_same( 'GMC', $branding['company_short_name'] );
		$this->assert_same( '', $branding['logo_url'] );
		$this->assert_same( 'https://support.example.test/help', $branding['support_url'] );
		$this->assert_same( 'Thanks for visiting', $branding['receipt_footer'] );
		$this->assert_same( '#AABBCC', $branding['primary_color'] );
		$this->assert_same( '#00FF00', $branding['accent_color'] );
		$this->assert_same( '#FFFFFF', $branding['background_color'] );
	}

	public function test_branding_sanitizer_preserves_existing_safe_values(): void {
		$result = BrandingSettings::sanitize(
			array(
				'logo_url'      => 'not-a-url',
				'primary_color' => 'not-a-color',
			),
			array(
				'logo_url'      => 'https://assets.example.test/logo.png',
				'primary_color' => '#123456',
			)
		);

		$this->assert_same( 'https://assets.example.test/logo.png', $result['logo_url'] );
		$this->assert_same( '#123456', $result['primary_color'] );
	}

	public function test_branding_public_config_exports_client_safe_theme_tokens(): void {
		$config = BrandingSettings::public_config(
			array(
				'branding'        => array(
					'company_name'       => 'Shop A',
					'company_short_name' => 'Shop',
					'primary_color'      => '#334455',
				),
				'topdeck_api_key' => 'secret-key',
			)
		);

		$this->assert_same( 'Shop A', $config['company']['name'] );
		$this->assert_same( '#334455', $config['theme']['primary_color'] );
		$this->assert_same( '#334455', $config['css_variables']['--tcg-primary'] );
		$this->assert_false( isset( $config['topdeck_api_key'] ) );
	}

	public function test_branding_css_variable_string_is_stable(): void {
		$css = BrandingSettings::css_variable_string(
			array(
				'primary_color' => '#111111',
				'accent_color'  => '#222222',
			)
		);

		$this->assert_contains( '--tcg-primary: #111111;', $css );
		$this->assert_contains( '--tcg-accent: #222222;', $css );
	}
}
