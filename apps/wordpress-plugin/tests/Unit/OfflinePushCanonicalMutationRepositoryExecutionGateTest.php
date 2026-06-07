<?php
/**
 * Offline push canonical mutation repository execution gate tests.
 *
 * @package TCGStorePlatform
 */

namespace TCGStorePlatform\Tests\Unit;

use TCGStorePlatform\Offline\OfflinePushCanonicalMutationPlan;
use TCGStorePlatform\Offline\OfflinePushCanonicalMutationQueryBuildPlan;
use TCGStorePlatform\Offline\OfflinePushCanonicalMutationRepository;
use TCGStorePlatform\Offline\OfflinePushCanonicalMutationRepositoryExecutionGate;
use TCGStorePlatform\Tests\TestCase;

final class OfflinePushCanonicalMutationRepositoryExecutionGateTest extends TestCase {
	public function test_gate_blocks_staged_mutations_by_default(): void {
		$repository_result = ( new OfflinePushCanonicalMutationRepository() )->stage( $this->accepted_query_plan() );
		$result            = ( new OfflinePushCanonicalMutationRepositoryExecutionGate() )->evaluate( $repository_result );
		$audit             = $result->audit_payload();

		$this->assert_same( 'blocked', $result->status() );
		$this->assert_true( $result->is_blocked() );
		$this->assert_false( $result->is_ready() );
		$this->assert_false( $result->is_rejected() );
		$this->assert_same( 1, $result->mutation_query_count() );
		$this->assert_same( array( 'op-inventory-0001' ), $result->mutation_operation_ids() );
		$this->assert_same( 6, $result->prepare_arg_count() );
		$this->assert_same( 0, $result->rows_affected() );
		$this->assert_true( in_array( 'canonical_mutation_repository_execution_disabled', $result->block_reasons(), true ) );
		$this->assert_true( in_array( 'explicit_canonical_mutation_execution_required', $result->block_reasons(), true ) );
		$this->assert_true( in_array( 'canonical_mutation_repository_transaction_adapter_deferred', $result->block_reasons(), true ) );
		$this->assert_same( 'offline_push_canonical_mutation_repository_execution_gate', $audit['action'] );
		$this->assert_true( $audit['canonical_mutation_repository_execution_deferred'] );
		$this->assert_true( $audit['canonical_mutation_repository_transaction_deferred'] );
		$this->assert_true( $audit['route_connected_writes_deferred'] );
	}

	public function test_gate_reports_ready_when_execution_and_transaction_adapter_are_explicitly_enabled(): void {
		$repository_result = ( new OfflinePushCanonicalMutationRepository() )->stage( $this->accepted_query_plan() );
		$result            = ( new OfflinePushCanonicalMutationRepositoryExecutionGate( true, true ) )->evaluate( $repository_result );
		$audit             = $result->audit_payload();

		$this->assert_same( 'ready', $result->status() );
		$this->assert_false( $result->is_blocked() );
		$this->assert_true( $result->is_ready() );
		$this->assert_same( array(), $result->block_reasons() );
		$this->assert_same( 1, $result->mutation_query_count() );
		$this->assert_true( $audit['canonical_mutation_repository_execution_deferred'] );
		$this->assert_false( $audit['canonical_mutation_repository_transaction_deferred'] );
	}

	public function test_gate_blocks_empty_plans_without_mutation_queries(): void {
		$repository_result = ( new OfflinePushCanonicalMutationRepository() )->stage( $this->empty_query_plan() );
		$result            = ( new OfflinePushCanonicalMutationRepositoryExecutionGate( true, true ) )->evaluate( $repository_result );

		$this->assert_same( 'blocked', $result->status() );
		$this->assert_same( 0, $result->mutation_query_count() );
		$this->assert_true( in_array( 'canonical_mutation_repository_no_mutation_queries', $result->block_reasons(), true ) );
	}

	public function test_gate_rejects_failed_repository_staging(): void {
		$repository_result = ( new OfflinePushCanonicalMutationRepository() )->stage( $this->rejected_query_plan() );
		$result            = ( new OfflinePushCanonicalMutationRepositoryExecutionGate( true, true ) )->evaluate( $repository_result );
		$audit             = $result->audit_payload();

		$this->assert_same( 'rejected', $result->status() );
		$this->assert_true( $result->is_rejected() );
		$this->assert_same( 0, $result->mutation_query_count() );
		$this->assert_true( in_array( 'canonical_mutation_repository_staging_rejected', $result->errors(), true ) );
		$this->assert_true( in_array( 'fixture_query_rejected', $result->errors(), true ) );
		$this->assert_same( 'rejected', $audit['status'] );
		$this->assert_true( $audit['is_rejected'] );
	}

	private function accepted_query_plan(): OfflinePushCanonicalMutationQueryBuildPlan {
		return OfflinePushCanonicalMutationQueryBuildPlan::accepted(
			$this->canonical_plan(),
			array(
				'inventory_items'        => 'wp_tcg_inventory_items',
				'events'                 => 'wp_tcg_events',
				'event_registrations'    => 'wp_tcg_event_registrations',
				'customers'              => 'wp_tcg_customers',
				'customer_credit_ledger' => 'wp_tcg_customer_credit_ledger',
			),
			array(
				array(
					'client_operation_id'                => 'op-inventory-0001',
					'mutation_type'                      => 'inventory_reservation',
					'query_kind'                         => 'inventory_status_guarded_update',
					'table_name'                         => 'wp_tcg_inventory_items',
					'sql_template'                       => 'UPDATE `wp_tcg_inventory_items` SET `status` = %s, `updated_at` = %s, `row_version` = %d WHERE `public_id` = %s AND `row_version` = %d AND `status` = %s LIMIT 1',
					'prepare_args'                       => array(
						'reserved',
						'2026-06-06 20:00:00.000000',
						5,
						'inv-1001',
						4,
						'available',
					),
					'prevent_double_sell_guard'          => true,
					'inventory_write_execution_deferred' => true,
					'route_connected_writes_deferred'    => true,
				),
			)
		);
	}

	private function empty_query_plan(): OfflinePushCanonicalMutationQueryBuildPlan {
		return OfflinePushCanonicalMutationQueryBuildPlan::accepted(
			$this->canonical_plan(),
			array(),
			array()
		);
	}

	private function rejected_query_plan(): OfflinePushCanonicalMutationQueryBuildPlan {
		return OfflinePushCanonicalMutationQueryBuildPlan::rejected(
			$this->canonical_plan(),
			array(),
			array( 'fixture_query_rejected' )
		);
	}

	private function canonical_plan(): OfflinePushCanonicalMutationPlan {
		return new OfflinePushCanonicalMutationPlan(
			'batch-main-01',
			'device-main-01',
			'2026-06-06T20:00:00Z',
			array(),
			array(),
			array(),
			array(
				'mutation_count' => 0,
			),
			array(
				'action' => 'fixture_canonical_plan',
			)
		);
	}
}
