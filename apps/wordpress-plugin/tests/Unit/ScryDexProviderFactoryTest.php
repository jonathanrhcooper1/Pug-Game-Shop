<?php
/**
 * ScryDex provider factory tests.
 *
 * @package TCGStorePlatform
 */

namespace TCGStorePlatform\Tests\Unit;

use TCGStorePlatform\ScryDex\ScryDexProviderFactory;
use TCGStorePlatform\ScryDex\ScryDexResult;
use TCGStorePlatform\Tests\TestCase;

final class ScryDexProviderFactoryTest extends TestCase {
	public function test_default_readiness_is_blocked_and_deferred(): void {
		$summary = ( new ScryDexProviderFactory( array() ) )->readiness_summary();

		$this->assert_false( $summary['configured'] );
		$this->assert_same( 'blocked', $summary['status'] );
		$this->assert_true( $summary['provider_factory_ready'] );
		$this->assert_false( $summary['provider_context_ready'] );
		$this->assert_true( $summary['network_requests_deferred'] );
		$this->assert_true( $summary['database_writes_deferred'] );
		$this->assert_true( $summary['scheduled_workers_deferred'] );
		$this->assert_true( $summary['webhook_registration_deferred'] );
	}

	public function test_configured_readiness_is_secret_free(): void {
		$summary = ( new ScryDexProviderFactory(
			array(
				'scrydex_provider' => array(
					'enabled'         => true,
					'environment'     => 'staging',
					'team_id'         => 'staging-team-id',
					'primary_api_key' => 'staging-primary-key',
				),
			)
		) )->readiness_summary();
		$json    = json_encode( $summary );

		$this->assert_true( $summary['configured'] );
		$this->assert_same( 'ready', $summary['status'] );
		$this->assert_true( $summary['provider_context_ready'] );
		$this->assert_same( 'primary', $summary['active_key_slot'] );
		$this->assert_same( 12, strlen( $summary['active_key_fingerprint'] ) );
		$this->assert_true( $summary['credential_values_redacted'] );
		$this->assert_not_contains( 'staging-team-id', false === $json ? '' : $json );
		$this->assert_not_contains( 'staging-primary-key', false === $json ? '' : $json );
	}

	public function test_factory_builds_http_provider_with_settings_and_injected_transport(): void {
		$captured = array();
		$factory  = new ScryDexProviderFactory(
			array(
				'enabled'           => true,
				'environment'       => 'sandbox',
				'base_url'          => 'https://sandbox.scrydex.example.test',
				'team_id'           => 'sandbox-team-id',
				'secondary_api_key' => 'sandbox-secondary-key',
			),
			static function ( string $method, string $url, array $args ) use ( &$captured ): array {
				$captured = array(
					'method'  => $method,
					'url'     => $url,
					'headers' => $args['headers'],
				);

				return array(
					'status' => 200,
					'body'   => array( 'requests_remaining' => 100 ),
				);
			}
		);

		$result = $factory->provider()->get_usage();
		$body   = $result->body();

		$this->assert_true( $result->is_success() );
		$this->assert_same( 'GET', $captured['method'] );
		$this->assert_contains( '/account/v1/usage', $captured['url'] );
		$this->assert_same( 'sandbox-secondary-key', $captured['headers']['X-Api-Key'] );
		$this->assert_same( 'sandbox-team-id', $captured['headers']['X-Team-ID'] );
		$this->assert_same( 100, $body['requests_remaining'] );
	}

	public function test_provider_reports_not_configured_when_settings_are_missing(): void {
		$result = ( new ScryDexProviderFactory( array() ) )->provider()->get_usage();

		$this->assert_false( $result->is_success() );
		$this->assert_same( ScryDexResult::NOT_CONFIGURED, $result->status() );
		$this->assert_same( 'scrydex_not_configured', $result->error_code() );
	}

	public function test_admin_summary_never_includes_secret_values(): void {
		$summary = ( new ScryDexProviderFactory(
			array(
				'enabled'         => true,
				'environment'     => 'staging',
				'team_id'         => 'staging-team-id',
				'primary_api_key' => 'staging-primary-key',
			)
		) )->admin_summary();

		$this->assert_same( 'ready', $summary['status'] );
		$this->assert_contains( 'active key primary', $summary['value'] );
		$this->assert_not_contains( 'staging-team-id', $summary['value'] );
		$this->assert_not_contains( 'staging-primary-key', $summary['value'] );
	}
}
