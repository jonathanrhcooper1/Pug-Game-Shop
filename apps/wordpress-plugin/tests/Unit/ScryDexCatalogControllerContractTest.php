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
