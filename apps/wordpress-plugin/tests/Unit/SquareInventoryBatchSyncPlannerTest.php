<?php
/**
 * Square inventory batch sync planner tests.
 *
 * @package TCGStorePlatform
 */

namespace TCGStorePlatform\Tests\Unit;

use TCGStorePlatform\Square\SquareInventoryBatchSyncPlanner;
use TCGStorePlatform\Tests\TestCase;

final class SquareInventoryBatchSyncPlannerTest extends TestCase {
	public function test_batch_plans_multiple_inventory_rows_without_network_writes(): void {
		$plan = ( new SquareInventoryBatchSyncPlanner() )->plan(
			array(
				$this->available_row( 42, 'card-public-42', 'Charizard', 'PKM-BASE-004-HOLO' ),
				$this->available_row( 52, 'card-public-52', 'Blastoise', 'PKM-BASE-002-HOLO' ),
			),
			array(
				'environment'        => 'sandbox',
				'square_location_id' => 'L-SANDBOX-1',
				'occurred_at'        => '2026-06-07T12:00:00Z',
			)
		);

		$this->assert_same( 'ready', $plan['status'] );
		$this->assert_same( 2, $plan['row_count'] );
		$this->assert_same( 2, $plan['ready_count'] );
		$this->assert_same( 0, $plan['skipped_count'] );
		$this->assert_same( 0, $plan['blocked_count'] );
		$this->assert_same( 2, $plan['catalog_request_count'] );
		$this->assert_same( 2, $plan['inventory_request_count'] );
		$this->assert_same( 4, $plan['operation_count'] );
		$this->assert_same( 4, count( $plan['idempotency_keys'] ) );
		$this->assert_true( in_array( 'PKM-BASE-004-HOLO', $plan['external_ids']['skus'], true ) );
		$this->assert_true( in_array( 'PKM-BASE-002-HOLO', $plan['external_ids']['skus'], true ) );
		$this->assert_true( $plan['network_request_deferred'] );
		$this->assert_true( $plan['provider_inventory_write_deferred'] );
		$this->assert_true( $plan['payment_capture_deferred'] );
		$this->assert_same( 'official_woocommerce_square_extension', $plan['payment_capture_authority'] );
		$this->assert_false( $plan['plugin_square_payment_capture_allowed'] );
		$this->assert_same( 'ready', $plan['row_results'][0]['status'] );
		$this->assert_same( 'ready', $plan['row_results'][1]['status'] );
	}

	public function test_hidden_unmapped_batch_is_skipped_without_blocking(): void {
		$row                     = $this->available_row( 77, 'card-public-77', 'Mew', 'PKM-PROMO-151' );
		$row['kiosk_visibility'] = 'hidden';
		$plan                    = ( new SquareInventoryBatchSyncPlanner() )->plan(
			array( $row ),
			array( 'square_location_id' => 'L-SANDBOX-1' )
		);

		$this->assert_same( 'skipped', $plan['status'] );
		$this->assert_same( 0, $plan['ready_count'] );
		$this->assert_same( 1, $plan['skipped_count'] );
		$this->assert_same( 0, $plan['blocked_count'] );
		$this->assert_same( 0, $plan['operation_count'] );
		$this->assert_same( 'skipped', $plan['row_results'][0]['status'] );
		$this->assert_true( in_array( 'kiosk_visibility_not_visible', $plan['configuration_issues'], true ) );
	}

	public function test_batch_blocks_production_context_and_invalid_rows(): void {
		$plan = ( new SquareInventoryBatchSyncPlanner() )->plan(
			array(
				$this->available_row( 42, 'card-public-42', 'Charizard', 'PKM-BASE-004-HOLO' ),
				'invalid-row',
			),
			array(
				'environment'            => 'production',
				'credential_environment' => 'production',
				'access_token'           => 'prod-square-token',
				'square_location_id'     => 'L-PRODUCTION-1',
			)
		);

		$this->assert_same( 'blocked', $plan['status'] );
		$this->assert_same( 0, $plan['ready_count'] );
		$this->assert_same( 0, $plan['skipped_count'] );
		$this->assert_same( 2, $plan['blocked_count'] );
		$this->assert_same( 'blocked', $plan['row_results'][0]['status'] );
		$this->assert_same( 'blocked', $plan['row_results'][1]['status'] );
		$this->assert_true( in_array( 'square_inventory_sync_sandbox_environment_required', $plan['configuration_issues'], true ) );
		$this->assert_true( in_array( 'square_inventory_sync_production_credentials_rejected', $plan['configuration_issues'], true ) );
		$this->assert_true( in_array( 'square_inventory_batch_row_invalid', $plan['configuration_issues'], true ) );
		$this->assert_true( $plan['production_network_request_deferred'] );
		$this->assert_true( $plan['production_provider_write_deferred'] );
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
			'kiosk_visibility'       => 'visible',
			'pos_visibility'         => 'visible',
			'row_version'            => $inventory_id,
		);
	}
}
