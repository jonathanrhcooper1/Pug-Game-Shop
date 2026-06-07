<?php
/**
 * POS/payment log staged transaction executor tests.
 *
 * @package TCGStorePlatform
 */

namespace {
	if ( ! class_exists( 'wpdb' ) ) {
		class wpdb {
			public string $prefix = 'wp_';
		}
	}

	if ( ! class_exists( 'PosPaymentLogTransactionWpdb' ) ) {
		class PosPaymentLogTransactionWpdb extends \wpdb {
			public string $prefix = 'wp_';
			public int $prepare_count = 0;

			/**
			 * @var list<string>
			 */
			public array $queries = array();

			/**
			 * @var list<string>
			 */
			public array $prepare_queries = array();

			/**
			 * @var list<list<mixed>>
			 */
			public array $prepare_args = array();

			/**
			 * @param list<int|false> $query_results Query results in execution order.
			 */
			public function __construct( private array $query_results = array(), ?string $prefix = null ) {
				if ( null !== $prefix ) {
					$this->prefix = $prefix;
				}
			}

			/**
			 * @param list<mixed> $args Prepared arguments.
			 */
			public function prepare( string $query, array $args ): string {
				++$this->prepare_count;
				$this->prepare_queries[] = $query;
				$this->prepare_args[]    = array_values( $args );

				return 'prepared:' . $query;
			}

			public function query( string $query ): int|false {
				$this->queries[] = $query;

				return array_shift( $this->query_results );
			}
		}
	}
}

namespace TCGStorePlatform\Tests\Unit {
	use TCGStorePlatform\Payments\PosPaymentLogPlan;
	use TCGStorePlatform\Payments\PosPaymentLogQueryBuildPlan;
	use TCGStorePlatform\Payments\PosPaymentLogRepository;
	use TCGStorePlatform\Payments\PosPaymentLogRepositoryExecutionGate;
	use TCGStorePlatform\Payments\PosPaymentLogTransactionExecutor;
	use TCGStorePlatform\Payments\PosPaymentLogTransactionPreflight;
	use TCGStorePlatform\Payments\PosPaymentLogTransactionPreflightResult;
	use TCGStorePlatform\Tests\TestCase;

	final class PosPaymentLogTransactionExecutorTest extends TestCase {
		public function test_executor_commits_preflight_ready_log_writes(): void {
			$query_plan       = $this->query_plan();
			$preflight_result = $this->ready_preflight( $query_plan );
			$database         = new \PosPaymentLogTransactionWpdb( array( 0, 1, 1, 0 ) );
			$result           = ( new PosPaymentLogTransactionExecutor( $database ) )->execute( $query_plan, $preflight_result );
			$audit            = $result->audit_payload();

			$this->assert_true( $result->is_committed() );
			$this->assert_false( $result->is_rejected() );
			$this->assert_false( $result->is_rolled_back() );
			$this->assert_same( 'committed', $result->status() );
			$this->assert_same( 2, $result->rows_affected() );
			$this->assert_same( 2, $result->repository_rows_affected() );
			$this->assert_same(
				array(
					'START TRANSACTION',
					'prepared:INSERT INTO `wp_tcg_pos_sync_log` (`public_id`) VALUES (%s)',
					'prepared:INSERT INTO `wp_tcg_payment_provider_log` (`public_id`) VALUES (%s)',
					'COMMIT',
				),
				$database->queries
			);
			$this->assert_same( 2, $database->prepare_count );
			$this->assert_same( array( 'START TRANSACTION', 'COMMIT' ), $result->transaction_commands() );
			$this->assert_true( $audit['transaction_started'] );
			$this->assert_true( $audit['transaction_committed'] );
			$this->assert_false( $audit['transaction_rolled_back'] );
			$this->assert_false( $audit['pos_payment_log_transaction_execution_deferred'] );
			$this->assert_true( $audit['route_connected_writes_deferred'] );
			$this->assert_true( $audit['provider_inventory_write_deferred'] );
			$this->assert_true( $audit['payment_capture_execution_deferred'] );
			$this->assert_same( array(), $audit['errors'] );
		}

		public function test_executor_rejects_blocked_preflight_before_transaction(): void {
			$query_plan       = $this->query_plan();
			$preflight_result = $this->blocked_preflight( $query_plan );
			$database         = new \PosPaymentLogTransactionWpdb( array( 0, 1, 1, 0 ) );
			$result           = ( new PosPaymentLogTransactionExecutor( $database ) )->execute( $query_plan, $preflight_result );

			$this->assert_true( $result->is_rejected() );
			$this->assert_false( $result->transaction_started() );
			$this->assert_same( 0, $result->rows_affected() );
			$this->assert_same( array(), $database->queries );
			$this->assert_same( 0, $database->prepare_count );
			$this->assert_true( in_array( 'pos_payment_log_transaction_not_ready', $result->errors(), true ) );
			$this->assert_true( in_array( 'payment_log_repository_execution_disabled', $result->errors(), true ) );
		}

