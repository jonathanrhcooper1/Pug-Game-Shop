<?php
/**
 * Offline connector manifest planner tests.
 *
 * @package TCGStorePlatform
 */

namespace TCGStorePlatform\Tests\Unit;

use TCGStorePlatform\Api\V1\OfflineConnectorManifestPlanner;
use TCGStorePlatform\Settings\Settings;
use TCGStorePlatform\Tests\TestCase;

final class OfflineConnectorManifestPlannerTest extends TestCase {
	public function test_manifest_exposes_company_site_and_route_boundaries_without_secrets(): void {
		$settings = $this->settings();
		$plan     = ( new OfflineConnectorManifestPlanner() )->plan(
			$settings,
			array(
				'site_url'    => 'https://pug.example.test',
				'environment' => 'staging',
			)
		);
		$json     = json_encode( $plan );

		$this->assert_same( 'ready', $plan['status'] );
		$this->assert_same( 'offline_connector_manifest', $plan['action'] );
		$this->assert_true( $plan['profile_manifest_ready'] );
		$this->assert_same( 'pug-staging-pug-example-test', $plan['profile_id'] );
		$this->assert_same( 'staging', $plan['environment'] );
		$this->assert_same( 'Pug Game Shop', $plan['company']['name'] );
		$this->assert_same( 'Pug', $plan['company']['short_name'] );
		$this->assert_same( 'https://pug.example.test', $plan['wordpress']['site_url'] );
		$this->assert_true( $plan['wordpress']['site_url_secure'] );
		$this->assert_same( '/wp-json/tcg-store/v1', $plan['wordpress']['rest_base_path'] );
		$this->assert_same( 'https://pug.example.test/wp-json/tcg-store/v1', $plan['wordpress']['rest_base_url'] );
		$this->assert_same( 'offline_device_token', $plan['wordpress']['auth_mode'] );
		$this->assert_same( 'desktop_secure_store', $plan['wordpress']['credential_storage'] );
		$this->assert_true( $plan['wordpress']['device_pairing_required'] );
		$this->assert_true( $plan['wordpress']['network_requests_deferred'] );
		$this->assert_same( 5, $plan['offline_route_count'] );
		$this->assert_same( '/offline/devices/register', $plan['offline_routes'][0]['path'] );
		$this->assert_same( '/offline/pull', $plan['offline_routes'][1]['path'] );
		$this->assert_same( 'offline_pull', $plan['offline_routes'][1]['required_scope'] );
		$this->assert_false( $plan['offline_routes'][1]['live_enabled_by_default'] );
		$this->assert_same( 'tcg_store_platform', $plan['square']['inventory_authority'] );
		$this->assert_same( 'official_woocommerce_square_extension', $plan['square']['payment_authority'] );
		$this->assert_true( $plan['square']['provider_inventory_writes_deferred'] );
		$this->assert_true( $plan['square']['payment_capture_deferred'] );
		$this->assert_true( $plan['scrydex']['configured'] );
		$this->assert_true( $plan['scrydex']['team_id_configured'] );
		$this->assert_same( 'wordpress_server_settings', $plan['scrydex']['credential_storage'] );
		$this->assert_true( $plan['scrydex']['credential_values_redacted'] );
		$this->assert_false( $plan['scrydex']['credentials_synced_to_app'] );
		$this->assert_false( $plan['credentials_synced_to_app'] );
		$this->assert_true( $plan['manifest_public_safe'] );
		$this->assert_not_contains( 'pug-primary-key', false === $json ? '' : $json );
		$this->assert_not_contains( 'pug-team-id', false === $json ? '' : $json );
	}

	public function test_local_http_site_is_allowed_for_development_but_marked_insecure(): void {
		$plan = ( new OfflineConnectorManifestPlanner() )->plan(
			$this->settings(),
			array(
				'site_url'    => 'http://localhost:8888',
				'environment' => 'development',
			)
		);

		$this->assert_same( 'ready', $plan['status'] );
		$this->assert_same( 'development', $plan['environment'] );
		$this->assert_false( $plan['wordpress']['site_url_secure'] );
		$this->assert_true( $plan['wordpress']['https_required_for_remote_pairing'] );
		$this->assert_same( 'http://localhost:8888/wp-json/tcg-store/v1', $plan['wordpress']['rest_base_url'] );
	}

	public function test_production_http_site_is_degraded_and_keeps_writes_deferred(): void {
		$plan = ( new OfflineConnectorManifestPlanner() )->plan(
			$this->settings(),
			array(
				'site_url'    => 'http://production.example.test',
				'environment' => 'production',
			)
		);

		$this->assert_same( 'degraded', $plan['status'] );
		$this->assert_same( 'production', $plan['environment'] );
		$this->assert_false( $plan['wordpress']['site_url_secure'] );
		$this->assert_true( $plan['square']['production_provider_writes_deferred'] );
		$this->assert_true( $plan['square']['production_payment_capture_deferred'] );
		$this->assert_true( $plan['production_credentials_deferred'] );
	}

	public function test_admin_summary_reports_company_environment_routes_and_redaction(): void {
		$summary = ( new OfflineConnectorManifestPlanner() )->admin_summary(
			$this->settings(),
			array(
				'site_url'    => 'https://pug.example.test',
				'environment' => 'staging',
			)
		);

		$this->assert_same( 'ready', $summary['status'] );
		$this->assert_contains( 'Pug Game Shop', $summary['value'] );
		$this->assert_contains( 'staging', $summary['value'] );
		$this->assert_contains( '5 offline routes', $summary['value'] );
		$this->assert_contains( 'secrets redacted', $summary['value'] );
	}

	/**
	 * @return array<string, mixed>
	 */
	private function settings(): array {
		return array_merge(
			Settings::defaults(),
			array(
				'branding'         => array(
					'company_name'       => 'Pug Game Shop',
					'company_short_name' => 'Pug',
					'logo_url'           => 'https://pug.example.test/logo.png',
					'support_url'        => 'https://pug.example.test/support',
					'receipt_footer'     => 'Thanks for visiting Pug Game Shop.',
				),
				'scrydex_provider' => array(
					'enabled'         => true,
					'environment'     => 'staging',
					'base_url'        => 'https://api.scrydex.example.test',
					'team_id'         => 'pug-team-id',
					'primary_api_key' => 'pug-primary-key',
				),
			)
		);
	}
}
