<?php
/**
 * POS/payment log explicit execution repository tests.
 *
 * @package TCGStorePlatform
 */

namespace {
	if ( ! class_exists( 'wpdb' ) ) {
		class wpdb {
			public string $prefix = 'wp_';
		}
	}

	if ( ! class_exists( 'PosPaymentLogExecutionWpdb' ) ) {
		class PosPaymentLogExecutionWpdb extends \wpdb {
			public string $prefix = 'wp_';
			public int $prepare_count = 0;
			public int $query_count = 0;

			/**
			 * @var list<string>
			 */
			public array $prepare_queries = array();

			/**
			 * @var list<list<mixed>>
			 */
			public array $prepare_args = array();

			/**
			 * @param list<int|false> $query_results Query results.
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
				unset( $query );

				++$this->query_count;

				return array_shift( $this->query_results );
			}
		}
	}
}

namespace TCGStorePlatform\Tests\Unit {
	use TCGStorePlatform\Payments\PosPaymentLogExecutionRepository;
	use TCGStorePlatform\Payments\PosPaymentLogPlan;
	use TCGStorePlatform\Payments\PosPaymentLogQueryBuildPlan;
	use TCGStorePlatform\Payments\PosPaymentLogRepository;
	use TCGStorePlatform\Payments\PosPaymentLogRepositoryExecutionGate;
	use TCGStorePlatform\Payments\PosPaymentLogTransactionPreflight;
	use TCGStorePlatform\Payments\PosPaymentLogTransactionPreflightResult;
	use TCGStorePlatform\Tests\TestCase;

	final class PosPaymentLogExecutionRepositoryTest extends TestCase {
		public function test_repository_executes_ready_pos_and_payment_log_inserts(): void {
			$query_plan       = $this->query_plan();
			$preflight_result = $this->ready_preflight( $query_plan );
			$database         = new \PosPaymentLogExecutionWpdb( array( 1, 1 ) );
			$result           = ( new PosPaymentLogExecutionRepository( $database ) )->execute( $query_plan, $preflight_result );
			$audit            = $result->audit_payload();

			$this->assert_true( $result->is_persisted() );
			$this->assert_false( $result->is_rejected() );
			$this->assert_same( 'persisted', $result->status() );
			$this->assert_same( 2, $result->rows_affected() );
			$this->assert_same( 1, $result->pos_sync_rows_affected() );
			$this->assert_same( 1, $result->payment_provider_rows_affected() );
			$this->assert_same( 2, $result->total_query_count() );
			$this->assert_same( 2, $database->prepare_count );
			$this->assert_same( 2, $database->query_count );
			$this->assert_contains( 'INSERT INTO `wp_tcg_pos_sync_log`', $database->prepare_queries[0] );
			$this->assert_contains( 'INSERT INTO `wp_tcg_payment_provider_log`', $database->prepare_queries[1] );
			$this->assert_same( 18, count( $database->prepare_args[0] ) );
			$this->assert_same( 19, count( $database->prepare_args[1] ) );
			$this->assert_same( 'pos_payment_log_execution_repository', $audit['action'] );
			$this->assert_same( 2, $audit['rows_affected'] );
			$this->assert_true( $audit['route_connected_writes_deferred'] );
			$this->assert_true( $audit['provider_inventory_write_deferred'] );
			$this->assert_true( $audit['payment_capture_execution_deferred'] );
			$this->assert_same( array(), $audit['errors'] );
		}

		public function test_repository_rejects_blocked_preflight_before_database_writes(): void {
			$query_plan       = $this->query_plan();
			$repository       = ( new PosPaymentLogRepository() )->stage( $query_plan );
			$execution_gate   = ( new PosPaymentLogRepositoryExecutionGate() )->evaluate( $repository );
			$preflight_result = ( new PosPaymentLogTransactionPreflight() )->evaluate( $repository, $execution_gate );
			$database         = new \PosPaymentLogExecutionWpdb( array( 1, 1 ) );
			$result           = ( new PosPaymentLogExecutionRepository( $database ) )->execute( $query_plan, $preflight_result );

			$this->assert_true( $result->is_rejected() );
			$this->assert_same( 0, $result->rows_affected() );
			$this->assert_same( 0, $database->prepare_count );
			$this->assert_same( 0, $database->query_count );
			$this->assert_true( in_array( 'pos_payment_log_preflight_not_ready', $result->errors(), true ) );
			$this->assert_true( in_array( 'payment_log_repository_execution_disabled', $result->errors(), true ) );
		}

		public function test_repository_rejects_invalid_query_plan_before_database_writes(): void {
			$query_plan       = PosPaymentLogQueryBuildPlan::rejected(
				$this->log_plan(),
				array(),
				array( 'fixture_query_rejected' )
			);
			$preflight_result = $this->rejected_preflight( $query_plan );
			$database         = new \PosPaymentLogExecutionWpdb( array( 1 ) );
			$result           = ( new PosPaymentLogExecutionRepository( $database ) )->execute( $query_plan, $preflight_result );

			$this->assert_true( $result->is_rejected() );
			$this->assert_same( array( 'fixture_query_rejected' ), $result->errors() );
			$this->assert_same( 0, $database->prepare_count );
			$this->assert_same( 0, $database->query_count );
		}

		public function test_repository_rejects_table_prefix_mismatch_before_database_writes(): void {
			$query_plan       = $this->query_plan();
			$preflight_result = $this->ready_preflight( $query_plan );
			$database         = new \PosPaymentLogExecutionWpdb( array( 1, 1 ), 'bad_' );
			$result           = ( new PosPaymentLogExecutionRepository( $database ) )->execute( $query_plan, $preflight_result );

			$this->assert_true( $result->is_rejected() );
			$this->assert_same( array( 'pos_payment_log_table_prefix_mismatch' ), $result->errors() );
			$this->assert_same( 0, $database->prepare_count );
			$this->assert_same( 0, $database->query_count );
		}

		public function test_repository_rejects_failed_payment_insert_with_partial_counts(): void {
			$query_plan       = $this->query_plan();
			$preflight_result = $this->ready_preflight( $query_plan );
			$database         = new \PosPaymentLogExecutionWpdb( array( 1, false ) );
			$result           = ( new PosPaymentLogExecutionRepository( $database ) )->execute( $query_plan, $preflight_result );

			$this->assert_true( $result->is_rejected() );
			$this->assert_same( 1, $result->rows_affected() );
			$this->assert_same( 1, $result->pos_sync_rows_affected() );
			$this->assert_same( 0, $result->payment_provider_rows_affected() );
			$this->assert_same( 2, $database->prepare_count );
			$this->assert_same( 2, $database->query_count );
			$this->assert_true( in_array( 'square-sandbox:evt-square-sandbox-sale-001:payment:capture_payment_provider_insert_failed', $result->errors(), true ) );
		}

		private function ready_preflight( PosPaymentLogQueryBuildPlan $query_plan ): PosPaymentLogTransactionPreflightResult {
			$repository     = ( new PosPaymentLogRepository() )->stage( $query_plan );
			$execution_gate = ( new PosPaymentLogRepositoryExecutionGate( true, true ) )->evaluate( $repository );

			return ( new PosPaymentLogTransactionPreflight() )->evaluate( $repository, $execution_gate );
		}

		private function rejected_preflight( PosPaymentLogQueryBuildPlan $query_plan ): PosPaymentLogTransactionPreflightResult {
			$repository     = ( new PosPaymentLogRepository() )->stage( $query_plan );
			$execution_gate = ( new PosPaymentLogRepositoryExecutionGate( true, true ) )->evaluate( $repository );

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