		public function test_executor_rejects_begin_failure_without_log_writes(): void {
			$query_plan       = $this->query_plan();
			$preflight_result = $this->ready_preflight( $query_plan );
			$database         = new \PosPaymentLogTransactionWpdb( array( false, 1, 1, 0 ) );
			$result           = ( new PosPaymentLogTransactionExecutor( $database ) )->execute( $query_plan, $preflight_result );

			$this->assert_true( $result->is_rejected() );
			$this->assert_same( array( 'START TRANSACTION' ), $database->queries );
			$this->assert_same( array( 'START TRANSACTION' ), $result->transaction_commands() );
			$this->assert_same( 0, $database->prepare_count );
			$this->assert_same( array( 'pos_payment_log_transaction_begin_failed' ), $result->errors() );
		}

		public function test_executor_rolls_back_when_repository_execution_fails(): void {
			$query_plan       = $this->query_plan();
			$preflight_result = $this->ready_preflight( $query_plan );
			$database         = new \PosPaymentLogTransactionWpdb( array( 0, 1, false, 0 ) );
			$result           = ( new PosPaymentLogTransactionExecutor( $database ) )->execute( $query_plan, $preflight_result );
			$audit            = $result->audit_payload();

			$this->assert_true( $result->is_rolled_back() );
			$this->assert_false( $result->is_committed() );
			$this->assert_same( 0, $result->rows_affected() );
			$this->assert_same( 1, $result->repository_rows_affected() );
			$this->assert_same( array( 'START TRANSACTION', 'ROLLBACK' ), $result->transaction_commands() );
			$this->assert_true( $audit['transaction_started'] );
			$this->assert_false( $audit['transaction_committed'] );
			$this->assert_true( $audit['transaction_rolled_back'] );
			$this->assert_true( in_array( 'pos_payment_log_transaction_repository_rejected', $result->errors(), true ) );
			$this->assert_true( in_array( 'square-sandbox:evt-square-sandbox-sale-001:payment:capture_payment_provider_insert_failed', $result->errors(), true ) );
		}

		public function test_executor_rolls_back_when_commit_fails(): void {
			$query_plan       = $this->query_plan();
			$preflight_result = $this->ready_preflight( $query_plan );
			$database         = new \PosPaymentLogTransactionWpdb( array( 0, 1, 1, false, 0 ) );
			$result           = ( new PosPaymentLogTransactionExecutor( $database ) )->execute( $query_plan, $preflight_result );

			$this->assert_true( $result->is_rolled_back() );
			$this->assert_same( 0, $result->rows_affected() );
			$this->assert_same( 2, $result->repository_rows_affected() );
			$this->assert_same( array( 'START TRANSACTION', 'COMMIT', 'ROLLBACK' ), $result->transaction_commands() );
			$this->assert_same( array( 'pos_payment_log_transaction_commit_failed' ), $result->errors() );
		}

		private function ready_preflight( PosPaymentLogQueryBuildPlan $query_plan ): PosPaymentLogTransactionPreflightResult {
			$repository     = ( new PosPaymentLogRepository() )->stage( $query_plan );
			$execution_gate = ( new PosPaymentLogRepositoryExecutionGate( true, true ) )->evaluate( $repository );

			return ( new PosPaymentLogTransactionPreflight() )->evaluate( $repository, $execution_gate );
		}

		private function blocked_preflight( PosPaymentLogQueryBuildPlan $query_plan ): PosPaymentLogTransactionPreflightResult {
			$repository     = ( new PosPaymentLogRepository() )->stage( $query_plan );
			$execution_gate = ( new PosPaymentLogRepositoryExecutionGate() )->evaluate( $repository );

			return ( new PosPaymentLogTransactionPreflight() )->evaluate( $repository, $execution_gate );
		}

		private function query_plan(): PosPaymentLogQueryBuildPlan {
			return PosPaymentLogQueryBuildPlan::accepted(
				$this->log_plan(),
				array(
					'pos_sync_log'         => 'wp_tcg_pos_sync_log',
					'payment_provider_log' => 'wp_tcg_payment_provider_log',
				),
				array(
					array(
						'idempotency_key'       => 'square-sandbox:evt-square-sandbox-sale-001:pos:line-0',
						'reconciliation_status' => 'reconciled',
						'sql_template'          => 'INSERT INTO `wp_tcg_pos_sync_log` (`public_id`) VALUES (%s)',
						'prepare_args'          => array_fill( 0, 18, 'arg' ),
					),
				),
				array(
					array(
						'idempotency_key' => 'square-sandbox:evt-square-sandbox-sale-001:payment:capture',
						'operation'       => 'capture',
						'status'          => 'approved',
						'sql_template'    => 'INSERT INTO `wp_tcg_payment_provider_log` (`public_id`) VALUES (%s)',
						'prepare_args'    => array_fill( 0, 19, 'arg' ),
					),
				)
			);
		}

		private function log_plan(): PosPaymentLogPlan {
			return PosPaymentLogPlan::ready(
				'fixture_ready',
				array(),
				array(),
				array(
					array( 'action' => 'fixture_ready' ),
				)
			);
		}
	}
}
