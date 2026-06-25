<?php
/**
 * Offline push canonical mutation transaction executor tests.
 *
 * @package TCGStorePlatform
 */

namespace {
	if ( ! class_exists( 'wpdb' ) ) {
		class wpdb {
			public string $prefix = 'wp_';
		}
	}

	if ( ! class_exists( 'OfflinePushCanonicalMutationTransactionExecutorWpdb' ) ) {
		class OfflinePushCanonicalMutationTransactionExecutorWpdb extends \wpdb {
			public string $prefix = 'wp_';
			public int $prepare_count = 0;
			public int $query_count = 0;

			/**
			 * @var list<string>
			 */
			public array $queries = array();

			/**
			 * @var list<string>
			 */
			public array $prepare_queries = array();

			/**
			 * @param list<int|false> $query_results Query return values.
			 */
			public function __construct(
				private array $query_results = array()
			) {
			}

			/**
			 * @param list<mixed> $args Prepared arguments.
			 */
			public function prepare( string $query, array $args ): string {
				unset( $args );

				++$this->prepare_count;
				$this->prepare_queries[] = $query;

				return 'prepared:' . $query;
			}

			public function query( string $query ): int|false {
				++$this->query_count;
				$this->queries[] = $query;

				if ( array() === $this->query_results ) {
					return 1;
				}

				return array_shift( $this->query_results );
			}
		}
	}
}

namespace TCGStorePlatform\Tests\Unit {

use TCGStorePlatform\Offline\OfflinePushCanonicalMutationPlan;
use TCGStorePlatform\Offline\OfflinePushCanonicalMutationQueryBuildPlan;
use TCGStorePlatform\Offline\OfflinePushCanonicalMutationRepository;
use TCGStorePlatform\Offline\OfflinePushCanonicalMutationRepositoryExecutionGate;
use TCGStorePlatform\Offline\OfflinePushCanonicalMutationTransactionExecutor;
use TCGStorePlatform\Offline\OfflinePushCanonicalMutationTransactionPreflight;
use TCGStorePlatform\Tests\TestCase;

final class OfflinePushCanonicalMutationTransactionExecutorTest extends TestCase {
	public function test_executor_blocks_when_preflight_is_not_ready(): void {
		$query_plan       = $this->query_plan( array( $this->inventory_query() ) );
		$repository_result = ( new OfflinePushCanonicalMutationRepository() )->stage( $query_plan );
		$execution_result = ( new OfflinePushCanonicalMutationRepositoryExecutionGate() )->evaluate( $repository_result );
		$preflight_result = ( new OfflinePushCanonicalMutationTransactionPreflight() )->evaluate(
			$repository_result,
			$execution_result
		);
		$database         = new \OfflinePushCanonicalMutationTransactionExecutorWpdb();
		$result           = ( new OfflinePushCanonicalMutationTransactionExecutor( $database ) )->execute(
			$query_plan,
			$preflight_result
		);
		$audit            = $result->audit_payload();

		$this->assert_same( 'blocked', $result->status() );
		$this->assert_true( $result->is_blocked() );
		$this->assert_false( $result->is_executed() );
		$this->assert_true(
			in_array(
				'canonical_mutation_transaction_preflight_not_ready',
				$result->block_reasons(),
				true
			)
		);
		$this->assert_same( 0, $database->query_count );
		$this->assert_same( 'offline_push_canonical_mutation_transaction_execution', $audit['action'] );
		$this->assert_true( $audit['inventory_write_execution_deferred'] );
	}

