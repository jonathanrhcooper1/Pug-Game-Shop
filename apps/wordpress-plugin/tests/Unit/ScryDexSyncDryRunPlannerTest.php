<?php
/**
 * ScryDex sync dry-run planner tests.
 *
 * @package TCGStorePlatform
 */

namespace TCGStorePlatform\Tests\Unit;

use TCGStorePlatform\ScryDex\ScryDexProviderFactory;
use TCGStorePlatform\ScryDex\ScryDexSyncDryRunPlanner;
use TCGStorePlatform\Tests\TestCase;

final class ScryDexSyncDryRunPlannerTest extends TestCase {
	public function test_default_dry_run_is_blocked_but_plans_first_cards_page(): void {
		$plan = ( new ScryDexSyncDryRunPlanner(
			new ScryDexProviderFactory( array() )
		) )->plan_cards_sync();

		$this->assert_same( 'blocked', $plan['status'] );
		$this->assert_true( $plan['dry_run'] );
		$this->assert_false( $plan['provider_ready'] );
		$this->assert_same( 'search_cards', $plan['provider_method'] );
		$this->assert_same( '/pokemon/v1/cards', $plan['provider_endpoint'] );
		$this->assert_same( 'scrydex', $plan['request']['provider'] );
		$this->assert_same( 'cards', $plan['request']['resource_type'] );
		$this->assert_same( 'pokemon', $plan['request']['resource_key'] );
		$this->assert_same( 1, $plan['request']['page'] );
		$this->assert_same( '', $plan['request']['cursor'] );
		$this->assert_same( 100, $plan['request']['page_size'] );
		$this->assert_true( $plan['network_requests_deferred'] );
		$this->assert_true( $plan['database_writes_deferred'] );
		$this->assert_true( $plan['scheduled_workers_deferred'] );
		$this->assert_true( $plan['image_downloads_deferred'] );
	}

	public function test_configured_dry_run_is_ready_and_secret_free(): void {
		$plan = ( new ScryDexSyncDryRunPlanner(
			new ScryDexProviderFactory(
				array(
					'scrydex_provider' => array(
						'enabled'         => true,
						'environment'     => 'staging',
						'team_id'         => 'staging-team-id',
						'primary_api_key' => 'staging-primary-key',
					),
				)
			)
		) )->plan_cards_sync(
			array(
				'game'      => 'LORCANA',
				'page_size' => 500,
			)
		);
		$json = json_encode( $plan );

		$this->assert_same( 'ready', $plan['status'] );
		$this->assert_true( $plan['provider_ready'] );
		$this->assert_true( $plan['provider_context_ready'] );
		$this->assert_true( $plan['credential_values_redacted'] );
		$this->assert_same( 'lorcana', $plan['request']['resource_key'] );
		$this->assert_same( 100, $plan['request']['page_size'] );
		$this->assert_same( array(), $plan['configuration_issues'] );
		$this->assert_not_contains( 'staging-team-id', false === $json ? '' : $json );
		$this->assert_not_contains( 'staging-primary-key', false === $json ? '' : $json );
	}

	public function test_dry_run_uses_checkpoint_resume_cursor(): void {
		$plan = ( new ScryDexSyncDryRunPlanner(
			new ScryDexProviderFactory(
				array(
					'enabled'           => true,
					'environment'       => 'sandbox',
					'team_id'           => 'sandbox-team-id',
					'secondary_api_key' => 'sandbox-secondary-key',
				)
			)
		) )->plan_cards_sync(
			array(
				'game'       => 'pokemon',
				'page_size'  => 50,
				'checkpoint' => array(
					'sync_job_id'     => 42,
					'resource_type'   => 'cards',
					'resource_key'    => 'pokemon',
					'page_number'     => 3,
					'cursor_value'    => 'cursor-page-4',
					'high_water_mark' => '2026-06-07T10:00:00Z',
					'payload_hash'    => str_repeat( 'a', 64 ),
					'committed_count' => 750,
				),
			)
		);

		$this->assert_same( 'ready', $plan['status'] );
		$this->assert_same( 4, $plan['request']['page'] );
		$this->assert_same( 'cursor-page-4', $plan['request']['cursor'] );
		$this->assert_same( 50, $plan['request']['page_size'] );
		$this->assert_same( 42, $plan['checkpoint_row']['sync_job_id'] );
		$this->assert_same( 750, $plan['checkpoint_row']['committed_count'] );
	}

	public function test_dry_run_preserves_provider_expansion_ids_for_scoped_card_pages(): void {
		$plan = ( new ScryDexSyncDryRunPlanner(
			new ScryDexProviderFactory(
				array(
					'scrydex_provider' => array(
						'enabled'         => true,
						'environment'     => 'production',
						'team_id'         => 'production-team-id',
						'primary_api_key' => 'production-primary-key',
					),
				)
			)
		) )->plan_cards_sync(
			array(
				'game'         => 'riftbound',
				'expansion_id' => 'OGN-001',
				'page_size'    => 100,
			)
		);

		$this->assert_same( 'ready', $plan['status'] );
		$this->assert_same( 'search_expansion_cards', $plan['provider_method'] );
		$this->assert_same( '/riftbound/v1/expansions/OGN-001/cards', $plan['provider_endpoint'] );
		$this->assert_same( 'riftbound:OGN-001', $plan['checkpoint_row']['resource_key'] );
		$this->assert_same( 'OGN-001', $plan['request']['expansion_id'] );
	}

	public function test_invalid_game_and_checkpoint_fall_back_to_safe_defaults(): void {
		$plan = ( new ScryDexSyncDryRunPlanner(
			new ScryDexProviderFactory( array() )
		) )->plan_cards_sync(
			array(
				'game'       => '../bad',
				'page_size'  => 0,
				'checkpoint' => array(
					'resource_type' => 'prices',
					'resource_key'  => 'magic',
					'page_number'   => 9,
				),
			)
		);

		$this->assert_same( 'pokemon', $plan['request']['resource_key'] );
		$this->assert_same( 1, $plan['request']['page'] );
		$this->assert_same( 1, $plan['request']['page_size'] );
		$this->assert_same( 'pokemon', $plan['checkpoint_row']['resource_key'] );
	}
}
