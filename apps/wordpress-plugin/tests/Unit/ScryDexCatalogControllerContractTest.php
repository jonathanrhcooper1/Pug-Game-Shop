<?php
/**
 * ScryDex catalog controller source contract tests.
 *
 * @package TCGStorePlatform
 */

namespace TCGStorePlatform\Tests\Unit;

use TCGStorePlatform\Tests\TestCase;

final class ScryDexCatalogControllerContractTest extends TestCase {
	public function test_catalog_index_accepts_bounded_expansion_pagination(): void {
		$source = $this->source();

		foreach (
			array(
				'expansions_page',
				'max_expansion_pages',
				'skip_cards',
				'cards_index_requested',
				'continuation_available',
				'next_page',
				'has_more_pages',
				'totalCount',
				'total_count',
				'self::MAX_PAGE_SIZE',
				'self::MAX_PAGES',
			) as $marker
		) {
			$this->assert_contains( $marker, $source );
		}

		$rate_limit_check = strpos( $source, 'scrydex_provider_request_budget_exceeded' );
		$settings_load    = strpos( $source, 'Settings::all()' );

		$this->assert_true( false !== $rate_limit_check );
		$this->assert_true( false !== $settings_load );
		$this->assert_true(
			$rate_limit_check < $settings_load,
			'Expected batch-size rate-limit preflight to run before loading settings or provider readiness.'
		);
	}

	public function test_catalog_index_preflights_usage_and_rate_limit_budget(): void {
		$source = $this->source();

		foreach (
			array(
				'DOCUMENTED_REQUESTS_PER_SECOND_LIMIT',
				'MAX_PROVIDER_REQUESTS_PER_CALL',
				'USAGE_REQUEST_CREDIT_ESTIMATE',
				'planned_catalog_request_count',
				'planned_provider_request_count',
				'rate_limit_plan',
				'documented_requests_per_second_limit',
				'usage_request_credit_estimate_included',
				'usage_budget_plan',
				'plan_provider_request_batch',
				'scrydex_provider_request_batch_exceeds_safe_limit',
				'scrydex_usage_budget_blocked',
			) as $marker
		) {
			$this->assert_contains( $marker, $source );
		}
	}

	public function test_catalog_index_keeps_database_writes_manager_only(): void {
		$source = $this->source();

		foreach (
			array(
				'permission_callback',
				'can_manage_catalog',
				'current_user_can( \'manage_settings\' )',
				'execute_database_writes',
				'scrydex_catalog_write_permission_denied',
				'scrydex_manager_capability_required',
				'write_permission_required',
			) as $marker
		) {
			$this->assert_contains( $marker, $source );
		}

		$permission_check = strpos( $source, 'scrydex_catalog_write_permission_denied' );
		$settings_load    = strpos( $source, 'Settings::all()' );

		$this->assert_true( false !== $permission_check );
		$this->assert_true( false !== $settings_load );
		$this->assert_true(
			$permission_check < $settings_load,
			'Expected write permission to be checked before loading settings or provider readiness.'
		);
	}

	public function test_catalog_index_does_not_expose_credentials_or_raw_provider_bodies(): void {
		$source = $this->source();

		foreach (
			array(
				'credential_values_redacted',
				'credentials_synced_to_client',
				'provider_result_bodies_logged',
				'provider_body_logged',
			) as $marker
		) {
			$this->assert_contains( $marker, $source );
		}

		$this->assert_not_contains( 'primary_api_key', $source );
		$this->assert_not_contains( 'secondary_api_key', $source );
	}

	private function source(): string {
		$path     = dirname( __DIR__, 2 ) . '/src/Api/V1/ScryDexCatalogController.php';
		$contents = file_get_contents( $path );

		if ( false === $contents ) {
			throw new \RuntimeException( 'Unable to read ScryDexCatalogController.php.' );
		}

		return $contents;
	}
}