	public function test_executor_commits_ready_inventory_guarded_update(): void {
		$query_plan       = $this->query_plan( array( $this->inventory_query() ) );
		$preflight_result = $this->ready_preflight( $query_plan );
		$database         = new \OfflinePushCanonicalMutationTransactionExecutorWpdb( array( 1, 1, 1 ) );
		$result           = ( new OfflinePushCanonicalMutationTransactionExecutor( $database ) )->execute(
			$query_plan,
			$preflight_result
		);
		$audit            = $result->audit_payload();

		$this->assert_same( 'executed', $result->status() );
		$this->assert_true( $result->is_executed() );
		$this->assert_same( 1, $result->rows_affected() );
		$this->assert_same( array( 'op-inventory-0001' ), $result->mutation_operation_ids() );
		$this->assert_same( array( 'START TRANSACTION', 'COMMIT' ), $result->transaction_commands() );
		$this->assert_same( 3, $database->query_count );
		$this->assert_same( 1, $database->prepare_count );
		$this->assert_same( 'START TRANSACTION', $database->queries[0] );
		$this->assert_contains( 'UPDATE `wp_tcg_inventory_items`', $database->queries[1] );
		$this->assert_same( 'COMMIT', $database->queries[2] );
		$this->assert_false( $audit['inventory_write_execution_deferred'] );
		$this->assert_false( $audit['route_connected_writes_deferred'] );
		$this->assert_same( 'executed', $audit['mutation_results'][0]['execution_status'] );
	}

	public function test_executor_rolls_back_when_guard_matches_no_rows(): void {
		$query_plan       = $this->query_plan( array( $this->inventory_query() ) );
		$preflight_result = $this->ready_preflight( $query_plan );
		$database         = new \OfflinePushCanonicalMutationTransactionExecutorWpdb( array( 1, 0, 1 ) );
		$result           = ( new OfflinePushCanonicalMutationTransactionExecutor( $database ) )->execute(
			$query_plan,
			$preflight_result
		);

		$this->assert_same( 'rejected', $result->status() );
		$this->assert_true( $result->is_rejected() );
		$this->assert_true(
			in_array(
				'op-inventory-0001_inventory_guard_no_rows',
				$result->errors(),
				true
			)
		);
		$this->assert_same( array( 'START TRANSACTION', 'ROLLBACK' ), $result->transaction_commands() );
		$this->assert_same( 3, $database->query_count );
		$this->assert_same( 'ROLLBACK', $database->queries[2] );
		$this->assert_same( 0, $result->rows_affected() );
	}

	public function test_executor_rejects_unsupported_ready_query_kind(): void {
		$query_plan       = $this->query_plan( array( $this->event_query() ) );
		$repository_result = ( new OfflinePushCanonicalMutationRepository() )->stage( $query_plan );
		$execution_result = ( new OfflinePushCanonicalMutationRepositoryExecutionGate( true, true ) )->evaluate(
			$repository_result
		);
		$preflight_result = ( new OfflinePushCanonicalMutationTransactionPreflight() )->evaluate(
			$repository_result,
			$execution_result
		);
		$database         = new \OfflinePushCanonicalMutationTransactionExecutorWpdb();
		$result           = ( new OfflinePushCanonicalMutationTransactionExecutor( $database ) )->execute(
			$query_plan,
			$preflight_result
		);

		$this->assert_same( 'blocked', $result->status() );
		$this->assert_true(
			in_array(
				'event_registration_write_plan_deferred',
				$result->block_reasons(),
				true
			)
		);
		$this->assert_same( 0, $database->query_count );
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

	private function ready_preflight(
		OfflinePushCanonicalMutationQueryBuildPlan $query_plan
	): \TCGStorePlatform\Offline\OfflinePushCanonicalMutationTransactionPreflightResult {
		$repository_result = ( new OfflinePushCanonicalMutationRepository() )->stage( $query_plan );
		$execution_result  = ( new OfflinePushCanonicalMutationRepositoryExecutionGate( true, true ) )->evaluate(
			$repository_result
		);

		return ( new OfflinePushCanonicalMutationTransactionPreflight() )->evaluate(
			$repository_result,
			$execution_result
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
			'sql_template'        => 'UPDATE `wp_tcg_inventory_items` SET `status` = %s WHERE `public_id` = %s',
			'prepare_args'        => array( 'reserved', 'inv-1001' ),
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
			'sql_template'        => 'SELECT `event_id` FROM `wp_tcg_events` WHERE `public_id` = %s',
			'prepare_args'        => array( 'event-1001' ),
		);
	}
}
}
