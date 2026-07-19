<?php
/**
 * Offline push existing operation rows repository tests.
 *
 * @package TCGStorePlatform
 */

namespace {
	if ( ! class_exists( 'wpdb' ) ) {
		class wpdb {
			public string $prefix = 'wp_';
		}
	}

	if ( ! class_exists( 'OfflinePushExistingOperationRowsWpdb' ) ) {
		class OfflinePushExistingOperationRowsWpdb extends \wpdb {
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
				++$this->get_results_count;
				$this->last_query       = $query;
				$this->last_output_type = $output_type;

				return $this->result_set;
			}
		}
	}
}

namespace TCGStorePlatform\Tests\Unit {
	use TCGStorePlatform\Offline\OfflineOperationEnvelope;
	use TCGStorePlatform\Offline\OfflinePushExistingOperationRowsQueryPlanner;
	use TCGStorePlatform\Offline\OfflinePushExistingOperationRowsRepository;
	use TCGStorePlatform\Offline\OfflinePushPayload;
	use TCGStorePlatform\Tests\TestCase;

	final class OfflinePushExistingOperationRowsRepositoryTest extends TestCase {
		public function test_repository_fetches_existing_operation_rows_for_replay(): void {
			$database = new \OfflinePushExistingOperationRowsWpdb(
				array(
					$this->existing_row(),
					$this->existing_row(
						array(
							'offline_queue_id'    => '502',
							'client_operation_id' => 'op-event-0001',
							'sequence_number'     => '2',
							'operation_type'      => 'event_reservation',
							'domain'              => 'event',
							'action_name'         => 'event_reservation',
							'entity_type'         => 'event',
							'entity_id'           => 'event-100',
							'base_row_version'    => '9',
							'status'              => 'conflict',
							'result_code'         => 'event_capacity_conflict',
							'result_details_json' => '{"conflict_id":"conflict-op-event-0001"}',
							'conflict_id'         => 'conflict-op-event-0001',
						)
					),
				)
			);
			$result   = ( new OfflinePushExistingOperationRowsRepository( $database ) )->fetch( $this->query_plan() );
			$audit    = $result->audit_payload();

			$this->assert_true( $result->is_fetched() );
			$this->assert_false( $result->is_rejected() );
			$this->assert_same( 'fetched', $result->status() );
			$this->assert_same( 2, count( $result->existing_operation_rows() ) );
			$this->assert_same( 2, count( $result->row_results() ) );
			$this->assert_same( 1, $database->prepare_count );
			$this->assert_same( 1, $database->get_results_count );
			$this->assert_contains( 'FROM `wp_tcg_offline_sync_queue`', $database->last_prepare_query );
			$this->assert_contains( '`client_operation_id` IN (%s, %s, %s)', $database->last_prepare_query );
			$this->assert_same(
				array( 42, 'op-inventory-0001', 'op-event-0001', 'op-credit-redemption-01' ),
				$database->last_prepare_args
			);
			$this->assert_same( 'ARRAY_A', $database->last_output_type );

			$inventory = $result->existing_operation_row( 'op-inventory-0001' );
			$event     = $result->existing_operation_row( 'op-event-0001' );

			$this->assert_same( 'accepted', $inventory['status'] );
			$this->assert_same( 'inventory_reserved', $inventory['result_code'] );
			$this->assert_same( array( 'reservation_id' => 'res-1001' ), $inventory['result_details'] );
			$this->assert_same( '2026-06-06T20:00:02.000000Z', $inventory['received_at'] );
			$this->assert_same( 3, $inventory['row_version'] );
			$this->assert_same( 'conflict', $event['status'] );
			$this->assert_same( 'conflict-op-event-0001', $event['conflict_id'] );
			$this->assert_same( 'offline_push_existing_operation_rows_repository', $audit['action'] );
			$this->assert_same( 2, $audit['existing_operation_row_count'] );
			$this->assert_true( $audit['explicit_execution_required'] );
			$this->assert_true( $audit['route_connected_reads_deferred'] );
			$this->assert_true( $audit['queue_replay_deferred'] );
			$this->assert_true( $audit['canonical_mutations_deferred'] );
		}

