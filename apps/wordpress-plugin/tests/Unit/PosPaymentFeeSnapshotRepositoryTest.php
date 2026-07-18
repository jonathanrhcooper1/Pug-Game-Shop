<?php
/**
 * POS/payment fee snapshot repository tests.
 *
 * @package TCGStorePlatform
 */

namespace {
	if ( ! class_exists( 'wpdb' ) ) {
		class wpdb {
			public string $prefix = 'wp_';
		}
	}

	if ( ! class_exists( 'PosPaymentFeeSnapshotWpdb' ) ) {
		class PosPaymentFeeSnapshotWpdb extends \wpdb {
			public string $prefix = 'wp_';
			public int $prepare_count = 0;
			public int $get_results_count = 0;
			public string $last_prepare_query = '';
			public string $last_query = '';
			public string $last_output_type = '';

			/**
			 * @var list<mixed>
			 */
			public array $last_prepare_args = array();

			/**
			 * @param list<array<string, mixed>>|false $result_set Rows returned by get_results.
			 */
			public function __construct( private array|false $result_set = array(), string $prefix = 'wp_' ) {
				$this->prefix = $prefix;
			}

			/**
			 * @param list<mixed> $args Prepared arguments.
			 */
			public function prepare( string $query, array $args ): string {
				++$this->prepare_count;
				$this->last_prepare_query = $query;
				$this->last_prepare_args  = array_values( $args );

				return 'prepared:' . $query;
			}

			/**
			 * @return list<array<string, mixed>>|false
			 */
			public function get_results( string $query, string $output_type ): array|false {
				++$this->get_results_count;
				$this->last_query       = $query;
				$this->last_output_type = $output_type;

				return $this->result_set;
			}
		}
	}
}

namespace TCGStorePlatform\Tests\Unit {
	use TCGStorePlatform\Payments\PosPaymentFeeSnapshotQueryPlanner;
	use TCGStorePlatform\Payments\PosPaymentFeeSnapshotRepository;
	use TCGStorePlatform\Tests\TestCase;

	final class PosPaymentFeeSnapshotRepositoryTest extends TestCase {
		public function test_repository_fetches_and_normalizes_fee_snapshots(): void {
			$database = new \PosPaymentFeeSnapshotWpdb( array( $this->fee_snapshot_row() ) );
			$result   = ( new PosPaymentFeeSnapshotRepository( $database ) )->fetch(
				$this->query_plan()
			);
			$rows     = $result->fee_snapshots();
			$audit    = $result->audit_payload();

			$this->assert_true( $result->is_fetched() );
			$this->assert_same( 'fetched', $result->status() );
			$this->assert_same( 1, $database->prepare_count );
			$this->assert_same( 1, $database->get_results_count );
			$this->assert_contains( 'FROM `wp_tcg_payment_fee_snapshots`', $database->last_prepare_query );
			$this->assert_same( array( 'square-sandbox', 'pos', 'USD', '2026-06-07', '2026-06-07', 100 ), $database->last_prepare_args );
			$this->assert_same( 'ARRAY_A', $database->last_output_type );
			$this->assert_same( '11111111-1111-4111-8111-111111111111', $rows[0]['public_id'] );
			$this->assert_same( 'square-sandbox', $rows[0]['provider'] );
			$this->assert_same( 'pos', $rows[0]['channel'] );
			$this->assert_same( 'USD', $rows[0]['currency'] );
			$this->assert_same( 295, $rows[0]['percentage_basis_points'] );
			$this->assert_same( 30, $rows[0]['fixed_fee_minor_units'] );
			$this->assert_same( null, $rows[0]['effective_to'] );
			$this->assert_same( '2026-06-07T12:00:00.000000Z', $rows[0]['last_verified_at_utc'] );
			$this->assert_same( 'pos_payment_fee_snapshot_repository_fetch', $audit['action'] );
			$this->assert_same( 1, $audit['row_count'] );
			$this->assert_false( $audit['fetch']['fee_snapshot_repository_deferred'] );
			$this->assert_true( $audit['route_connected_reads_deferred'] );
		}

