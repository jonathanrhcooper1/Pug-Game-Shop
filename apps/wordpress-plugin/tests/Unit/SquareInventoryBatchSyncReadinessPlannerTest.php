<?php
/**
 * Square inventory batch sync readiness planner tests.
 *
 * @package TCGStorePlatform
 */

namespace TCGStorePlatform\Tests\Unit;

use TCGStorePlatform\Square\SquareInventoryBatchSyncReadinessPlanner;
use TCGStorePlatform\Tests\TestCase;

final class SquareInventoryBatchSyncReadinessPlannerTest extends TestCase {
	public function test_default_probe_reports_ready_batch_planning_without_network_writes(): void {
		$plan = ( new SquareInventoryBatchSyncReadinessPlanner() )->plan();

		$this->assert_same( 'ready', $plan['status'] );
		$this->assert_true( $plan['batch_sync_planning_ready'] );
		$this->assert_true( $plan['batch_planner_ready'] );
		$this->assert_true( $plan['probe_inventory_rows_used'] );
		$this->assert_same( 2, $plan['probe_row_count'] );
		$this->assert_same( 'sandbox', $plan['environment'] );
		$this->assert_same( 'ready', $plan['batch_status'] );
		$this->assert_same( 2, $plan['row_count'] );
		$this->assert_same( 2, $plan['ready_count'] );
		$this->assert_same( 0, $plan['blocked_count'] );
		$this->assert_same( 2, $plan['catalog_request_count'] );
		$this->assert_same( 2, $plan['inventory_request_count'] );
		$this->assert_same( 4, $plan['operation_count'] );
		$this->assert_same( 4, $plan['idempotency_key_count'] );
		$this->assert_true( in_array( 'SQUARE-BATCH-PROBE-004', $plan['external_ids']['skus'], true ) );
		$this->assert_true( $plan['network_request_deferred'] );
		$this->assert_true( $plan['provider_inventory_write_deferred'] );
		$this->assert_true( $plan['payment_capture_deferred'] );
		$this->assert_same( 'official_woocommerce_square_extension', $plan['payment_capture_authority'] );
		$this->assert_false( $plan['plugin_square_payment_capture_allowed'] );
		$this->assert_same( 'ready', $plan['batch_plan']['status'] );
		$this->assert_same( 'ready', $plan['row_results'][0]['status'] );
	}

	public function test_production_context_blocks_batch_readiness(): void {
		$plan = ( new SquareInventoryBatchSyncReadinessPlanner() )->plan(
			array(
				'environment'            => 'production',
				'credential_environment' => 'production',
				'access_token'           => 'prod-square-token',
				'square_location_id'     => 'L-PRODUCTION-1',
			)
		);

		$this->assert_same( 'blocked', $plan['status'] );
		$this->assert_false( $plan['batch_sync_planning_ready'] );
		$this->assert_same( 0, $plan['ready_count'] );
		$this->assert_same( 2, $plan['blocked_count'] );
		$this->assert_true( in_array( 'square_inventory_batch_sync_planning_not_ready', $plan['block_reasons'], true ) );
		$this->assert_true( in_array( 'square_inventory_sync_sandbox_environment_required', $plan['configuration_issues'], true ) );
		$this->assert_true( in_array( 'square_inventory_sync_production_credentials_rejected', $plan['configuration_issues'], true ) );
		$this->assert_true( $plan['production_network_request_deferred'] );
		$this->assert_true( $plan['production_provider_write_deferred'] );
		$this->assert_true( $plan['payment_capture_deferred'] );
	}

	public function test_supplied_inventory_rows_are_reported_without_probe_rows(): void {
		$plan = ( new SquareInventoryBatchSyncReadinessPlanner() )->plan(
			array(
				'environment'        => 'sandbox',
				'square_location_id' => 'L-SANDBOX-1',
			),
			array(
				$this->available_row( 42, 'card-public-42', 'Charizard', 'PKM-BASE-004-HOLO' ),
			)
		);

		$this->assert_same( 'ready', $plan['status'] );
		$this->assert_false( $plan['probe_inventory_rows_used'] );
		$this->assert_same( 1, $plan['probe_row_count'] );
		$this->assert_same( 1, $plan['row_count'] );
		$this->assert_same( 1, $plan['ready_count'] );
		$this->assert_same( 2, $plan['operation_count'] );
		$this->assert_true( in_array( 'PKM-BASE-004-HOLO', $plan['external_ids']['skus'], true ) );
		$this->assert_same( 'card-public-42', $plan['row_results'][0]['public_id'] );
	}

	public function test_admin_summary_reports_ready_and_blocked_batch_states(): void {
		$planner = new SquareInventoryBatchSyncReadinessPlanner();
		$ready   = $planner->admin_summary();

		$this->assert_same( 'ok', $ready['status'] );
		$this->assert_contains( 'sandbox batch ready', $ready['value'] );
		$this->assert_contains( '2 rows', $ready['value'] );
		$this->assert_contains( '4 Square operation plans', $ready['value'] );
		$this->assert_contains( 'payments delegated', $ready['value'] );

		$blocked = $planner->admin_summary(
			array(
				'environment'            => 'production',
				'credential_environment' => 'production',
				'access_token'           => 'prod-square-token',
			)
		);

		$this->assert_same( 'blocked', $blocked['status'] );
		$this->assert_contains( 'batch inventory sync blocked', $blocked['value'] );
		$this->assert_contains( 'square_inventory_sync_sandbox_environment_required', $blocked['value'] );
		$this->assert_contains( 'square_inventory_sync_production_credentials_rejected', $blocked['value'] );
	}

	/**
	 * @return array<string, mixed>
	 */
	private function available_row( int $inventory_id, string $public_id, string $card_name, string $sku ): array {
		return array(
			'inventory_id'           => $inventory_id,
			'public_id'              => $public_id,
			'game'                   => 'pokemon',
			'card_name'              => $card_name,
			'set_name'               => 'Base Set',
			'set_code'               => 'BASE',
			'card_number'            => (string) $inventory_id,
			'rarity'                 => 'Rare Holo',
			'finish'                 => 'Holo',
			'condition_code'         => 'NM',
			'raw_or_graded'          => 'raw',
			'barcode'                => $sku,
			'sku'                    => $sku,
			'sale_price_minor_units' => 12500,
			'sale_currency'          => 'USD',
			'status'                 => 'available',
			'pos_visibility'         => 'visible',
			'row_version'            => $inventory_id,
		);
	}
}
