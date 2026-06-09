<?php
/**
 * ScryDex catalog controller source contract tests.
 *
 * @package TCGStorePlatform
 */

namespace TCGStorePlatform\Tests\Unit;

use TCGStorePlatform\Tests\TestCase;

final class ScryDexCatalogControllerContractTest extends TestCase {
	public function test_catalog_index_supports_expansion_first_auto_pagination(): void {
		$source = $this->source();

		foreach (
			array(
				'expansions_page',
				'max_expansion_pages',
				'skip_cards',
				'checkpoint',
				'cards_index_requested',
				'continuation_available',
				'next_page',
				'provider_set_ids',
				'short_page_reached',
				'has_more_pages',
				'unbounded_page_count',
				'totalCount',
				'total_count',
				'self::MAX_PAGE_SIZE',
			) as $marker
		) {
			$this->assert_contains( $marker, $source );
		}
	}

	public function test_catalog_index_uses_enterprise_usage_policy_without_daily_plugin_cap(): void {
		$source = $this->source();

		foreach (
			array(
				'DOCUMENTED_REQUESTS_PER_SECOND_LIMIT',
				'USAGE_REQUEST_CREDIT_ESTIMATE',
				'planned_catalog_request_count',
				'planned_provider_request_count',
				'rate_limit_plan',
				'informational',
				'documented_requests_per_second_limit',
				'usage_request_credit_estimate_included',
				'short_page_completion_rule',
				'usage_budget_plan',
				'enterprise_usage_budget_plan',
				'daily_credit_budget_enforced',
				'enterprise_overage_allowed',
			) as $marker
		) {
			$this->assert_contains( $marker, $source );
		}
	}

	public function test_catalog_export_route_is_manager_only_and_paginated(): void {
		$source = $this->source();

		foreach (
			array(
				'/scrydex/catalog/export',
				'MAX_EXPORT_PAGE_SIZE',
				'EXPORT_TABLES',
				'public function export',
				'scrydex_catalog_export',
				'has_more',
				'allowed_tables',
				'credential_values_redacted',
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
