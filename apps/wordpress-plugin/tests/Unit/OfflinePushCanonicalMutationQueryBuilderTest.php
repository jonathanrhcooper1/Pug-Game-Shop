<?php
/**
 * Offline push canonical mutation SQL builder tests.
 *
 * @package TCGStorePlatform
 */

namespace TCGStorePlatform\Tests\Unit;

use TCGStorePlatform\Offline\OfflinePushBatchResolver;
use TCGStorePlatform\Offline\OfflinePushCanonicalMutationPlan;
use TCGStorePlatform\Offline\OfflinePushCanonicalMutationPlanner;
use TCGStorePlatform\Offline\OfflinePushCanonicalMutationQueryBuilder;
use TCGStorePlatform\Offline\OfflinePushPayload;
use TCGStorePlatform\Offline\OfflinePushPayloadParser;
use TCGStorePlatform\Tests\TestCase;

final class OfflinePushCanonicalMutationQueryBuilderTest extends TestCase {
	public function test_builder_creates_guarded_canonical_mutation_templates(): void {
		$build   = ( new OfflinePushCanonicalMutationQueryBuilder() )->build( $this->canonical_plan(), 'wp_' );
		$audit   = $build->audit_payload();
		$queries = $build->mutation_queries();

		$this->assert_true( $build->is_valid() );
		$this->assert_same( 3, count( $queries ) );
		$this->assert_same( 'wp_tcg_inventory_items', $build->table_names()['inventory_items'] );
		$this->assert_contains( 'UPDATE `wp_tcg_inventory_items`', $queries[0]['sql_template'] );
		$this->assert_contains( '`row_version` = %d AND `status` = %s', $queries[0]['sql_template'] );
		$this->assert_same(
			array(
				'reserved',
				'2026-06-06 20:00:00.000000',
				5,
				'inv-1001',
				4,
				'available',
			),
			$queries[0]['prepare_args']
		);
		$this->assert_true( $queries[0]['prevent_double_sell_guard'] );
		$this->assert_true( $queries[0]['inventory_write_execution_deferred'] );
		$this->assert_contains( 'FROM `wp_tcg_events`', $queries[1]['sql_template'] );
		$this->assert_same( 'wp_tcg_event_registrations', $queries[1]['registration_table_name'] );
		$this->assert_same( array( 'event-100', 9 ), $queries[1]['prepare_args'] );
		$this->assert_true( $queries[1]['event_registration_write_deferred'] );
		$this->assert_contains( 'FROM `wp_tcg_customers`', $queries[2]['sql_template'] );
		$this->assert_same( 'wp_tcg_customer_credit_ledger', $queries[2]['ledger_table_name'] );
		$this->assert_same( array( 'customer-100', 6 ), $queries[2]['prepare_args'] );
		$this->assert_same( 4500, $queries[2]['amount_minor_units'] );
		$this->assert_true( $queries[2]['customer_credit_ledger_write_deferred'] );
		$this->assert_same( 'offline_push_canonical_mutation_sql_planned', $audit['action'] );
		$this->assert_same( 3, $audit['mutation_query_count'] );
		$this->assert_same( 10, $audit['prepare_arg_count'] );
		$this->assert_true( $audit['canonical_mutation_repository_deferred'] );
		$this->assert_true( $audit['route_connected_writes_deferred'] );
	}

	public function test_builder_accepts_empty_valid_plans_without_queries(): void {
		$build = ( new OfflinePushCanonicalMutationQueryBuilder() )->build( $this->skipped_plan(), 'wp_' );

		$this->assert_true( $build->is_valid() );
		$this->assert_same( array(), $build->mutation_queries() );
		$this->assert_same( 0, $build->audit_payload()['mutation_query_count'] );
	}

	public function test_builder_rejects_tampered_rows_and_table_prefixes(): void {
		$plan  = new OfflinePushCanonicalMutationPlan(
			'batch-main-01',
			'device-main-01',
			'2026-06-06T20:00:00Z',
			array(
				array(
					'batch_id'                       => 'bad id',
					'device_id'                      => 'device-main-01',
					'client_operation_id'            => 'op-inventory-0001',
					'operation_type'                 => 'inventory_reservation',
					'entity_type'                    => 'inventory',
					'entity_id'                      => 'bad entity id',
					'resolution_code'                => 'inventory_reserved',
					'expected_base_row_version'      => -1,
					'planned_at_utc'                 => 'bad',
					'canonical_mutation_deferred'    => false,
					'route_connected_write_deferred' => false,
					'mutation_type'                  => 'inventory_reservation',
					'table_contract'                 => 'tcg_bad',
					'target_status'                  => 'sold',
					'target_row_version'             => 0,
					'prevent_double_sell_guard'      => false,
				),
			),
			array(),
			array(),
			array(),
			array( 'action' => 'fixture' )
		);

		$build = ( new OfflinePushCanonicalMutationQueryBuilder() )->build( $plan, 'wp-bad_' );

		$this->assert_false( $build->is_valid() );
		$this->assert_true( in_array( 'table_prefix_invalid', $build->errors(), true ) );
		$this->assert_true( in_array( 'mutation_row_0_batch_id_invalid', $build->errors(), true ) );
		$this->assert_true( in_array( 'mutation_row_0_entity_id_invalid', $build->errors(), true ) );
		$this->assert_true( in_array( 'mutation_row_0_expected_base_row_version_invalid', $build->errors(), true ) );
		$this->assert_true( in_array( 'mutation_row_0_target_row_version_invalid', $build->errors(), true ) );
		$this->assert_true( in_array( 'mutation_row_0_planned_at_invalid', $build->errors(), true ) );
		$this->assert_true( in_array( 'mutation_row_0_canonical_mutation_deferred_invalid', $build->errors(), true ) );
		$this->assert_true( in_array( 'mutation_row_0_route_connected_write_deferred_invalid', $build->errors(), true ) );
		$this->assert_true( in_array( 'mutation_row_0_table_contract_invalid', $build->errors(), true ) );
		$this->assert_true( in_array( 'mutation_row_0_target_status_invalid', $build->errors(), true ) );
		$this->assert_true( in_array( 'mutation_row_0_prevent_double_sell_guard_invalid', $build->errors(), true ) );
	}

