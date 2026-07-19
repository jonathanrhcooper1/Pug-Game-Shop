<?php
/**
 * POS/payment fee snapshot repository readiness tests.
 *
 * @package TCGStorePlatform
 */

namespace {
	if ( ! class_exists( 'wpdb' ) ) {
		class wpdb {
			public string $prefix = 'wp_';
		}
	}

	if ( ! class_exists( 'PosPaymentFeeSnapshotReadinessWpdb' ) ) {
		class PosPaymentFeeSnapshotReadinessWpdb extends \wpdb {
			public string $prefix = 'wp_';
			public int $prepare_count = 0;
			public int $get_results_count = 0;

			/**
			 * @param list<mixed> $args Prepared arguments.
			 */
			public function prepare( string $query, array $args ): string {
				++$this->prepare_count;

				return 'prepared:' . $query;
			}

			/**
			 * @return list<array<string, mixed>>
			 */
			public function get_results( string $query, string $output_type ): array {
				++$this->get_results_count;

				return array();
			}
		}
	}
}

namespace TCGStorePlatform\Tests\Unit {
	use TCGStorePlatform\Api\V1\PosPaymentController;
	use TCGStorePlatform\Api\V1\PosPaymentRouteDependencyFactory;
	use TCGStorePlatform\Api\V1\PosPaymentRouteValidationHandlerFactory;
	use TCGStorePlatform\Payments\PosPaymentFeeSnapshotRepository;
	use TCGStorePlatform\Tests\TestCase;

	final class PosPaymentFeeSnapshotRepositoryReadinessTest extends TestCase {
		public function test_validation_handler_reports_injected_repository_without_route_reads(): void {
			$database = new \PosPaymentFeeSnapshotReadinessWpdb();
			$factory  = new PosPaymentRouteValidationHandlerFactory(
				null,
				null,
				null,
				'wp_',
				new PosPaymentFeeSnapshotRepository( $database )
			);
			$response = ( new PosPaymentController( null, $factory->handlers() ) )->list_payment_fee_snapshots(
				array(
					'query' => array(
						'provider'     => 'square-sandbox',
						'channel'      => 'pos',
						'currency'     => 'usd',
						'effective_on' => '2026-06-07',
					),
				)
			);

			$this->assert_same( 'validated', $response['status'] );
			$this->assert_true( $response['data']['fee_snapshot_repository_configured'] );
			$this->assert_true( $response['data']['fee_snapshot_repository_adapter_ready'] );
			$this->assert_true( $response['data']['fee_snapshot_repository_deferred'] );
			$this->assert_true( $response['data']['route_connected_reads_deferred'] );
			$this->assert_same( 0, $database->prepare_count );
			$this->assert_same( 0, $database->get_results_count );
		}

		public function test_dependency_summary_exposes_fee_snapshot_repository_readiness(): void {
			$summary = ( new PosPaymentRouteDependencyFactory(
				null,
				array(),
				null,
				null,
				null,
				new PosPaymentRouteValidationHandlerFactory(
					null,
					null,
					null,
					'wp_',
					new PosPaymentFeeSnapshotRepository( new \PosPaymentFeeSnapshotReadinessWpdb() )
				)
			) )->readiness_summary();

			$this->assert_true( $summary['parser_validation_factory_ready'] );
			$this->assert_true( $summary['fee_snapshot_query_planner_ready'] );
			$this->assert_true( $summary['fee_snapshot_query_builder_ready'] );
			$this->assert_true( $summary['fee_snapshot_repository_configured'] );
			$this->assert_true( $summary['fee_snapshot_repository_adapter_ready'] );
			$this->assert_true( $summary['fee_snapshot_repository_deferred'] );
			$this->assert_true( $summary['fee_snapshot_route_connected_reads_deferred'] );
		}
	}
}
