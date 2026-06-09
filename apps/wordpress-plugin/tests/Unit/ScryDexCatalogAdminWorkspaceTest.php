<?php
/**
 * ScryDex catalog admin workspace contract tests.
 *
 * @package TCGStorePlatform
 */

namespace TCGStorePlatform\Tests\Unit;

use TCGStorePlatform\Tests\TestCase;

final class ScryDexCatalogAdminWorkspaceTest extends TestCase {
	public function test_admin_menu_exposes_scrydex_catalog_workspace(): void {
		$source = $this->source();

		foreach (
			array(
				'tcg-store-platform-scrydex-catalog',
				'render_scrydex_catalog',
				'ScryDex Catalog',
				'tcg-store/v1/scrydex/catalog/status',
				'tcg-store/v1/scrydex/catalog/index',
				'tcg-store/v1/scrydex/catalog/export',
				'wp_create_nonce( \'wp_rest\' )',
			) as $marker
		) {
			$this->assert_contains( $marker, $source );
		}
	}

	public function test_catalog_import_controls_run_full_game_index_and_export_manager_only(): void {
		$source = $this->source();

		foreach (
			array(
				'current_user_can( \'manage_settings\' )',
				'data-can-index',
				'page_size',
				'games[]',
				'execute_database_writes',
				'index_expansions',
				'Full Game Index',
				'Start Full ScryDex Index',
				'selectedGames',
				'loadExpansionIds',
				'indexCardsForExpansion',
				'Promise.allSettled',
				'continuation_checkpoint_row',
				'returns fewer than',
				'Catalog Export',
				'tcg-store-scrydex-catalog-browser',
				'data-export-endpoint',
				'Download Full Catalog JSON',
				'Catalog Integrity',
				'integrityTable',
				'image_coverage_percent',
				'variant_coverage_percent',
				'price_coverage_percent',
				'Latest Imported Cards',
				'has_price_points',
			) as $marker
		) {
			$this->assert_contains( $marker, $source );
		}
	}

	public function test_admin_workspace_does_not_render_secret_fields(): void {
		$source = $this->source();

		$this->assert_not_contains( 'primary_api_key', $source );
		$this->assert_not_contains( 'secondary_api_key', $source );
		$this->assert_not_contains( 'X-Api-Key', $source );
		$this->assert_not_contains( 'X-Team-ID', $source );
	}

	private function source(): string {
		$path     = dirname( __DIR__, 2 ) . '/src/Admin/AdminMenu.php';
		$contents = file_get_contents( $path );

		if ( false === $contents ) {
			throw new \RuntimeException( 'Unable to read AdminMenu.php.' );
		}

		return $contents;
	}
}
