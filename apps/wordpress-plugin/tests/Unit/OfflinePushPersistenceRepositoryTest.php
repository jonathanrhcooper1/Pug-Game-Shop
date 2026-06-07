<?php
/**
 * Offline push persistence repository tests.
 *
 * @package TCGStorePlatform
 */

namespace {
	if ( ! class_exists( 'wpdb' ) ) {
		class wpdb {
			public string $prefix = 'wp_';
		}
	}

	if ( ! class_exists( 'OfflinePushPersistenceWpdb' ) ) {
		class OfflinePushPersistenceWpdb extends \wpdb {
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
	use TCGStorePlatform\Offline\OfflinePushBatchResolutionPlan;
	use TCGStorePlatform\Offline\OfflinePushBatchResolver;
	use TCGStorePlatform\Offline\OfflinePushPayload;
	use TCGStorePlatform\Offline\OfflinePushPayloadParser;
	use TCGStorePlatform\Offline\OfflinePushPersistencePlanner;
	use TCGStorePlatform\Offline\OfflinePushPersistenceRepository;
	use TCGStorePlatform\Tests\TestCase;

	final class OfflinePushPersistenceRepositoryTest extends TestCase {
		public function test_repository_persists_prepared_queue_and_conflict_inserts(): void {
			$database = new \OfflinePushPersistenceWpdb( array( 1, 1, 1, 1 ) );
			$result   = ( new OfflinePushPersistenceRepository( $database ) )->persist( $this->plan() );
			$audit    = $result->audit_payload();

			$this->assert_true( $result->is_persisted() );
			$this->assert_false( $result->is_rejected() );
			$this->assert_same( 'persisted', $result->status() );
			$this->assert_same( 4, $result->rows_affected() );
			$this->assert_same( 3, $result->operation_rows_affected() );
			$this->assert_same( 1, $result->conflict_rows_affected() );
			$this->assert_same( 0, $result->operation_replay_count() );
			$this->assert_same( array(), $result->operation_replay_ids() );
			$this->assert_same( 4, $database->prepare_count );
			$this->assert_same( 4, $database->query_count );
			$this->assert_contains( 'INSERT INTO `wp_tcg_offline_sync_queue`', $database->prepare_queries[0] );
			$this->assert_contains( 'INSERT INTO `wp_tcg_sync_conflicts`', $database->prepare_queries[3] );
			$this->assert_same( 18, count( $database->prepare_args[0] ) );
			$this->assert_same( 19, count( $database->prepare_args[2] ) );
			$this->assert_same( 19, count( $database->prepare_args[3] ) );
			$this->assert_same( 'op-inventory-0001', $result->operation_results()[0]['client_operation_id'] );
			$this->assert_same( 'accepted', $result->operation_results()[0]['status'] );
			$this->assert_false( $result->operation_results()[0]['has_conflict_id'] );
			$this->assert_same( 'op-credit-redemption-01', $result->operation_results()[2]['client_operation_id'] );
			$this->assert_true( $result->operation_results()[2]['has_conflict_id'] );
			$this->assert_same( 'open', $result->conflict_results()[0]['status'] );
			$this->assert_same( 'offline_push_persistence_repository', $audit['action'] );
			$this->assert_same( 3, $audit['operation_query_count'] );
			$this->assert_same( 1, $audit['conflict_query_count'] );
			$this->assert_same( 0, $audit['operation_replay_count'] );
			$this->assert_same( array(), $audit['operation_replay_ids'] );
			$this->assert_true( $audit['explicit_execution_required'] );
			$this->assert_true( $audit['route_connected_writes_deferred'] );
			$this->assert_true( $audit['queue_replay_deferred'] );
			$this->assert_true( $audit['canonical_mutations_deferred'] );
		}

		public function test_repository_accepts_replay_only_plans_without_database_writes(): void {
			$database = new \OfflinePushPersistenceWpdb();
			$result   = ( new OfflinePushPersistenceRepository( $database ) )->persist( $this->replay_plan() );
			$audit    = $result->audit_payload();

			$this->assert_true( $result->is_persisted() );
			$this->assert_same( 0, $result->rows_affected() );
			$this->assert_same( 1, $result->operation_replay_count() );
			$this->assert_same( array( 'op-inventory-0001' ), $result->operation_replay_ids() );
			$this->assert_same( 1, $audit['operation_replay_count'] );
			$this->assert_same( array( 'op-inventory-0001' ), $audit['operation_replay_ids'] );
			$this->assert_same( array(), $result->operation_results() );
			$this->assert_same( array(), $result->conflict_results() );
			$this->assert_same( 0, $database->prepare_count );
			$this->assert_same( 0, $database->query_count );
		}

		public function test_repository_rejects_invalid_query_plans_before_database_writes(): void {
			$database = new \OfflinePushPersistenceWpdb( array( 1 ), 'wp-bad_' );
			$result   = ( new OfflinePushPersistenceRepository( $database ) )->persist( $this->plan() );

			$this->assert_true( $result->is_rejected() );
			$this->assert_same( 0, $result->rows_affected() );
			$this->assert_same( 0, $database->prepare_count );
			$this->assert_same( 0, $database->query_count );
			$this->assert_true( in_array( 'table_prefix_invalid', $result->errors(), true ) );
		}

		public function test_repository_rejects_failed_operation_insert(): void {
			$database = new \OfflinePushPersistenceWpdb( array( 1, false ) );
			$result   = ( new OfflinePushPersistenceRepository( $database ) )->persist( $this->plan() );

			$this->assert_true( $result->is_rejected() );
			$this->assert_same( 1, $result->rows_affected() );
			$this->assert_same( 2, $database->prepare_count );
			$this->assert_same( 2, $database->query_count );
			$this->assert_same( array( 'op-event-0001_operation_insert_failed' ), $result->errors() );
		}

		public function test_repository_rejects_invalid_conflict_rows_affected_results(): void {
			$database = new \OfflinePushPersistenceWpdb( array( 1, 1, 1, -1 ) );
			$result   = ( new OfflinePushPersistenceRepository( $database ) )->persist( $this->plan() );

			$this->assert_true( $result->is_rejected() );
			$this->assert_same( 3, $result->operation_rows_affected() );
			$this->assert_same( 0, $result->conflict_rows_affected() );
			$this->assert_same( 4, $database->prepare_count );
			$this->assert_same( 4, $database->query_count );
			$this->assert_contains( '_conflict_insert_invalid_rows_affected', $result->errors()[0] );
		}

		private function plan(): \TCGStorePlatform\Offline\OfflinePushPersistencePlan {
			$payload    = $this->push_payload();
			$resolution = $this->resolution( $payload );

			return ( new OfflinePushPersistencePlanner() )->plan(
				$payload,
				$resolution,
				$this->device_row(),
				'2026-06-06T20:00:02Z'
			);
		}

		private function replay_plan(): \TCGStorePlatform\Offline\OfflinePushPersistencePlan {
			$payload    = $this->push_payload( array( $this->inventory_operation_payload() ) );
			$resolution = $this->resolution( $payload );

			return ( new OfflinePushPersistencePlanner() )->plan(
				$payload,
				$resolution,
				$this->device_row(),
				'2026-06-06T20:00:02Z',
				array(
					'op-inventory-0001' => array(
						'client_operation_id' => 'op-inventory-0001',
						'status'              => 'accepted',
						'result_code'         => 'inventory_reserved',
					),
				)
			);
		}

		private function resolution( OfflinePushPayload $payload ): OfflinePushBatchResolutionPlan {
			return ( new OfflinePushBatchResolver() )->resolve(
				$payload,
				array(
					'op-inventory-0001'       => array(
						'inventory' => array(
							'status'     => 'available',
							'rowVersion' => 4,
						),
					),
					'event:event-100'         => array(
						'event' => array(
							'seatsRemaining' => 0,
							'waitlistEnabled' => true,
							'rowVersion'     => 9,
						),
					),
					'op-credit-redemption-01' => array(
						'customer' => array(
							'creditBalanceMinorUnits' => 1000,
							'rowVersion'              => 6,
						),
					),
				),
				'2026-06-06T20:00:00Z'
			);
		}

		/**
		 * @return array<string, mixed>
		 */
		private function device_row(): array {
			return array(
				'offline_device_id' => 42,
				'public_id'         => 'device-main-01',
			);
		}

		/**
		 * @param list<array<string, mixed>>|null $operations Operation payloads.
		 */
		private function push_payload( ?array $operations = null ): OfflinePushPayload {
			$result = ( new OfflinePushPayloadParser() )->parse(
				array(
					'batch_id'   => 'body-batch-ignored',
					'device_id'  => 'device-main-01',
					'operations' => $operations ?? array(
						$this->inventory_operation_payload(),
						$this->event_operation_payload(),
						$this->credit_operation_payload(),
					),
				),
				'batch-main-01'
			);

			$this->assert_true( $result->is_valid() );

			$payload = $result->payload();
			$this->assert_true( null !== $payload );

			return $payload;
		}

		/**
		 * @return array<string, mixed>
		 */
		private function inventory_operation_payload(): array {
			return array(
				'client_operation_id' => 'op-inventory-0001',
				'device_id'           => 'device-main-01',
				'location_id'         => 3,
				'actor_id'            => 22,
				'operation_type'      => 'inventory_reservation',
				'entity_type'         => 'inventory',
				'entity_id'           => 'inv-1001',
				'base_row_version'    => 4,
				'occurred_at_local'   => '2026-06-06T10:15:00-04:00',
				'queued_at_utc'       => '2026-06-06T14:15:05Z',
				'payload'             => array( 'localStatus' => 'offline_pending_sync' ),
				'schema_version'      => 1,
			);
		}

		/**
		 * @return array<string, mixed>
		 */
		private function event_operation_payload(): array {
			return array(
				'client_operation_id' => 'op-event-0001',
				'device_id'           => 'device-main-01',
				'location_id'         => 3,
				'actor_id'            => 22,
				'operation_type'      => 'event_reservation',
				'entity_type'         => 'event',
				'entity_id'           => 'event-100',
				'base_row_version'    => 9,
				'occurred_at_local'   => '2026-06-06T11:15:00-04:00',
				'queued_at_utc'       => '2026-06-06T15:15:05Z',
				'payload'             => array(),
				'schema_version'      => 1,
			);
		}

		/**
		 * @return array<string, mixed>
		 */
		private function credit_operation_payload(): array {
			return array(
				'client_operation_id' => 'op-credit-redemption-01',
				'device_id'           => 'device-main-01',
				'location_id'         => 3,
				'actor_id'            => 22,
				'operation_type'      => 'credit_redemption',
				'entity_type'         => 'customer_credit',
				'entity_id'           => 'customer-100',
				'base_row_version'    => 6,
				'occurred_at_local'   => '2026-06-06T12:15:00-04:00',
				'queued_at_utc'       => '2026-06-06T16:15:05Z',
				'payload'             => array(
					'amountMinorUnits'        => 4500,
					'cachedBalanceMinorUnits' => 5000,
				),
				'schema_version'      => 1,
			);
		}
	}
}
