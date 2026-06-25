<?php
/**
 * Offline push route existing operation rows provider tests.
 *
 * @package TCGStorePlatform
 */

namespace {
	if ( ! class_exists( 'wpdb' ) ) {
		class wpdb {
			public string $prefix = 'wp_';
		}
	}

	if ( ! class_exists( 'OfflinePushRouteExistingRowsWpdb' ) ) {
		class OfflinePushRouteExistingRowsWpdb extends \wpdb {
			public string $prefix = 'wp_';
			public int $prepare_count = 0;
			public int $get_results_count = 0;
			public string $last_prepare_query = '';
			public string $last_query = '';

			/**
			 * @var list<mixed>
			 */
			public array $last_prepare_args = array();

			/**
			 * @param list<array<string, mixed>>|false $result_set Result rows.
			 */
			public function __construct( private array|false $result_set = array(), ?string $prefix = null ) {
				if ( null !== $prefix ) {
					$this->prefix = $prefix;
				}
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
				unset( $output_type );

				++$this->get_results_count;
				$this->last_query = $query;

				return $this->result_set;
			}
		}
	}
}

namespace TCGStorePlatform\Tests\Unit {
	use InvalidArgumentException;
	use TCGStorePlatform\Api\V1\OfflinePushRouteExistingOperationRowsProvider;
	use TCGStorePlatform\Api\V1\OfflineRestRequestData;
	use TCGStorePlatform\Offline\OfflineOperationEnvelope;
	use TCGStorePlatform\Offline\OfflinePushPayload;
	use TCGStorePlatform\Tests\TestCase;

	final class OfflinePushRouteExistingOperationRowsProviderTest extends TestCase {
		public function test_provider_fetches_existing_rows_from_authenticated_route_context(): void {
			$database = new \OfflinePushRouteExistingRowsWpdb( array( $this->existing_row() ) );
			$provider = new OfflinePushRouteExistingOperationRowsProvider( $database );
			$rows     = $provider(
				$this->payload(),
				$this->request_data(),
				array(
					'device_row'      => $this->device_row(),
					'server_time_utc' => '2026-06-06T20:30:00Z',
				)
			);
			$summary  = $provider->readiness_summary();

			$this->assert_same( 1, count( $rows ) );
			$this->assert_same( 'accepted', $rows['op-inventory-0001']['status'] );
			$this->assert_same( 'inventory_reserved', $rows['op-inventory-0001']['result_code'] );
			$this->assert_same( 1, $database->prepare_count );
			$this->assert_same( 1, $database->get_results_count );
			$this->assert_contains( 'FROM `wp_tcg_offline_sync_queue`', $database->last_prepare_query );
			$this->assert_same( array( 42, 'op-inventory-0001' ), $database->last_prepare_args );
			$this->assert_same( 'offline_push_route_existing_operation_rows_provider_ready', $summary['action'] );
			$this->assert_true( $summary['provider_ready'] );
			$this->assert_true( $summary['route_connected_reads_ready'] );
			$this->assert_true( $summary['explicit_execution_required'] );
			$this->assert_true( $summary['queue_replay_deferred'] );
			$this->assert_true( $summary['canonical_mutations_deferred'] );
		}

		public function test_provider_rejects_missing_device_context_before_reads(): void {
			$database = new \OfflinePushRouteExistingRowsWpdb( array( $this->existing_row() ) );
			$provider = new OfflinePushRouteExistingOperationRowsProvider( $database );

			try {
				$provider( $this->payload(), $this->request_data(), array() );
			} catch ( InvalidArgumentException $exception ) {
				$this->assert_same(
					'offline_push_existing_operation_rows_device_context_invalid',
					$exception->getMessage()
				);
				$this->assert_same( 0, $database->prepare_count );
				$this->assert_same( 0, $database->get_results_count );

				return;
			}

			$this->assert_true( false, 'Expected missing device context to fail closed.' );
		}

		public function test_provider_rejects_repository_errors(): void {
			$database = new \OfflinePushRouteExistingRowsWpdb(
				array(
					$this->existing_row(
						array(
							'offline_device_id' => '99',
							'row_version'       => '0',
						)
					),
				)
			);
			$provider = new OfflinePushRouteExistingOperationRowsProvider( $database );

			try {
				$provider(
					$this->payload(),
					$this->request_data(),
					array(
						'device_row' => $this->device_row(),
					)
				);
			} catch ( InvalidArgumentException $exception ) {
				$this->assert_contains(
					'offline_push_existing_operation_rows_repository_rejected',
					$exception->getMessage()
				);
				$this->assert_contains( 'row_0_offline_device_id_mismatch', $exception->getMessage() );
				$this->assert_contains( 'row_0_row_version_invalid', $exception->getMessage() );
				$this->assert_same( 1, $database->prepare_count );
				$this->assert_same( 1, $database->get_results_count );

				return;
			}

			$this->assert_true( false, 'Expected repository errors to fail closed.' );
		}

		private function request_data(): OfflineRestRequestData {
			return new OfflineRestRequestData( array(), array(), array(), array() );
		}

		/**
		 * @return array<string, mixed>
		 */
		private function device_row(): array {
			return array(
				'offline_device_id' => '42',
				'public_id'         => 'device-main-01',
			);
		}

		private function payload(): OfflinePushPayload {
			return new OfflinePushPayload(
				'batch-main-01',
				'device-main-01',
				array(
					new OfflineOperationEnvelope(
						'op-inventory-0001',
						'device-main-01',
						3,
						22,
						'inventory_reservation',
						'inventory',
						'inv-1001',
						4,
						'2026-06-06T10:15:00-04:00',
						'2026-06-06T14:15:05Z',
						array(),
						array(),
						1
					),
				)
			);
		}

		/**
		 * @param array<string, mixed> $overrides Row overrides.
		 * @return array<string, mixed>
		 */
		private function existing_row( array $overrides = array() ): array {
			return array_merge(
				array(
					'offline_queue_id'    => '501',
					'offline_device_id'   => '42',
					'device_public_id'    => 'device-main-01',
					'batch_id'            => 'batch-main-01',
					'client_operation_id' => 'op-inventory-0001',
					'sequence_number'     => '1',
					'operation_type'      => 'inventory_reservation',
					'domain'              => 'inventory',
					'action_name'         => 'inventory_reservation',
					'entity_type'         => 'inventory',
					'entity_id'           => 'inv-1001',
					'base_row_version'    => '4',
					'status'              => 'accepted',
					'result_code'         => 'inventory_reserved',
					'result_details_json' => '{"reservation_id":"res-1001"}',
					'conflict_id'         => null,
					'received_at'         => '2026-06-06 20:00:02.000000',
					'resolved_at'         => '2026-06-06 20:00:03',
					'row_version'         => '3',
				),
				$overrides
			);
		}
	}
}