		public function test_repository_rejects_invalid_query_plan_before_reads(): void {
			$database = new \PosPaymentFeeSnapshotWpdb( array( $this->fee_snapshot_row() ) );
			$result   = ( new PosPaymentFeeSnapshotRepository( $database ) )->fetch(
				( new PosPaymentFeeSnapshotQueryPlanner() )->plan(
					array( 'provider' => 'Square Sandbox' ),
					'wp;drop_'
				)
			);

			$this->assert_true( $result->is_rejected() );
			$this->assert_same( array(), $result->fee_snapshots() );
			$this->assert_same( 0, $database->prepare_count );
			$this->assert_same( 0, $database->get_results_count );
			$this->assert_true( in_array( 'fee_snapshot_query_plan_invalid', $result->errors(), true ) );
			$this->assert_true( in_array( 'table_prefix_invalid', $result->errors(), true ) );
			$this->assert_true( in_array( 'provider_invalid', $result->errors(), true ) );
		}

		public function test_repository_rejects_table_prefix_mismatch_before_reads(): void {
			$database = new \PosPaymentFeeSnapshotWpdb( array( $this->fee_snapshot_row() ), 'shop_' );
			$result   = ( new PosPaymentFeeSnapshotRepository( $database ) )->fetch(
				$this->query_plan()
			);

			$this->assert_true( $result->is_rejected() );
			$this->assert_same( 0, $database->prepare_count );
			$this->assert_same( 0, $database->get_results_count );
			$this->assert_same( array( 'fee_snapshot_table_prefix_mismatch' ), $result->errors() );
		}

		public function test_repository_rejects_database_failures_and_malformed_rows(): void {
			$failed_database = new \PosPaymentFeeSnapshotWpdb( false );
			$failed_result   = ( new PosPaymentFeeSnapshotRepository( $failed_database ) )->fetch(
				$this->query_plan()
			);

			$this->assert_true( $failed_result->is_rejected() );
			$this->assert_same( array( 'fee_snapshot_query_failed' ), $failed_result->errors() );

			$bad_database = new \PosPaymentFeeSnapshotWpdb(
				array(
					$this->fee_snapshot_row(
						array(
							'public_id'               => 'bad',
							'provider'                => 'Square Sandbox',
							'percentage_basis_points' => -1,
							'effective_from'          => 'bad-date',
							'last_verified_at'        => 'bad-time',
							'row_version'             => 0,
						)
					),
				)
			);
			$bad_result   = ( new PosPaymentFeeSnapshotRepository( $bad_database ) )->fetch(
				$this->query_plan()
			);

			$this->assert_true( $bad_result->is_rejected() );
			$this->assert_true( in_array( 'fee_snapshot_row_0_public_id_invalid', $bad_result->errors(), true ) );
			$this->assert_true( in_array( 'fee_snapshot_row_0_provider_invalid', $bad_result->errors(), true ) );
			$this->assert_true( in_array( 'fee_snapshot_row_0_percentage_basis_points_invalid', $bad_result->errors(), true ) );
			$this->assert_true( in_array( 'fee_snapshot_row_0_effective_from_invalid', $bad_result->errors(), true ) );
			$this->assert_true( in_array( 'fee_snapshot_row_0_last_verified_at_invalid', $bad_result->errors(), true ) );
			$this->assert_true( in_array( 'fee_snapshot_row_0_row_version_invalid', $bad_result->errors(), true ) );
		}

		private function query_plan(): \TCGStorePlatform\Payments\PosPaymentFeeSnapshotQueryPlan {
			return ( new PosPaymentFeeSnapshotQueryPlanner() )->plan(
				array(
					'provider'     => 'square-sandbox',
					'channel'      => 'pos',
					'currency'     => 'usd',
					'effective_on' => '2026-06-07',
					'page_size'    => '250',
				),
				'wp_'
			);
		}

		/**
		 * @param array<string, mixed> $overrides Row overrides.
		 * @return array<string, mixed>
		 */
		private function fee_snapshot_row( array $overrides = array() ): array {
			return array_merge(
				array(
					'payment_fee_snapshot_id'  => 7,
					'public_id'                => '11111111-1111-4111-8111-111111111111',
					'provider'                 => 'square-sandbox',
					'channel'                  => 'pos',
					'currency'                 => 'USD',
					'percentage_basis_points'  => 295,
					'fixed_fee_minor_units'    => 30,
					'platform_fee_minor_units' => 0,
					'effective_from'           => '2026-06-01',
					'effective_to'             => null,
					'source_note'              => 'Sandbox assumption',
					'source_url'               => '',
					'last_verified_at'         => '2026-06-07 12:00:00.000000',
					'updated_at'               => '2026-06-07 12:05:00.000000',
					'row_version'              => 3,
				),
				$overrides
			);
		}
	}
}
