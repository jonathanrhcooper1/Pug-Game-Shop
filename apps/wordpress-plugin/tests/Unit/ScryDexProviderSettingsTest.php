<?php
/**
 * ScryDex provider settings tests.
 *
 * @package TCGStorePlatform
 */

namespace TCGStorePlatform\Tests\Unit;

use TCGStorePlatform\Settings\ScryDexProviderSettings;
use TCGStorePlatform\Settings\Settings;
use TCGStorePlatform\Tests\TestCase;

final class ScryDexProviderSettingsTest extends TestCase {
	public function test_defaults_are_disabled_and_secret_free(): void {
		$defaults = ScryDexProviderSettings::defaults();
		$status   = ScryDexProviderSettings::public_status( $defaults );
		$json     = json_encode( $status );

		$this->assert_false( $defaults['enabled'] );
		$this->assert_same( 'disabled', $defaults['environment'] );
		$this->assert_same( '', $defaults['team_id'] );
		$this->assert_same( '', $defaults['primary_api_key'] );
		$this->assert_same( '', $defaults['secondary_api_key'] );
		$this->assert_same( 'blocked', $status['status'] );
		$this->assert_same( 'none', $status['active_key_slot'] );
		$this->assert_true( $status['credential_values_redacted'] );
		$this->assert_not_contains( 'primary_api_key', false === $json ? '' : $json );
	}

	public function test_sanitizer_preserves_saved_secret_values_when_admin_fields_are_blank(): void {
		$existing = array(
			'enabled'           => true,
			'environment'       => 'staging',
			'base_url'          => 'https://api.scrydex.example.test',
			'team_id'           => 'existing-team-id',
			'primary_api_key'   => 'existing-primary-key',
			'secondary_api_key' => 'existing-secondary-key',
		);
		$result   = ScryDexProviderSettings::sanitize(
			array(
				'enabled'           => true,
				'environment'       => 'staging',
				'team_id'           => '',
				'primary_api_key'   => '',
				'secondary_api_key' => '[redacted]',
			),
			$existing
		);

		$this->assert_same( 'existing-team-id', $result['team_id'] );
		$this->assert_same( 'existing-primary-key', $result['primary_api_key'] );
		$this->assert_same( 'existing-secondary-key', $result['secondary_api_key'] );
		$this->assert_true( $result['enabled'] );
	}

	public function test_public_status_reports_configured_credentials_without_leaking_values(): void {
		$settings = ScryDexProviderSettings::sanitize(
			array(
				'enabled'                 => true,
				'environment'             => 'staging',
				'base_url'                => 'https://api.scrydex.example.test/',
				'team_id'                 => 'staging-team-id',
				'primary_api_key'         => 'staging-primary-key',
				'request_timeout_seconds' => 30,
			)
		);
		$status   = ScryDexProviderSettings::public_status( $settings );
		$json     = json_encode( $status );

		$this->assert_true( $status['configured'] );
		$this->assert_same( 'ready', $status['status'] );
		$this->assert_same( 'staging', $status['environment'] );
		$this->assert_same( 'https://api.scrydex.example.test', $status['base_url'] );
		$this->assert_true( $status['team_id_configured'] );
		$this->assert_true( $status['primary_key_configured'] );
		$this->assert_false( $status['secondary_key_configured'] );
		$this->assert_same( 'primary', $status['active_key_slot'] );
		$this->assert_same( 12, strlen( $status['active_key_fingerprint'] ) );
		$this->assert_true( $status['network_requests_deferred'] );
		$this->assert_true( $status['webhook_registration_deferred'] );
		$this->assert_not_contains( 'staging-primary-key', false === $json ? '' : $json );
		$this->assert_not_contains( 'staging-team-id', false === $json ? '' : $json );
	}

	public function test_provider_context_is_secret_bearing_for_server_only(): void {
		$context = ScryDexProviderSettings::provider_context(
			array(
				'enabled'           => true,
				'environment'       => 'sandbox',
				'team_id'           => 'sandbox-team-id',
				'secondary_api_key' => 'sandbox-secondary-key',
			)
		);

		$this->assert_true( $context['configured'] );
		$this->assert_same( 'sandbox-secondary-key', $context['api_key'] );
		$this->assert_same( 'sandbox-team-id', $context['team_id'] );
		$this->assert_same( 'sandbox', $context['environment'] );
	}

	public function test_production_environment_can_be_configured_for_server_side_imports(): void {
		$status = ScryDexProviderSettings::public_status(
			array(
				'enabled'         => true,
				'environment'     => 'production',
				'team_id'         => 'production-team-id',
				'primary_api_key' => 'production-primary-key',
			)
		);

		$this->assert_true( $status['configured'] );
		$this->assert_same( 'production', $status['environment'] );
		$this->assert_true( $status['credential_values_redacted'] );
	}

	public function test_clear_flags_remove_saved_secret_values(): void {
		$result = ScryDexProviderSettings::sanitize(
			array(
				'environment'             => 'staging',
				'clear_team_id'           => true,
				'clear_primary_api_key'   => true,
				'clear_secondary_api_key' => true,
			),
			array(
				'team_id'           => 'existing-team-id',
				'primary_api_key'   => 'existing-primary-key',
				'secondary_api_key' => 'existing-secondary-key',
			)
		);

		$this->assert_same( '', $result['team_id'] );
		$this->assert_same( '', $result['primary_api_key'] );
		$this->assert_same( '', $result['secondary_api_key'] );
	}

	public function test_platform_settings_include_scrydex_defaults(): void {
		$defaults = Settings::defaults();

		$this->assert_true( isset( $defaults['scrydex_provider'] ) );
		$this->assert_same( ScryDexProviderSettings::defaults(), $defaults['scrydex_provider'] );
	}
}
