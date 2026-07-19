<?php
/**
 * Offline conflict resolution repository tests.
 *
 * @package TCGStorePlatform
 */

namespace {
	if ( ! class_exists( 'wpdb' ) ) {
		class wpdb {
			public string $prefix = 'wp_';
			public int $prepare_count = 0;
			public int $query_count = 0;
			public string $last_prepare_query = '';
			public string $last_query = '';

			/**
			 * @var list<mixed>
			 */
			public array $last_prepare_args = array();

			public function __construct(
				private ?array $row = null,
				private int|false $query_result = 1
			) {
				unset( $this->row );
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

			public function query( string $query ): int|false {
				++$this->query_count;
				$this->last_query = $query;

				return $this->query_result;
			}
		}
	}
}

namespace TCGStorePlatform\Tests\Unit {
	use TCGStorePlatform\Offline\OfflineConflictResolutionPlan;
	use TCGStorePlatform\Offline\OfflineConflictResolutionPlanner;
	use TCGStorePlatform\Offline\OfflineConflictResolutionRepository;
	use TCGStorePlatform\Offline\OfflineConflictResolutionRequestParser;
	use TCGStorePlatform\Tests\TestCase;

	final class OfflineConflictResolutionRepositoryTest extends TestCase {
		public function test_repository_applies_prepared_conflict_resolution_update(): void {
			$database = new \wpdb( null, 1 );
			$result   = ( new OfflineConflictResolutionRepository( $database ) )->apply(
				$this->resolution_plan()
			);
			$audit    = $result->audit_payload();

			$this->assert_true( $result->is_applied() );
			$this->assert_same( 'applied', $result->status() );
			$this->assert_same( 1, $result->rows_affected() );
			$this->assert_same( array(), $result->errors() );
			$this->assert_same( 1, $database->prepare_count );
			$this->assert_same( 1, $database->query_count );
			$this->assert_contains( 'UPDATE `wp_tcg_sync_conflicts`', $database->last_prepare_query );
			$this->assert_contains( 'AND `status` IN (%s, %s, %s) LIMIT %d', $database->last_prepare_query );
			$this->assert_contains( 'prepared:UPDATE', $database->last_query );
			$this->assert_same( 13, count( $database->last_prepare_args ) );
			$this->assert_same( 'resolved', $database->last_prepare_args[0] );
			$this->assert_same( 'accept_device', $database->last_prepare_args[1] );
			$this->assert_same( 'conflict-main-01', $database->last_prepare_args[7] );
			$this->assert_same( 12, $database->last_prepare_args[8] );
			$this->assert_same( 'offline_conflict_resolution_repository', $audit['action'] );
			$this->assert_same( 'applied', $audit['status'] );
			$this->assert_same( 1, $audit['rows_affected'] );
			$this->assert_same( 13, $audit['query']['prepare_arg_count'] );
			$this->assert_false( array_key_exists( 'resolution_payload', $audit ) );
			$this->assert_false( array_key_exists( 'resolution_payload_json', $audit['query'] ) );
			$this->assert_same( 'applied', $result->response_payload()['write_status'] );
			$this->assert_false( $result->response_payload()['write_deferred'] );
		}

		public function test_repository_reports_stale_resolution_without_error(): void {
			$database = new \wpdb( null, 0 );
			$result   = ( new OfflineConflictResolutionRepository( $database ) )->apply(
				$this->resolution_plan()
			);

			$this->assert_true( $result->is_stale() );
			$this->assert_false( $result->is_applied() );
			$this->assert_same( 'stale', $result->status() );
			$this->assert_same( 0, $result->rows_affected() );
			$this->assert_same( array(), $result->errors() );
			$this->assert_same( 1, $database->prepare_count );
			$this->assert_same( 1, $database->query_count );
		}

		public function test_repository_rejects_invalid_plans_before_query(): void {
			$database = new \wpdb( null, 1 );
			$result   = ( new OfflineConflictResolutionRepository( $database ) )->apply(
				$this->manual_plan(
					array(
						'conflict_id'               => 'bad',
						'resolution_id'             => 'resolution-main-01',
						'status'                    => 'resolved',
						'resolution_action'         => 'accept_device',
						'resolved_by_manager_id'    => 15,
						'resolved_by_device_id'     => 'device-main-01',
						'resolved_at_utc'           => '2026-06-06T17:00:00Z',
						'updated_at_utc'            => '2026-06-06T18:05:00Z',
						'row_version'               => 13,
						'previous_row_version'      => 12,
						'expected_conflict_version' => 12,
						'resolution_payload'        => array(),
					)
				)
			);

			$this->assert_true( $result->is_rejected() );
			$this->assert_same( null, $result->rows_affected() );
			$this->assert_same( 0, $database->prepare_count );
			$this->assert_same( 0, $database->query_count );
			$this->assert_true( in_array( 'conflict_id_invalid', $result->errors(), true ) );
		}

		public function test_repository_rejects_failed_database_updates(): void {
			$database = new \wpdb( null, false );
			$result   = ( new OfflineConflictResolutionRepository( $database ) )->apply(
				$this->resolution_plan()
			);

			$this->assert_true( $result->is_rejected() );
			$this->assert_same( null, $result->rows_affected() );
			$this->assert_same( 1, $database->prepare_count );
			$this->assert_same( 1, $database->query_count );
			$this->assert_same( array( 'conflict_resolution_update_failed' ), $result->errors() );
		}

		public function test_repository_rejects_unexpected_row_counts(): void {
			$database = new \wpdb( null, 2 );
			$result   = ( new OfflineConflictResolutionRepository( $database ) )->apply(
				$this->resolution_plan()
			);

			$this->assert_true( $result->is_rejected() );
			$this->assert_same( 2, $result->rows_affected() );
			$this->assert_same( 1, $database->prepare_count );
			$this->assert_same( 1, $database->query_count );
			$this->assert_same( array( 'conflict_resolution_unexpected_rows' ), $result->errors() );
		}

		private function resolution_plan(): OfflineConflictResolutionPlan {
			$result = ( new OfflineConflictResolutionRequestParser() )->parse(
				'conflict-main-01',
				array(
					'device_id'                 => 'device-main-01',
					'manager_id'                => 15,
					'resolution_action'         => 'accept_device',
					'resolution_note'           => 'Staff verified scan.',
					'expected_conflict_version' => 12,
					'resolved_at_utc'           => '2026-06-06T17:00:00Z',
					'resolution_payload'        => array(
						'accepted_inventory_status' => 'sold',
					),
					'schema_version'            => 1,
				),
				'resolution-main-01'
			);

			$this->assert_true( $result->is_valid() );
			$request = $result->request();
			$this->assert_true( null !== $request );

			return ( new OfflineConflictResolutionPlanner() )->plan(
				$request,
				array(
					'conflict_id'        => 'conflict-main-01',
					'status'             => 'open',
					'entity_type'        => 'inventory',
					'entity_id'          => 'inv-1001',
					'conflict_type'      => 'double_sell',
					'row_version'        => 12,
					'resolution_options' => array( 'accept_server', 'accept_device', 'manager_adjust' ),
				),
				'2026-06-06T18:05:00Z'
			);
		}

		/**
		 * @param array<string, mixed> $update_row Future update row.
		 */
		private function manual_plan( array $update_row ): OfflineConflictResolutionPlan {
			return new OfflineConflictResolutionPlan(
				$update_row,
				array(),
				array(
					'action' => 'offline_conflict_resolution_planned',
				)
			);
		}
	}
}
