<?php
/**
 * Route-aware offline push server snapshot provider tests.
 *
 * @package TCGStorePlatform
 */

namespace {
	if ( ! class_exists( 'wpdb' ) ) {
		class wpdb {
			public string $prefix = 'wp_';
		}
	}

	if ( ! class_exists( 'OfflinePushRouteServerSnapshotProviderWpdb' ) ) {
		class OfflinePushRouteServerSnapshotProviderWpdb extends \wpdb {
			public string $prefix = 'wp_';
			public int $prepare_count = 0;
			public int $get_row_count = 0;

			/**
			 * @var list<string>
			 */
			public array $prepare_queries = array();

			/**
			 * @param list<array<string, mixed>|null> $rows Database rows.
			 */
			public function __construct( private array $rows = array(), ?string $prefix = null ) {
				if ( null !== $prefix ) {
					$this->prefix = $prefix;
				}
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

			/**
			 * @return array<string, mixed>|null
			 */
			public function get_row( string $query, string $output_type ): ?array {
				unset( $query, $output_type );

				++$this->get_row_count;

				return array_shift( $this->rows );
			}
		}
	}
}

namespace TCGStorePlatform\Tests\Unit {
	use InvalidArgumentException;
	use RuntimeException;
	use TCGStorePlatform\Api\V1\OfflinePushRouteServerSnapshotProvider;
	use TCGStorePlatform\Api\V1\OfflineRestRequestData;
	use TCGStorePlatform\Offline\OfflineOperationEnvelope;
	use TCGStorePlatform\Offline\OfflinePushPayload;
	use TCGStorePlatform\Tests\TestCase;

	final class OfflinePushRouteServerSnapshotProviderTest extends TestCase {
		public function test_provider_fetches_repository_snapshots_from_route_context(): void {
			$database  = new \OfflinePushRouteServerSnapshotProviderWpdb( array( $this->inventory_row() ) );
			$provider  = new OfflinePushRouteServerSnapshotProvider( $database );
			$summary   = $provider->readiness_summary();
			$snapshots = $provider(
				$this->payload(),
				new OfflineRestRequestData( array(), array(), array(), array() ),
				array(
					'device_row' => array(
						'offline_device_id' => '42',
					),
				)
			);

			$this->assert_same( 'offline_push_route_server_snapshot_provider_ready', $summary['action'] );
			$this->assert_true( $summary['provider_ready'] );
			$this->assert_true( $summary['route_connected_reads_ready'] );
			$this->assert_true( $summary['explicit_execution_required'] );
			$this->assert_true( $summary['default_route_execution_deferred'] );
			$this->assert_same( 1, $database->prepare_count );
			$this->assert_same( 1, $database->get_row_count );
			$this->assert_contains( 'FROM `wp_tcg_inventory_items`', $database->prepare_queries[0] );
			$this->assert_same( 'available', $snapshots['op-push-route-01']['inventory']['status'] );
			$this->assert_same( 4, $snapshots['inventory:inv-1001']['inventory']['row_version'] );
		}

		public function test_provider_rejects_missing_device_context_before_reads(): void {
			$database = new \OfflinePushRouteServerSnapshotProviderWpdb( array( $this->inventory_row() ) );

			try {
				( new OfflinePushRouteServerSnapshotProvider( $database ) )(
					$this->payload(),
					new OfflineRestRequestData( array(), array(), array(), array() )
				);
			} catch ( InvalidArgumentException $exception ) {
				$this->assert_same( 'offline_push_snapshot_device_context_invalid', $exception->getMessage() );
				$this->assert_same( 0, $database->prepare_count );
				$this->assert_same( 0, $database->get_row_count );

				return;
			}

			throw new RuntimeException( 'Expected missing device context to reject snapshot provider reads.' );
		}

		public function test_provider_rejects_missing_snapshot_rows(): void {
			$database = new \OfflinePushRouteServerSnapshotProviderWpdb( array( null ) );

			try {
				( new OfflinePushRouteServerSnapshotProvider( $database ) )(
					$this->payload(),
					new OfflineRestRequestData( array(), array(), array(), array() ),
					array(
						'device_row' => array(
							'offline_device_id' => 42,
						),
					)
				);
			} catch ( InvalidArgumentException $exception ) {
				$this->assert_contains( 'op-push-route-01_snapshot_not_found', $exception->getMessage() );
				$this->assert_same( 1, $database->prepare_count );
				$this->assert_same( 1, $database->get_row_count );

				return;
			}

			throw new RuntimeException( 'Expected missing snapshot row to reject route snapshot provider.' );
		}

		private function payload(): OfflinePushPayload {
			return new OfflinePushPayload(
				'batch-route-snapshot-01',
				'device-main-01',
				array(
					new OfflineOperationEnvelope(
						'op-push-route-01',
						'device-main-01',
						3,
						22,
						'inventory_reservation',
						'inventory',
						'inv-1001',
						4,
						'2026-06-06T10:15:00-04:00',
						'2026-06-06T14:15:05Z',
						array(
							'localStatus' => 'offline_pending_sync',
						),
						array(),
						1
					),
				)
			);
		}

		/**
		 * @return array<string, mixed>
		 */
		private function inventory_row(): array {
			return array(
				'public_id'   => 'inv-1001',
				'status'      => 'available',
				'row_version' => '4',
				'updated_at'  => '2026-06-06 18:00:00',
			);
		}
	}
}
