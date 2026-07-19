<?php
/**
 * Staging safety tests.
 *
 * @package TCGStorePlatform
 */

namespace TCGStorePlatform\Tests\Unit;

use TCGStorePlatform\Staging\StagingSafety;
use TCGStorePlatform\Tests\TestCase;

final class StagingSafetyTest extends TestCase {
	public function test_staging_safety_blocks_indexing_and_email_with_staff_banner(): void {
		$safety = new StagingSafety(
			static fn (): string => 'staging',
			static fn ( string $capability ): bool => 'view_inventory' === $capability,
			static fn ( string $constant ): mixed => false
		);

		$headers = $safety->filter_noindex_headers( array( 'Content-Type' => 'text/html' ) );
		$summary = $safety->health_summary();

		$this->assert_true( $safety->is_active() );
		$this->assert_true( $safety->blocks_public_indexing() );
		$this->assert_true( $safety->blocks_real_emails() );
		$this->assert_same( 'noindex, nofollow, noarchive', $headers['X-Robots-Tag'] );
		$this->assert_contains( 'noindex,nofollow,noarchive', $safety->noindex_meta_tag() );
		$this->assert_same( "User-agent: *\nDisallow: /\n", $safety->filter_robots_txt( '', true ) );
		$this->assert_same( true, $safety->filter_staging_email( null, array( 'to' => 'customer@example.com' ) ) );
		$this->assert_contains(
			'PUG STAGING',
			$safety->banner_html(
				array(
					'company_name'          => 'Pug Game Shop',
					'company_short_name'    => 'Pug',
					'staging_banner_color'  => '#FACC15',
				)
			)
		);
		$this->assert_true( $summary['public_indexing_blocked'] );
		$this->assert_true( $summary['real_customer_emails_disabled'] );
		$this->assert_true( $summary['production_side_effects_blocked'] );
	}

	public function test_explicit_staging_overrides_allow_sandbox_email_and_indexing_tests(): void {
		$safety = new StagingSafety(
			static fn (): string => 'staging',
			static fn ( string $capability ): bool => 'manage_settings' === $capability,
			static fn ( string $constant ): mixed => in_array(
				$constant,
				array(
					'TCG_STORE_PLATFORM_STAGING_ALLOW_EMAILS',
					'TCG_STORE_PLATFORM_STAGING_ALLOW_INDEXING',
				),
				true
			)
		);

		$headers = $safety->filter_noindex_headers( array() );
		$summary = $safety->health_summary();

		$this->assert_true( $safety->is_active() );
		$this->assert_false( $safety->blocks_public_indexing() );
		$this->assert_false( $safety->blocks_real_emails() );
		$this->assert_false( isset( $headers['X-Robots-Tag'] ) );
		$this->assert_same( '', $safety->noindex_meta_tag() );
		$this->assert_same( "User-agent: *\nAllow: /\n", $safety->filter_robots_txt( "User-agent: *\nAllow: /\n", true ) );
		$this->assert_same( null, $safety->filter_staging_email( null, array( 'to' => 'sandbox@example.test' ) ) );
		$this->assert_true( $summary['explicit_email_override'] );
		$this->assert_true( $summary['explicit_indexing_override'] );
		$this->assert_false( $summary['production_side_effects_blocked'] );
	}

	public function test_production_environment_leaves_safety_controls_inactive(): void {
		$safety = new StagingSafety(
			static fn (): string => 'production',
			static fn ( string $capability ): bool => true,
			static fn ( string $constant ): mixed => false
		);

		$headers = $safety->filter_noindex_headers( array() );
		$summary = $safety->health_summary();

		$this->assert_false( $safety->is_active() );
		$this->assert_false( $safety->blocks_public_indexing() );
		$this->assert_false( $safety->blocks_real_emails() );
		$this->assert_false( isset( $headers['X-Robots-Tag'] ) );
		$this->assert_same( '', $safety->banner_html() );
		$this->assert_same( 'inactive', $summary['status'] );
	}
}
