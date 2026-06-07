<?php
/**
 * POS/payment fee snapshot route handler tests.
 *
 * @package TCGStorePlatform
 */

namespace {
	if ( ! class_exists( 'wpdb' ) ) {
		class wpdb {
			public string $prefix = 'wp_';
		}
	}

	if ( ! class_exists( 'PosPaymentFeeSnapshotRouteHandlerWpdb' ) ) {
		class PosPaymentFeeSnapshotRouteHandlerWpdb extends \wpdb {
			public string $prefix = 'wp_';
			public int $prepare_count = 0;
			public int $get_results_count = 0;

			/**
			 * @param list<array<string, mixed>>|false $result_set Rows returned by get_results.
			 */
			public function __construct( private array|false $result_set = array() ) {
			}

			/**
			 * @param list<mixed> $args Prepared arguments.
			 */
			public function prepare( string $query, array $args ): string {
				unset( $args );

				++$this->prepare_count;

				return 'prepared:' . $query;
			}

			/**
			 * @return list<array<string, mixed>>|false
			 */
			public function get_results( string $query, string $output_type ): array|false {
				unset( $query, $output_type );

				++$this->get_results_count;

				return $this->result_set;
			}
		}
	}
}

namespace TCGStorePlatform\Tests\Unit {
	use TCGStorePlatform\Api\V1\OfflineRestRequestData;
	use TCGStorePlatform\Api\V1\PosPaymentFeeSnapshotRouteHandler;
	use TCGStorePlatform\Payments\PosPaymentFeeSnapshotRepository;
	use TCGStorePlatform\Tests\TestCase;

	final class PosPaymentFeeSnapshotRouteHandlerTest extends TestCase {
		public function test_handler_executes_repository_when_explicitly_invoked(): void {
			$database = new \PosPaymentFeeSnapshotRouteHandlerWpdb( array( $this->fee_snapshot_row() ) );
			$response = $this->handler( $database )->list_payment_fee_snapshots(
				$this->request_data(
					array(
						'provider'     => 'square-sandbox',
						'channel'      => 'pos',
						'currency'     => 'usd',
						'effective_on' => '2026-06-07',
					)
				)
			);

			$this->assert_same( 'ready', $response['status'] );
			$this->assert_same( 200, $response['status_code'] );
			$this->assert_same( 'pos_payment_fee_snapshot_read_ready', $response['code'] );
			$this->assert_same( 'square-sandbox', $response['data']['provider'] );
			$this->assert_same( 'USD', $response['data']['currency'] );
			$this->assert_same( 1, count( $response['data']['fee_snapshots'] ) );
			$this->assert_same( '11111111-1111-4111-8111-111111111111', $response['data']['fee_snapshots'][0]['public_id'] );
			$this->assert_true( $response['meta']['route_connected_reads_enabled'] );
			$this->assert_false( $response['meta']['route_connected_reads_deferred'] );
			$this->assert_false( $response['meta']['fee_snapshot_repository_deferred'] );
			$this->assert_true( $response['meta']['route_connected_writes_deferred'] );
			$this->assert_same( 'pos_payment_fee_snapshot_repository_fetch', $response['meta']['repository']['action'] );
			$this->assert_same( 1, $database->prepare_count );
			$this->assert_same( 1, $database->get_results_count );
		}

		public function test_handler_rejects_invalid_query_before_repository_reads(): void {
			$database = new \PosPaymentFeeSnapshotRouteHandlerWpdb( array( $this->fee_snapshot_row() ) );
			$response = $this->handler( $database )->list_payment_fee_snapshots(
				$this->request_data(
					array(
						'provider' => 'Square Sandbox',
					)
				)
			);

			$this->assert_same( 'invalid', $response['status'] );
			$this->assert_same( 'pos_payment_fee_snapshot_query_invalid', $response['code'] );
			$this->assert_true( in_array( 'provider_invalid', $response['errors'], true ) );
			$this->assert_true( $response['meta']['route_connected_reads_deferred'] );
			$this->assert_true( $response['meta']['fee_snapshot_repository_deferred'] );
			$this->assert_same( 0, $database->prepare_count );
			$this->assert_same( 0, $database->get_results_count );
		}

		public function test_handler_rejects_repository_failures(): void {
			$database = new \PosPaymentFeeSnapshotRouteHandlerWpdb( false );
			$response = $this->handler( $database )->list_payment_fee_snapshots(
				$this->request_data(
					array(
						'provider' => 'square-sandbox',
					)
				)
			);

			$this->assert_same( 'invalid', $response['status'] );
			$this->assert_same( 'pos_payment_fee_snapshot_repository_rejected', $response['code'] );
			$this->assert_same( array( 'fee_snapshot_query_failed' ), $response['errors'] );
			$this->assert_true( $response['meta']['route_connected_reads_deferred'] );
			$this->assert_true( $response['meta']['fee_snapshot_repository_deferred'] );
			$this->assert_same( 'rejected', $response['meta']['repository']['status'] );
			$this->assert_same( 1, $database->prepare_count );
			$this->assert_same( 1, $database->get_results_count );
		}

		private function handler( \wpdb $database ): PosPaymentFeeSnapshotRouteHandler {
			return new PosPaymentFeeSnapshotRouteHandler(
				new PosPaymentFeeSnapshotRepository( $database )
			);
		}

		/**
		 * @param array<string, mixed> $query Query parameters.
		 */
		private function request_data( array $query ): OfflineRestRequestData {
			return new OfflineRestRequestData( array(), $query, array(), array() );
		}

		/**
		 * @return array<string, mixed>
		 */
		private function fee_snapshot_row(): array {
			return array(
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
			);
		}
	}
}