		public function test_repository_accepts_empty_existing_rows(): void {
			$database = new \OfflinePushExistingOperationRowsWpdb();
			$result   = ( new OfflinePushExistingOperationRowsRepository( $database ) )->fetch( $this->query_plan() );

			$this->assert_true( $result->is_fetched() );
			$this->assert_same( array(), $result->existing_operation_rows() );
			$this->assert_same( array(), $result->row_results() );
			$this->assert_same( array(), $result->errors() );
			$this->assert_same( 1, $database->prepare_count );
			$this->assert_same( 1, $database->get_results_count );
		}

		public function test_repository_rejects_invalid_query_plan_before_reads(): void {
			$database = new \OfflinePushExistingOperationRowsWpdb( array( $this->existing_row() ) );
			$result   = ( new OfflinePushExistingOperationRowsRepository( $database ) )->fetch(
				( new OfflinePushExistingOperationRowsQueryPlanner() )->plan(
					$this->payload(),
					0,
					'wp;drop_'
				)
			);

			$this->assert_true( $result->is_rejected() );
			$this->assert_same( array(), $result->existing_operation_rows() );
			$this->assert_same( 0, $database->prepare_count );
			$this->assert_same( 0, $database->get_results_count );
			$this->assert_true( in_array( 'existing_operation_rows_query_plan_invalid', $result->errors(), true ) );
			$this->assert_true( in_array( 'offline_device_id_invalid', $result->errors(), true ) );
			$this->assert_true( in_array( 'table_prefix_invalid', $result->errors(), true ) );
		}

		public function test_repository_rejects_database_failures(): void {
			$database = new \OfflinePushExistingOperationRowsWpdb( false );
			$result   = ( new OfflinePushExistingOperationRowsRepository( $database ) )->fetch( $this->query_plan() );

			$this->assert_true( $result->is_rejected() );
			$this->assert_same( array( 'existing_operation_rows_query_failed' ), $result->errors() );
			$this->assert_same( 1, $database->prepare_count );
			$this->assert_same( 1, $database->get_results_count );
		}

		public function test_repository_rejects_malformed_existing_rows(): void {
			$database = new \OfflinePushExistingOperationRowsWpdb(
				array(
					$this->existing_row(
						array(
							'offline_device_id'   => '99',
							'client_operation_id' => 'op-unexpected-0001',
							'result_details_json' => '{bad json',
							'resolved_at'         => 'not-a-date',
							'row_version'         => '0',
						)
					),
				)
			);
			$result   = ( new OfflinePushExistingOperationRowsRepository( $database ) )->fetch( $this->query_plan() );

			$this->assert_true( $result->is_rejected() );
			$this->assert_true( in_array( 'row_0_offline_device_id_mismatch', $result->errors(), true ) );
			$this->assert_true( in_array( 'row_0_client_operation_id_unexpected', $result->errors(), true ) );
			$this->assert_true( in_array( 'row_0_result_details_json_invalid', $result->errors(), true ) );
			$this->assert_true( in_array( 'row_0_resolved_at_invalid', $result->errors(), true ) );
			$this->assert_true( in_array( 'row_0_row_version_invalid', $result->errors(), true ) );
		}

		public function test_repository_rejects_duplicate_existing_rows(): void {
			$database = new \OfflinePushExistingOperationRowsWpdb(
				array(
					$this->existing_row(),
					$this->existing_row(
						array(
							'offline_queue_id' => '503',
							'sequence_number'  => '3',
						)
					),
				)
			);
			$result   = ( new OfflinePushExistingOperationRowsRepository( $database ) )->fetch( $this->query_plan() );

			$this->assert_true( $result->is_rejected() );
			$this->assert_same( 1, count( $result->existing_operation_rows() ) );
			$this->assert_true(
				in_array( 'op-inventory-0001_existing_operation_row_duplicate', $result->errors(), true )
			);
		}

		private function query_plan(): \TCGStorePlatform\Offline\OfflinePushExistingOperationRowsQueryPlan {
			return ( new OfflinePushExistingOperationRowsQueryPlanner() )->plan(
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