	private function canonical_plan(): \TCGStorePlatform\Offline\OfflinePushCanonicalMutationPlan {
		$payload    = $this->push_payload();
		$resolution = ( new OfflinePushBatchResolver() )->resolve(
			$payload,
			array(
				'op-inventory-0001'       => array(
					'inventory' => array(
						'status'     => 'available',
						'rowVersion' => 4,
					),
				),
				'op-event-0001'           => array(
					'event' => array(
						'seatsRemaining' => 3,
						'rowVersion'     => 9,
					),
				),
				'op-credit-redemption-01' => array(
					'customer' => array(
						'creditBalanceMinorUnits' => 5000,
						'rowVersion'              => 6,
					),
				),
			),
			'2026-06-06T20:00:00Z'
		);

		return ( new OfflinePushCanonicalMutationPlanner() )->plan( $payload, $resolution );
	}

	private function skipped_plan(): \TCGStorePlatform\Offline\OfflinePushCanonicalMutationPlan {
		$payload    = $this->push_payload( array( $this->inventory_operation_payload() ) );
		$resolution = ( new OfflinePushBatchResolver() )->resolve(
			$payload,
			array(
				'op-inventory-0001' => array(
					'inventory' => array(
						'status'     => 'sold',
						'rowVersion' => 4,
					),
				),
			),
			'2026-06-06T20:00:00Z'
		);

		return ( new OfflinePushCanonicalMutationPlanner() )->plan( $payload, $resolution );
	}

	/**
	 * @param list<array<string, mixed>>|null $operations Operation payloads.
	 */
	private function push_payload( ?array $operations = null ): OfflinePushPayload {
		$result = ( new OfflinePushPayloadParser() )->parse(
			array(
				'batch_id'   => 'body-batch-ignored',
				'device_id'  => 'device-main-01',
				'operations' => $operations ?? array(
					$this->inventory_operation_payload(),
					$this->event_operation_payload(),
					$this->credit_operation_payload(),
				),
			),
			'batch-main-01'
		);

		$this->assert_true( $result->is_valid() );

		$payload = $result->payload();
		$this->assert_true( null !== $payload );

		return $payload;
	}

	/**
	 * @return array<string, mixed>
	 */
	private function inventory_operation_payload(): array {
		return array(
			'client_operation_id' => 'op-inventory-0001',
			'device_id'           => 'device-main-01',
			'location_id'         => 3,
			'actor_id'            => 22,
			'operation_type'      => 'inventory_reservation',
			'entity_type'         => 'inventory',
			'entity_id'           => 'inv-1001',
			'base_row_version'    => 4,
			'occurred_at_local'   => '2026-06-06T10:15:00-04:00',
			'queued_at_utc'       => '2026-06-06T14:15:05Z',
			'payload'             => array( 'localStatus' => 'offline_pending_sync' ),
			'schema_version'      => 1,
		);
	}

	/**
	 * @return array<string, mixed>
	 */
	private function event_operation_payload(): array {
		return array(
			'client_operation_id' => 'op-event-0001',
			'device_id'           => 'device-main-01',
			'location_id'         => 3,
			'actor_id'            => 22,
			'operation_type'      => 'event_reservation',
			'entity_type'         => 'event',
			'entity_id'           => 'event-100',
			'base_row_version'    => 9,
			'occurred_at_local'   => '2026-06-06T11:15:00-04:00',
			'queued_at_utc'       => '2026-06-06T15:15:05Z',
			'payload'             => array(),
			'schema_version'      => 1,
		);
	}

	/**
	 * @return array<string, mixed>
	 */
	private function credit_operation_payload(): array {
		return array(
			'client_operation_id' => 'op-credit-redemption-01',
			'device_id'           => 'device-main-01',
			'location_id'         => 3,
			'actor_id'            => 22,
			'operation_type'      => 'credit_redemption',
			'entity_type'         => 'customer_credit',
			'entity_id'           => 'customer-100',
			'base_row_version'    => 6,
			'occurred_at_local'   => '2026-06-06T12:15:00-04:00',
			'queued_at_utc'       => '2026-06-06T16:15:05Z',
			'payload'             => array(
				'amountMinorUnits'        => 4500,
				'cachedBalanceMinorUnits' => 5000,
			),
			'schema_version'      => 1,
		);
	}
}
