<?php
/**
 * POS/payment fee snapshot route handler factory tests.
 *
 * @package TCGStorePlatform
 */

namespace {
	if ( ! class_exists( 'wpdb' ) ) {
		class wpdb {
			public string $prefix = 'wp_';
		}
	}

	if ( ! class_exists( 'PosPaymentFeeSnapshotRouteHandlerFactoryWpdb' ) ) {
		class PosPaymentFeeSnapshotRouteHandlerFactoryWpdb extends \wpdb {
			public string $prefix = 'wp_';
			public int $prepare_count = 0;
			public int $get_results_count = 0;

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
	use TCGStorePlatform\Api\V1\PosPaymentFeeSnapshotRouteHandlerFactory;
	use TCGStorePlatform\Api\V1\PosPaymentRouteDependencyFactory;
	use TCGStorePlatform\Tests\TestCase;

	final class PosPaymentFeeSnapshotRouteHandlerFactoryTest extends TestCase {
		public function test_factory_defers_route_connected_reads_by_default(): void {
			$database = new \PosPaymentFeeSnapshotRouteHandlerFactoryWpdb( array( $this->fee_snapshot_row() ) );
			$factory  = new PosPaymentFeeSnapshotRouteHandlerFactory(
				static fn (): \wpdb => $database
			);
			$summary  = $factory->readiness_summary();

			$this->assert_true( $summary['handler_factory_ready'] );
			$this->assert_false( $summary['route_connected_reads_enabled'] );
			$this->assert_true( $summary['database_configured'] );
			$this->assert_false( $summary['route_connected_handler_ready'] );
			$this->assert_true( $summary['route_connected_handler_deferred'] );
			$this->assert_true( $summary['route_connected_reads_deferred'] );
			$this->assert_same( array(), $summary['configuration_issues'] );
			$this->assert_same( array(), $factory->handlers() );
			$this->assert_same( null, $factory->handler() );
			$this->assert_same( 0, $database->prepare_count );
			$this->assert_same( 0, $database->get_results_count );
		}

		public function test_factory_composes_route_connected_fee_snapshot_handler_when_enabled(): void {
			$database = new \PosPaymentFeeSnapshotRouteHandlerFactoryWpdb( array( $this->fee_snapshot_row() ) );
			$factory  = new PosPaymentFeeSnapshotRouteHandlerFactory(
				static fn (): \wpdb => $database,
				true
			);
			$summary  = $factory->readiness_summary();
			$handlers = $factory->handlers();
			$response = $handlers['list_payment_fee_snapshots'](
				$this->request_data(
					array(
						'provider' => 'square-sandbox',
						'currency' => 'usd',
					)
				)
			);

			$this->assert_true( $summary['route_connected_reads_enabled'] );
			$this->assert_true( $summary['database_configured'] );
			$this->assert_true( $summary['table_prefix_ready'] );
			$this->assert_true( $summary['repository_configured'] );
			$this->assert_true( $summary['route_connected_handler_ready'] );
			$this->assert_false( $summary['route_connected_handler_deferred'] );
			$this->assert_false( $summary['route_connected_reads_deferred'] );
			$this->assert_same( array(), $summary['configuration_issues'] );
			$this->assert_same( 'pos_payment_fee_snapshot_read_ready', $response['code'] );
			$this->assert_same( 1, count( $response['data']['fee_snapshots'] ) );
			$this->assert_same( 1, $database->prepare_count );
			$this->assert_same( 1, $database->get_results_count );
		}

		public function test_factory_reports_enabled_dependency_issues(): void {
			$missing = new PosPaymentFeeSnapshotRouteHandlerFactory( null, true );
			$bad_db  = new PosPaymentFeeSnapshotRouteHandlerFactory(
				static fn (): \wpdb => new \PosPaymentFeeSnapshotRouteHandlerFactoryWpdb( array(), 'wp-bad_' ),
				true
			);

			$this->assert_same( array( 'database_not_configured' ), $missing->readiness_summary()['configuration_issues'] );
			$this->assert_same( array( 'table_prefix_invalid' ), $bad_db->readiness_summary()['configuration_issues'] );
		}

		public function test_dependency_factory_can_receive_route_connected_fee_snapshot_handler_factory(): void {
			$database = new \PosPaymentFeeSnapshotRouteHandlerFactoryWpdb( array( $this->fee_snapshot_row() ) );
			$factory  = new PosPaymentRouteDependencyFactory(
				null,
				array(),
				null,
				null,
				null,
				null,
				new PosPaymentFeeSnapshotRouteHandlerFactory(
					static fn (): \wpdb => $database,
					true
				)
			);
			$summary  = $factory->readiness_summary();
			$response = $factory->controller()->list_payment_fee_snapshots(
				array(
					'query' => array(
						'provider' => 'square-sandbox',
					),
				)
			);

			$this->assert_true( $summary['fee_snapshot_route_handler_factory_ready'] );
			$this->assert_true( $summary['fee_snapshot_route_execution_enabled'] );
			$this->assert_true( $summary['fee_snapshot_route_handler_ready'] );
			$this->assert_false( $summary['fee_snapshot_route_handler_deferred'] );
			$this->assert_true( $summary['fee_snapshot_route_database_configured'] );
			$this->assert_same( array(), $summary['fee_snapshot_route_dependency_issues'] );
			$this->assert_same( 'pos_payment_fee_snapshot_read_ready', $response['code'] );
			$this->assert_same( 1, count( $response['data']['fee_snapshots'] ) );
			$this->assert_same( 1, $database->get_results_count );
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
