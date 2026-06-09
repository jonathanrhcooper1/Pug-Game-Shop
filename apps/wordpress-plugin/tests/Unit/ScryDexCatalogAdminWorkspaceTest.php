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
				'wp_create_nonce( \'wp_rest\' )',
			) as $marker
		) {
			$this->assert_contains( $marker, $source );
		}
	}

	public function test_catalog_import_controls_are_bounded_and_manager_only(): void {
		$source = $this->source();

		foreach (
			array(
				'current_user_can( \'manage_settings\' )',
				'data-can-index',
				'page_size',
				'max_pages',
				'expansions_page',
				'max_expansion_pages',
				'execute_database_writes',
				'index_expansions',
				'Running ScryDex batch',
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
