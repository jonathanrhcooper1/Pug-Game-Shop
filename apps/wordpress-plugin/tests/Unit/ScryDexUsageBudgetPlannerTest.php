<?php
/**
 * ScryDex usage budget planner tests.
 *
 * @package TCGStorePlatform
 */

namespace TCGStorePlatform\Tests\Unit;

use TCGStorePlatform\ScryDex\ScryDexUsageBudgetPlanner;
use TCGStorePlatform\Tests\TestCase;

final class ScryDexUsageBudgetPlannerTest extends TestCase {
	public function test_default_budget_plan_is_blocked_without_configuration(): void {
		$plan = ( new ScryDexUsageBudgetPlanner( array() ) )->plan_cards_page();

		$this->assert_same( 'blocked', $plan['status'] );
		$this->assert_false( $plan['budget_configured'] );
		$this->assert_true( $plan['provider_usage_requests_deferred'] );
		$this->assert_true( $plan['network_requests_deferred'] );
		$this->assert_true( in_array( 'scrydex_usage_budget_not_configured', $plan['block_reasons'], true ) );
		$this->assert_same( 'get_usage', $plan['provider_method'] );
		$this->assert_same( '/account/v1/usage', $plan['provider_endpoint'] );
		$this->assert_same( 'pokemon', $plan['request']['resource_key'] );
	}

	public function test_configured_budget_allows_worker_planning_without_fetching_usage(): void {
		$plan = ( new ScryDexUsageBudgetPlanner(
			$this->configured_settings()
		) )->plan_cards_page(
			array(
				'resource_key' => 'magic',
				'page'         => 2,
				'page_size'    => 500,
			)
		);

		$this->assert_same( 'ready', $plan['status'] );
		$this->assert_true( $plan['budget_configured'] );
		$this->assert_false( $plan['usage_snapshot_provided'] );
		$this->assert_true( $plan['usage_snapshot_required'] );
		$this->assert_true( $plan['provider_usage_requests_deferred'] );
		$this->assert_same( 5, $plan['estimated_credit_cost'] );
		$this->assert_same( 'magic', $plan['request']['resource_key'] );
		$this->assert_same( 100, $plan['request']['page_size'] );
		$this->assert_same( array(), $plan['block_reasons'] );
	}

	public function test_usage_snapshot_blocks_when_budget_would_be_exceeded(): void {
		$plan = ( new ScryDexUsageBudgetPlanner(
			$this->configured_settings()
		) )->plan_cards_page(
			array(),
			array(
				'used_today'        => 998,
				'remaining_credits' => 90,
			)
		);

		$this->assert_same( 'blocked', $plan['status'] );
		$this->assert_true( $plan['usage_snapshot_provided'] );
		$this->assert_same( 85, $plan['remaining_after_estimate'] );
		$this->assert_true( in_array( 'scrydex_daily_credit_budget_exceeded', $plan['block_reasons'], true ) );
		$this->assert_true( in_array( 'scrydex_remaining_credit_floor_reached', $plan['block_reasons'], true ) );
	}

	public function test_provider_request_batch_multiplies_estimated_credit_cost(): void {
		$plan = ( new ScryDexUsageBudgetPlanner(
			$this->configured_settings()
		) )->plan_provider_request_batch(
			array(
				'resource_type'                  => 'catalog_import',
				'resource_key'                   => 'pokemon',
				'page_size'                      => 100,
				'planned_provider_request_count' => 9,
			),
			array(
				'used_today'        => 960,
				'remaining_credits' => 500,
			),
			9
		);

		$this->assert_same( 'blocked', $plan['status'] );
		$this->assert_same( 9, $plan['planned_provider_request_count'] );
		$this->assert_same( 9, $plan['request']['planned_provider_request_count'] );
		$this->assert_same( 5, $plan['estimated_credit_cost_per_request'] );
		$this->assert_same( 45, $plan['estimated_credit_cost'] );
		$this->assert_same( 455, $plan['remaining_after_estimate'] );
		$this->assert_true( in_array( 'scrydex_daily_credit_budget_exceeded', $plan['block_reasons'], true ) );
	}

	/**
	 * @return array<string, mixed>
	 */
	private function configured_settings(): array {
		return array(
			'scrydex_usage_budget' => array(
				'enabled'                        => true,
				'daily_credit_budget'            => 1000,
				'minimum_remaining_credits'      => 100,
				'per_cards_page_credit_estimate' => 5,
			),
		);
	}
}
