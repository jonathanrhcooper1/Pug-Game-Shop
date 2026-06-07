<?php
/**
 * Offline push server snapshot repository tests.
 *
 * @package TCGStorePlatform
 */

namespace {
	if ( ! class_exists( 'wpdb' ) ) {
		class wpdb {
			public string $prefix = 'wp_';
		}
	}

	if ( ! class_exists( 'OfflinePushServerSnapshotWpdb' ) ) {
		class OfflinePushServerSnapshotWpdb extends \wpdb {
			public string $prefix = 'wp_';
			public int $prepare_count = 0;
			public int $get_row_count = 0;

			/**
			 * @var list<string>
			 */
			public array $prepare_queries = array();

			/**
			 * @var list<list<mixed>>
			 */
			public array $prepare_args = array();

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
				++$this->prepare_count;
				$this->prepare_queries[] = $query;
				$this->prepare_args[]    = array_values( $args );

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
	use TCGStorePlatform\Offline\OfflineOperationEnvelope;
	use TCGStorePlatform\Offline\OfflinePushPayload;
	use TCGStorePlatform\Offline\OfflinePushServerSnapshotQueryPlanner;
	use TCGStorePlatform\Offline\OfflinePushServerSnapshotRepository;
	use TCGStorePlatform\Tests\TestCase;

	final class OfflinePushServerSnapshotRepositoryTest extends TestCase {
		public function test_repository_fetches_server_snapshots_for_push_resolution(): void {
			$database = new \OfflinePushServerSnapshotWpdb(
				array(
					$this->inventory_row(),
					$this->event_row(),
					$this->customer_row(),
				)
			);
			$result   = ( new OfflinePushServerSnapshotRepository( $database ) )->fetch( $this->query_plan() );
			$audit    = $result->audit_payload();

			$this->assert_true( $result->is_fetched() );
			$this->assert_false( $result->is_rejected() );
			$this->assert_same( 'fetched', $result->status() );
			$this->assert_same( 3, count( $result->operation_snapshots() ) );
			$this->assert_same( 6, count( $result->server_snapshots() ) );
			$this->assert_same( 3, count( $result->fetch_results() ) );
			$this->assert_same( 3, $database->prepare_count );
			$this->assert_same( 3, $database->get_row_count );
			$this->assert_contains( 'FROM `wp_tcg_inventory_items`', $database->prepare_queries[0] );
			$this->assert_same( array( 'inv-1001' ), $database->prepare_args[0] );

			$inventory = $result->operation_snapshot( 'op-inventory-0001' );
			$event     = $result->server_snapshots()['event:event-100'];
			$customer  = $result->operation_snapshot( 'op-credit-redemption-01' );

			$this->assert_same( 'available', $inventory['inventory']['status'] );
			$this->assert_same( 4, $inventory['inventory']['row_version'] );
			$this->assert_same( 1, $event['event']['seatsRemaining'] );
			$this->assert_true( $event['event']['waitlist_enabled'] );
			$this->assert_false( array_key_exists( 'topdeck_enabled', $event['event'] ) );
			$this->assert_same( 5025, $customer['customer']['creditBalanceMinorUnits'] );
			$this->assert_same( 6, $customer['customer']['row_version'] );
			$this->assert_same( 'offline_push_server_snapshot_repository', $audit['action'] );
			$this->assert_same( 3, $audit['operation_snapshot_count'] );
			$this->assert_same( 6, $audit['server_snapshot_key_count'] );
			$this->assert_true( $audit['explicit_execution_required'] );
			$this->assert_true( $audit['route_connected_reads_deferred'] );
			$this->assert_true( $audit['canonical_mutations_deferred'] );
		}

		public function test_repository_rejects_invalid_query_plan_before_reads(): void {
			$database = new \OfflinePushServerSnapshotWpdb( array( $this->inventory_row() ) );
			$plan     = ( new OfflinePushServerSnapshotQueryPlanner() )->plan(
				$this->payload(),
				0,
				'wp;bad_'
			);
			$result   = ( new OfflinePushServerSnapshotRepository( $database ) )->fetch( $plan );

			$this->assert_true( $result->is_rejected() );
			$this->assert_same( array(), $result->server_snapshots() );
			$this->assert_same( 0, $database->prepare_count );
			$this->assert_same( 0, $database->get_row_count );
			$this->assert_true( in_array( 'snapshot_query_plan_invalid', $result->errors(), true ) );
			$this->assert_true( in_array( 'offline_device_id_invalid', $result->errors(), true ) );
			$this->assert_true( in_array( 'table_prefix_invalid', $result->errors(), true ) );
		}

		public function test_repository_rejects_missing_snapshot_rows(): void {
			$database = new \OfflinePushServerSnapshotWpdb(
				array(
					$this->inventory_row(),
					null,
					$this->customer_row(),
				)
			);
			$result   = ( new OfflinePushServerSnapshotRepository( $database ) )->fetch( $this->query_plan() );

			$this->assert_true( $result->is_rejected() );
			$this->assert_same( 2, $database->prepare_count );
			$this->assert_same( 2, $database->get_row_count );
			$this->assert_same( 1, count( $result->operation_snapshots() ) );
			$this->assert_true( in_array( 'op-event-0001_snapshot_not_found', $result->errors(), true ) );
			$this->assert_false( $result->fetch_results()[1]['row_found'] );
		}

		public function test_repository_rejects_malformed_snapshot_rows(): void {
			$row                = $this->event_row();
			$row['row_version'] = 'not-a-version';
			$database           = new \OfflinePushServerSnapshotWpdb(
				array(
					$this->inventory_row(),
					$row,
				)
			);
			$result             = ( new OfflinePushServerSnapshotRepository( $database ) )->fetch( $this->query_plan() );

			$this->assert_true( $result->is_rejected() );
			$this->assert_same( 2, $database->prepare_count );
			$this->assert_same( 2, $database->get_row_count );
			$this->assert_true( in_array( 'op-event-0001_row_version_invalid', $result->errors(), true ) );
			$this->assert_true( $result->fetch_results()[1]['row_found'] );
		}

		private function query_plan(): \TCGStorePlatform\Offline\OfflinePushServerSnapshotQueryPlan {
			return ( new OfflinePushServerSnapshotQueryPlanner() )->plan(
				$this->payload(),
				42,
				'wp_'
			);
		}

		private function payload(): OfflinePushPayload {
			return new OfflinePushPayload(
				'batch-main-01',
				'device-main-01',
				array(
					$this->operation( 'op-inventory-0001', 'inventory_reservation', 'inventory', 'inv-1001', 4 ),
					$this->operation( 'op-event-0001', 'event_reservation', 'event', 'event-100', 9 ),
					$this->operation( 'op-credit-redemption-01', 'credit_redemption', 'customer_credit', 'customer-100', 6 ),
				)
			);
		}

		private function operation(
			string $operation_id,
			string $operation_type,
			string $entity_type,
			string $entity_id,
			?int $base_row_version = null
		): OfflineOperationEnvelope {
			return new OfflineOperationEnvelope(
				$operation_id,
				'device-main-01',
				3,
				22,
				$operation_type,
				$entity_type,
				$entity_id,
				$base_row_version,
				'2026-06-06T10:15:00-04:00',
				'2026-06-06T14:15:05Z',
				array(),
				array(),
				1
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

		/**
		 * @return array<string, mixed>
		 */
		private function event_row(): array {
			return array(
				'public_id'           => 'event-100',
				'player_cap'          => '16',
				'registered_count'    => '15',
				'waitlist_enabled'    => '1',
				'registration_status' => 'open',
				'registration_mode'   => 'local_only',
				'row_version'         => '9',
				'updated_at'          => '2026-06-06 18:01:00',
			);
		}

		/**
		 * @return array<string, mixed>
		 */
		private function customer_row(): array {
			return array(
				'public_id'       => 'customer-100',
				'credit_balance'  => '50.25',
				'credit_currency' => 'USD',
				'credit_version'  => '2',
				'status'          => 'active',
				'row_version'     => '6',
				'updated_at'      => '2026-06-06 18:02:00',
			);
		}
	}
}
