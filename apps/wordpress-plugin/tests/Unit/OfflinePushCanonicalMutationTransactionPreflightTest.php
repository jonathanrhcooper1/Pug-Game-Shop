<?php
/**
 * Offline push canonical mutation transaction preflight tests.
 *
 * @package TCGStorePlatform
 */

namespace TCGStorePlatform\Tests\Unit;

use TCGStorePlatform\Offline\OfflinePushCanonicalMutationPlan;
use TCGStorePlatform\Offline\OfflinePushCanonicalMutationQueryBuildPlan;
use TCGStorePlatform\Offline\OfflinePushCanonicalMutationRepository;
use TCGStorePlatform\Offline\OfflinePushCanonicalMutationRepositoryExecutionGate;
use TCGStorePlatform\Offline\OfflinePushCanonicalMutationTransactionPreflight;
use TCGStorePlatform\Tests\TestCase;

final class OfflinePushCanonicalMutationTransactionPreflightTest extends TestCase {
	public function test_preflight_inherits_default_execution_gate_blocks(): void {
		$repository_result = ( new OfflinePushCanonicalMutationRepository() )->stage( $this->query_plan( array( $this->inventory_query() ) ) );
		$execution_result  = ( new OfflinePushCanonicalMutationRepositoryExecutionGate() )->evaluate( $repository_result );
		$result            = ( new OfflinePushCanonicalMutationTransactionPreflight() )->evaluate( $repository_result, $execution_result );
		$audit             = $result->audit_payload();

		$this->assert_same( 'blocked', $result->status() );
		$this->assert_true( $result->is_blocked() );
		$this->assert_false( $result->is_ready() );
		$this->assert_same( 1, $result->mutation_query_count() );
		$this->assert_same( 1, $result->ready_mutation_count() );
		$this->assert_same( 0, $result->blocked_mutation_count() );
		$this->assert_same( array( 'op-inventory-0001' ), $result->mutation_operation_ids() );
		$this->assert_true( in_array( 'canonical_mutation_repository_execution_disabled', $result->block_reasons(), true ) );
		$this->assert_same( 'offline_push_canonical_mutation_transaction_preflight', $audit['action'] );
		$this->assert_same( 'ready', $audit['mutation_preflights'][0]['preflight_status'] );
		$this->assert_true( $audit['transaction_execution_deferred'] );
	}

	public function test_preflight_reports_ready_for_inventory_when_gate_is_open(): void {
		$repository_result = ( new OfflinePushCanonicalMutationRepository() )->stage( $this->query_plan( array( $this->inventory_query() ) ) );
		$execution_result  = ( new OfflinePushCanonicalMutationRepositoryExecutionGate( true, true ) )->evaluate( $repository_result );
		$result            = ( new OfflinePushCanonicalMutationTransactionPreflight() )->evaluate( $repository_result, $execution_result );

		$this->assert_same( 'ready', $result->status() );
		$this->assert_true( $result->is_ready() );
		$this->assert_same( array(), $result->block_reasons() );
		$this->assert_same( 1, $result->ready_mutation_count() );
		$this->assert_same( 0, $result->blocked_mutation_count() );
	}

	public function test_preflight_blocks_event_and_credit_queries_until_write_plans_exist(): void {
		$repository_result = ( new OfflinePushCanonicalMutationRepository() )->stage(
			$this->query_plan(
				array(
					$this->event_query(),
					$this->credit_query(),
				)
			)
		);
		$execution_result  = ( new OfflinePushCanonicalMutationRepositoryExecutionGate( true, true ) )->evaluate( $repository_result );
		$result            = ( new OfflinePushCanonicalMutationTransactionPreflight() )->evaluate( $repository_result, $execution_result );

		$this->assert_same( 'blocked', $result->status() );
		$this->assert_same( 0, $result->ready_mutation_count() );
		$this->assert_same( 2, $result->blocked_mutation_count() );
		$this->assert_true( in_array( 'event_registration_write_plan_deferred', $result->block_reasons(), true ) );
		$this->assert_true( in_array( 'customer_credit_ledger_write_plan_deferred', $result->block_reasons(), true ) );
	}

	public function test_preflight_rejects_failed_repository_staging(): void {
		$repository_result = ( new OfflinePushCanonicalMutationRepository() )->stage( $this->rejected_query_plan() );
		$execution_result  = ( new OfflinePushCanonicalMutationRepositoryExecutionGate( true, true ) )->evaluate( $repository_result );
		$result            = ( new OfflinePushCanonicalMutationTransactionPreflight() )->evaluate( $repository_result, $execution_result );

		$this->assert_same( 'rejected', $result->status() );
		$this->assert_true( $result->is_rejected() );
		$this->assert_true( in_array( 'fixture_query_rejected', $result->errors(), true ) );
		$this->assert_true( in_array( 'canonical_mutation_transaction_preflight_rejected', $result->errors(), true ) );
	}

	/**
	 * @param list<array<string, mixed>> $queries Canonical mutation query templates.
	 */
	private function query_plan( array $queries ): OfflinePushCanonicalMutationQueryBuildPlan {
		return OfflinePushCanonicalMutationQueryBuildPlan::accepted(
			$this->canonical_plan(),
			array(
				'inventory_items'        => 'wp_tcg_inventory_items',
				'events'                 => 'wp_tcg_events',
				'event_registrations'    => 'wp_tcg_event_registrations',
				'customers'              => 'wp_tcg_customers',
				'customer_credit_ledger' => 'wp_tcg_customer_credit_ledger',
			),
			$queries
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
			array( 'mutation_count' => 0 ),
			array( 'action' => 'fixture_canonical_plan' )
		);
	}

	/**
	 * @return array<string, mixed>
	 */
	private function inventory_query(): array {
		return array(
			'client_operation_id' => 'op-inventory-0001',
			'mutation_type'       => 'inventory_reservation',
			'query_kind'          => 'inventory_status_guarded_update',
			'prepare_args'        => array( 'reserved', '2026-06-06 20:00:00.000000', 5, 'inv-1001', 4, 'available' ),
		);
	}

	/**
	 * @return array<string, mixed>
	 */
	private function event_query(): array {
		return array(
			'client_operation_id' => 'op-event-0001',
			'mutation_type'       => 'event_registration',
			'query_kind'          => 'event_registration_guard_lookup',
			'prepare_args'        => array( 'event-100', 9 ),
		);
	}

	/**
	 * @return array<string, mixed>
	 */
	private function credit_query(): array {
		return array(
			'client_operation_id' => 'op-credit-redemption-01',
			'mutation_type'       => 'customer_credit_redemption',
			'query_kind'          => 'customer_credit_guard_lookup',
			'prepare_args'        => array( 'customer-100', 6 ),
		);
	}
}
