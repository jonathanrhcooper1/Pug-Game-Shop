<?php
/**
 * Offline push route handler factory tests.
 *
 * @package TCGStorePlatform
 */

namespace {
	if ( ! class_exists( 'wpdb' ) ) {
		class wpdb {
			public string $prefix = 'wp_';
		}
	}

	if ( ! class_exists( 'OfflinePushRouteHandlerFactoryWpdb' ) ) {
		class OfflinePushRouteHandlerFactoryWpdb extends \wpdb {
			public string $prefix = 'wp_';
			public int $prepare_count = 0;
			public int $get_row_count = 0;
			public int $get_results_count = 0;
			public int $query_count = 0;
			public string $last_query = '';

			/**
			 * @var list<string>
			 */
			public array $prepare_queries = array();

			/**
			 * @param array<string, mixed>|null $device_row Registered device row.
			 * @param list<int|false>           $query_results Query results.
			 * @param list<array<string, mixed>|null> $snapshot_rows Snapshot rows.
			 * @param list<array<string, mixed>>|false $existing_operation_rows Existing queue rows.
			 */
			public function __construct(
				private ?array $device_row = null,
				private array $query_results = array(),
				private array $snapshot_rows = array(),
				private array|false $existing_operation_rows = array(),
				?string $prefix = null
			) {
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
				unset( $output_type );

				++$this->get_row_count;
				$this->last_query = $query;

				if ( 1 < $this->get_row_count ) {
					return array_shift( $this->snapshot_rows );
				}

				return $this->device_row;
			}

			/**
			 * @return list<array<string, mixed>>|false
			 */
			public function get_results( string $query, string $output_type ): array|false {
				unset( $output_type );

				++$this->get_results_count;
				$this->last_query = $query;

				return $this->existing_operation_rows;
			}

			public function query( string $query ): int|false {
				++$this->query_count;
				$this->last_query = $query;

				if ( array() === $this->query_results ) {
					return 1;
				}

				return array_shift( $this->query_results );
			}
		}
	}
}

namespace TCGStorePlatform\Tests\Unit {
	use TCGStorePlatform\Api\V1\OfflinePushRouteHandlerFactory;
	use TCGStorePlatform\Api\V1\OfflinePushRouteOperationOptionsProvider;
	use TCGStorePlatform\Api\V1\OfflinePushRouteServerSnapshotProvider;
	use TCGStorePlatform\Api\V1\OfflineRegisteredDeviceSyncRouteHandlerFactory;
	use TCGStorePlatform\Offline\OfflineDeviceTokenAuthenticator;
	use TCGStorePlatform\Tests\TestCase;

	final class OfflinePushRouteHandlerFactoryTest extends TestCase {
		private const DEVICE_TOKEN = 'test-device-token-abcdefghijklmnopqrstuvwxyz-123456';

		public function test_factory_keeps_route_connected_push_deferred_by_default(): void {
			$database = new \OfflinePushRouteHandlerFactoryWpdb( $this->database_row(), array( 1 ) );
			$factory  = new OfflinePushRouteHandlerFactory(
				static fn (): \wpdb => $database,
				null,
				$this->server_time_provider(),
				$this->server_snapshots_provider()
			);
			$summary  = $factory->readiness_summary();
			$response = $factory->handler()->handle( $this->push_request_data() );

			$this->assert_true( $summary['handler_factory_ready'] );
			$this->assert_false( $summary['route_connected_execution_enabled'] );
			$this->assert_true( $summary['database_configured'] );
			$this->assert_true( $summary['permission_resolver_configured'] );
			$this->assert_true( $summary['server_snapshot_provider_configured'] );
			$this->assert_false( $summary['route_connected_handler_ready'] );
			$this->assert_true( $summary['route_connected_handler_deferred'] );
			$this->assert_true( $summary['route_connected_queue_writes_deferred'] );
			$this->assert_true( $summary['route_connected_conflict_writes_deferred'] );
			$this->assert_same( array(), $summary['configuration_issues'] );
			$this->assert_same( 'validated', $response['status'] );
			$this->assert_same( 'offline_request_validated', $response['code'] );
			$this->assert_true( $response['data']['push_queue_persistence_deferred'] );
			$this->assert_same( 0, $database->get_row_count );
			$this->assert_same( 0, $database->query_count );
		}

		public function test_factory_composes_route_connected_push_handler_when_explicitly_enabled(): void {
			$database = new \OfflinePushRouteHandlerFactoryWpdb( $this->database_row(), array( 1 ) );
			$factory  = new OfflinePushRouteHandlerFactory(
				static fn (): \wpdb => $database,
				null,
				$this->server_time_provider(),
				$this->server_snapshots_provider(),
				null,
				null,
				true
			);
			$summary  = $factory->readiness_summary();
			$response = $factory->handler()->handle( $this->push_request_data() );

			$this->assert_true( $summary['route_connected_execution_enabled'] );
			$this->assert_true( $summary['database_configured'] );
			$this->assert_true( $summary['permission_resolver_configured'] );
			$this->assert_true( $summary['persistence_provider_configured'] );
			$this->assert_true( $summary['existing_operation_rows_provider_configured'] );
			$this->assert_true( $summary['existing_operation_rows_route_provider_ready'] );
			$this->assert_true( $summary['canonical_mutation_planner_ready'] );
			$this->assert_true( $summary['canonical_mutation_sql_ready'] );
			$this->assert_true( $summary['canonical_mutation_repository_ready'] );
			$this->assert_true( $summary['canonical_mutation_repository_execution_gate_ready'] );
			$this->assert_true( $summary['canonical_mutation_transaction_preflight_ready'] );
			$this->assert_true( $summary['canonical_mutation_transaction_executor_ready'] );
			$this->assert_false( $summary['route_connected_canonical_mutation_planning_deferred'] );
			$this->assert_false( $summary['route_connected_canonical_mutation_sql_planning_deferred'] );
			$this->assert_true( $summary['route_connected_canonical_mutation_sql_execution_deferred'] );
			$this->assert_false( $summary['route_connected_canonical_mutation_repository_planning_deferred'] );
			$this->assert_true( $summary['route_connected_canonical_mutation_repository_execution_deferred'] );
			$this->assert_true( $summary['route_connected_canonical_mutation_repository_execution_gate_deferred'] );
			$this->assert_true( $summary['route_connected_canonical_mutation_repository_transaction_deferred'] );
			$this->assert_true( $summary['route_connected_canonical_mutation_transaction_preflight_deferred'] );
			$this->assert_true( $summary['route_connected_canonical_mutation_transaction_executor_deferred'] );
			$this->assert_true( $summary['route_connected_canonical_mutation_transaction_execution_deferred'] );
			$this->assert_true( $summary['route_connected_canonical_repository_deferred'] );
			$this->assert_true( $summary['route_connected_canonical_writes_deferred'] );
			$this->assert_true( $summary['route_connected_handler_ready'] );
			$this->assert_false( $summary['route_connected_handler_deferred'] );
			$this->assert_false( $summary['route_connected_existing_operation_rows_deferred'] );
			$this->assert_false( $summary['route_connected_queue_writes_deferred'] );
			$this->assert_false( $summary['route_connected_conflict_writes_deferred'] );
			$this->assert_same( 'ready', $response['status'] );
			$this->assert_same( 'offline_push_response_ready', $response['code'] );
			$this->assert_same( 'accepted', $response['data']['results'][0]['status'] );
			$this->assert_same( 'inventory_reserved', $response['data']['results'][0]['code'] );
			$this->assert_same( 'inserted', $response['data']['results'][0]['persistence']['status'] );
			$this->assert_false( $response['data']['results'][0]['persistence']['replayed'] );
			$this->assert_same( 'resolution_plan', $response['data']['results'][0]['persistence']['response_source'] );
			$this->assert_same(
				array( 'op-push-route-01' => 'inserted' ),
				$response['data']['operation_persistence_statuses']
			);
			$this->assert_same( 0, $response['data']['operation_replay_response_hydrated_count'] );
			$this->assert_same( array(), $response['data']['operation_replay_response_hydrated_ids'] );
			$this->assert_same( 1, $response['data']['canonical_mutation_count'] );
			$this->assert_same( array( 'op-push-route-01' ), $response['data']['canonical_mutation_operation_ids'] );
			$this->assert_same( array(), $response['data']['canonical_mutation_skipped_ids'] );
			$this->assert_false( $response['data']['canonical_mutation_planning_deferred'] );
			$this->assert_same( 1, $response['data']['canonical_mutation_sql_query_count'] );
			$this->assert_same( array( 'op-push-route-01' ), $response['data']['canonical_mutation_sql_operation_ids'] );
			$this->assert_same( 6, $response['data']['canonical_mutation_sql_prepare_arg_count'] );
			$this->assert_false( $response['data']['canonical_mutation_sql_planning_deferred'] );
			$this->assert_true( $response['data']['canonical_mutation_sql_execution_deferred'] );
			$this->assert_true( $response['data']['canonical_mutation_repository_deferred'] );
			$this->assert_same( 'deferred', $response['data']['canonical_mutation_repository_status'] );
			$this->assert_same( 1, $response['data']['canonical_mutation_repository_query_count'] );
			$this->assert_same( array( 'op-push-route-01' ), $response['data']['canonical_mutation_repository_operation_ids'] );
			$this->assert_same( 6, $response['data']['canonical_mutation_repository_prepare_arg_count'] );
			$this->assert_same( 0, $response['data']['canonical_mutation_repository_rows_affected'] );
			$this->assert_same( array(), $response['data']['canonical_mutation_repository_errors'] );
			$this->assert_true( $response['data']['canonical_mutation_repository_execution_deferred'] );
			$this->assert_same( 'blocked', $response['data']['canonical_mutation_repository_execution_status'] );
			$this->assert_true( $response['data']['canonical_mutation_repository_execution_blocked'] );
			$this->assert_false( $response['data']['canonical_mutation_repository_execution_ready'] );
			$this->assert_true(
				in_array(
					'canonical_mutation_repository_execution_disabled',
					$response['data']['canonical_mutation_repository_execution_block_reasons'],
					true
				)
			);
			$this->assert_true(
				in_array(
					'canonical_mutation_repository_transaction_adapter_deferred',
					$response['data']['canonical_mutation_repository_execution_block_reasons'],
					true
				)
			);
			$this->assert_true( $response['data']['canonical_mutation_repository_transaction_deferred'] );
			$this->assert_same( 'blocked', $response['data']['canonical_mutation_transaction_preflight_status'] );
			$this->assert_true( $response['data']['canonical_mutation_transaction_preflight_blocked'] );
			$this->assert_false( $response['data']['canonical_mutation_transaction_preflight_ready'] );
			$this->assert_same( 1, $response['data']['canonical_mutation_transaction_preflight_ready_count'] );
			$this->assert_same( 0, $response['data']['canonical_mutation_transaction_preflight_blocked_count'] );
			$this->assert_same(
				array( 'op-push-route-01' ),
				$response['data']['canonical_mutation_transaction_preflight_operation_ids']
			);
			$this->assert_true(
				in_array(
					'canonical_mutation_repository_execution_disabled',
					$response['data']['canonical_mutation_transaction_preflight_block_reasons'],
					true
				)
			);
			$this->assert_true( $response['data']['canonical_mutation_transaction_execution_deferred'] );
			$this->assert_same( 'persisted', $response['meta']['persistence_status'] );
			$this->assert_same( 1, $response['meta']['operation_rows_affected'] );
			$this->assert_same( 0, $response['meta']['conflict_rows_affected'] );
			$this->assert_false( $response['meta']['push_queue_persistence_deferred'] );
			$this->assert_false( $response['meta']['push_canonical_mutation_planning_deferred'] );
			$this->assert_false( $response['meta']['push_canonical_mutation_sql_planning_deferred'] );
			$this->assert_true( $response['meta']['push_canonical_mutation_sql_execution_deferred'] );
			$this->assert_false( $response['meta']['push_canonical_mutation_repository_staging_deferred'] );
			$this->assert_true( $response['meta']['push_canonical_mutation_repository_execution_deferred'] );
			$this->assert_true( $response['meta']['push_canonical_mutation_repository_execution_gate_deferred'] );
			$this->assert_true( $response['meta']['push_canonical_mutation_repository_transaction_deferred'] );
			$this->assert_true( $response['meta']['push_canonical_mutation_transaction_preflight_deferred'] );
			$this->assert_true( $response['meta']['push_canonical_mutation_transaction_execution_deferred'] );
			$this->assert_true( $response['meta']['push_canonical_mutation_repository_deferred'] );
			$this->assert_true( $response['meta']['push_canonical_mutations_deferred'] );
			$this->assert_same( 1, $response['meta']['canonical_mutation_count'] );
			$this->assert_same( array( 'op-push-route-01' ), $response['meta']['canonical_mutation_operation_ids'] );
			$this->assert_same( 1, $response['meta']['canonical_mutation_sql_query_count'] );
			$this->assert_same( array( 'op-push-route-01' ), $response['meta']['canonical_mutation_sql_operation_ids'] );
			$this->assert_same( 6, $response['meta']['canonical_mutation_sql_prepare_arg_count'] );
			$this->assert_same( 'deferred', $response['meta']['canonical_mutation_repository_status'] );
			$this->assert_same( 1, $response['meta']['canonical_mutation_repository_query_count'] );
			$this->assert_same( array( 'op-push-route-01' ), $response['meta']['canonical_mutation_repository_operation_ids'] );
			$this->assert_same( 6, $response['meta']['canonical_mutation_repository_prepare_arg_count'] );
			$this->assert_same( 0, $response['meta']['canonical_mutation_repository_rows_affected'] );
			$this->assert_same( 'blocked', $response['meta']['canonical_mutation_repository_execution_status'] );
			$this->assert_true( $response['meta']['canonical_mutation_repository_execution_blocked'] );
			$this->assert_false( $response['meta']['canonical_mutation_repository_execution_ready'] );
			$this->assert_true(
				in_array(
					'explicit_canonical_mutation_execution_required',
					$response['meta']['canonical_mutation_repository_execution_block_reasons'],
					true
				)
			);
			$this->assert_same( 'blocked', $response['meta']['canonical_mutation_transaction_preflight_status'] );
			$this->assert_true( $response['meta']['canonical_mutation_transaction_preflight_blocked'] );
			$this->assert_false( $response['meta']['canonical_mutation_transaction_preflight_ready'] );
			$this->assert_same( 1, $response['meta']['canonical_mutation_transaction_preflight_ready_count'] );
			$this->assert_same( 0, $response['meta']['canonical_mutation_transaction_preflight_blocked_count'] );
			$this->assert_same( 1, $response['meta']['audit']['canonical_mutation_count'] );
			$this->assert_same( 1, $response['meta']['audit']['canonical_mutation_sql_query_count'] );
			$this->assert_same( 6, $response['meta']['audit']['canonical_mutation_sql_prepare_arg_count'] );
			$this->assert_same( 'deferred', $response['meta']['audit']['canonical_mutation_repository_status'] );
			$this->assert_same( 1, $response['meta']['audit']['canonical_mutation_repository_query_count'] );
			$this->assert_same( 0, $response['meta']['audit']['canonical_mutation_repository_rows_affected'] );
			$this->assert_same( 'offline_push_canonical_mutation_repository', $response['meta']['audit']['canonical_mutation_repository']['action'] );
			$this->assert_same( 'blocked', $response['meta']['audit']['canonical_mutation_repository_execution_status'] );
			$this->assert_same(
				'offline_push_canonical_mutation_repository_execution_gate',
				$response['meta']['audit']['canonical_mutation_repository_execution']['action']
			);
			$this->assert_same( 'blocked', $response['meta']['audit']['canonical_mutation_transaction_preflight_status'] );
			$this->assert_same(
				'offline_push_canonical_mutation_transaction_preflight',
				$response['meta']['audit']['canonical_mutation_transaction_preflight']['action']
			);
			$this->assert_same( 3, $database->prepare_count );
			$this->assert_same( 1, $database->get_row_count );
			$this->assert_same( 1, $database->get_results_count );
			$this->assert_same( 1, $database->query_count );
		}

		public function test_factory_replays_existing_operation_rows_without_second_queue_write(): void {
			$database = new \OfflinePushRouteHandlerFactoryWpdb(
				$this->database_row(),
				array(),
				array(),
				array( $this->existing_operation_row() )
			);
			$factory  = new OfflinePushRouteHandlerFactory(
				static fn (): \wpdb => $database,
				null,
				$this->server_time_provider(),
				$this->server_snapshots_provider(),
				null,
				null,
				true
			);
			$response = $factory->handler()->handle( $this->push_request_data() );

			$this->assert_same( 'ready', $response['status'] );
			$this->assert_same( 'offline_push_response_ready', $response['code'] );
			$this->assert_same( 'accepted', $response['data']['results'][0]['status'] );
			$this->assert_same( 'inventory_reserved', $response['data']['results'][0]['code'] );
			$this->assert_same( array( 'reservation_id' => 'res-1001' ), $response['data']['results'][0]['details'] );
			$this->assert_same( '2026-06-06T20:00:03Z', $response['data']['results'][0]['server_time_utc'] );
			$this->assert_same( 'replayed', $response['data']['results'][0]['persistence']['status'] );
			$this->assert_true( $response['data']['results'][0]['persistence']['replayed'] );
			$this->assert_same(
				'existing_queue_row',
				$response['data']['results'][0]['persistence']['response_source']
			);
			$this->assert_same(
				array( 'op-push-route-01' => 'replayed' ),
				$response['data']['operation_persistence_statuses']
			);
			$this->assert_same( 1, $response['data']['operation_replay_response_hydrated_count'] );
			$this->assert_same(
				array( 'op-push-route-01' ),
				$response['data']['operation_replay_response_hydrated_ids']
			);
			$this->assert_same( 0, $response['data']['canonical_mutation_count'] );
			$this->assert_same( array(), $response['data']['canonical_mutation_operation_ids'] );
			$this->assert_same( array( 'op-push-route-01' ), $response['data']['canonical_mutation_skipped_ids'] );
			$this->assert_same(
				'operation_replayed',
				$response['data']['canonical_mutation_skipped_reasons']['op-push-route-01']
			);
			$this->assert_same( 0, $response['data']['canonical_mutation_sql_query_count'] );
			$this->assert_same( array(), $response['data']['canonical_mutation_sql_operation_ids'] );
			$this->assert_same( 0, $response['data']['canonical_mutation_sql_prepare_arg_count'] );
			$this->assert_false( $response['data']['canonical_mutation_sql_planning_deferred'] );
			$this->assert_true( $response['data']['canonical_mutation_sql_execution_deferred'] );
			$this->assert_true( $response['data']['canonical_mutation_repository_deferred'] );
			$this->assert_same( 'deferred', $response['data']['canonical_mutation_repository_status'] );
			$this->assert_same( 0, $response['data']['canonical_mutation_repository_query_count'] );
			$this->assert_same( array(), $response['data']['canonical_mutation_repository_operation_ids'] );
			$this->assert_same( 0, $response['data']['canonical_mutation_repository_prepare_arg_count'] );
			$this->assert_same( 0, $response['data']['canonical_mutation_repository_rows_affected'] );
			$this->assert_true( $response['data']['canonical_mutation_repository_execution_deferred'] );
			$this->assert_same( 'blocked', $response['data']['canonical_mutation_repository_execution_status'] );
			$this->assert_true( $response['data']['canonical_mutation_repository_execution_blocked'] );
			$this->assert_true(
				in_array(
					'canonical_mutation_repository_no_mutation_queries',
					$response['data']['canonical_mutation_repository_execution_block_reasons'],
					true
				)
			);
			$this->assert_same( 'blocked', $response['data']['canonical_mutation_transaction_preflight_status'] );
			$this->assert_true( $response['data']['canonical_mutation_transaction_preflight_blocked'] );
			$this->assert_same( 0, $response['data']['canonical_mutation_transaction_preflight_ready_count'] );
			$this->assert_same( 0, $response['data']['canonical_mutation_transaction_preflight_blocked_count'] );
			$this->assert_same( array(), $response['data']['canonical_mutation_transaction_preflight_operation_ids'] );
			$this->assert_true(
				in_array(
					'canonical_mutation_repository_no_mutation_queries',
					$response['data']['canonical_mutation_transaction_preflight_block_reasons'],
					true
				)
			);
			$this->assert_same( 'persisted', $response['meta']['persistence_status'] );
			$this->assert_same( 0, $response['meta']['operation_rows_affected'] );
			$this->assert_same( 0, $response['meta']['conflict_rows_affected'] );
			$this->assert_same( 1, $response['meta']['operation_replay_count'] );
			$this->assert_same( array( 'op-push-route-01' ), $response['meta']['operation_replay_ids'] );
			$this->assert_same( 0, $response['meta']['canonical_mutation_count'] );
			$this->assert_same( array(), $response['meta']['canonical_mutation_operation_ids'] );
			$this->assert_same( array( 'op-push-route-01' ), $response['meta']['canonical_mutation_skipped_ids'] );
			$this->assert_false( $response['meta']['push_canonical_mutation_sql_planning_deferred'] );
			$this->assert_true( $response['meta']['push_canonical_mutation_sql_execution_deferred'] );
			$this->assert_false( $response['meta']['push_canonical_mutation_repository_staging_deferred'] );
			$this->assert_true( $response['meta']['push_canonical_mutation_repository_execution_deferred'] );
			$this->assert_true( $response['meta']['push_canonical_mutation_repository_execution_gate_deferred'] );
			$this->assert_true( $response['meta']['push_canonical_mutation_repository_transaction_deferred'] );
			$this->assert_true( $response['meta']['push_canonical_mutation_transaction_preflight_deferred'] );
			$this->assert_true( $response['meta']['push_canonical_mutation_transaction_execution_deferred'] );
			$this->assert_true( $response['meta']['push_canonical_mutation_repository_deferred'] );
			$this->assert_same( 0, $response['meta']['canonical_mutation_sql_query_count'] );
			$this->assert_same( array(), $response['meta']['canonical_mutation_sql_operation_ids'] );
			$this->assert_same( 0, $response['meta']['canonical_mutation_sql_prepare_arg_count'] );
			$this->assert_same( 'deferred', $response['meta']['canonical_mutation_repository_status'] );
			$this->assert_same( 0, $response['meta']['canonical_mutation_repository_query_count'] );
			$this->assert_same( array(), $response['meta']['canonical_mutation_repository_operation_ids'] );
			$this->assert_same( 0, $response['meta']['canonical_mutation_repository_prepare_arg_count'] );
			$this->assert_same( 0, $response['meta']['canonical_mutation_repository_rows_affected'] );
			$this->assert_same( 'blocked', $response['meta']['canonical_mutation_repository_execution_status'] );
			$this->assert_true( $response['meta']['canonical_mutation_repository_execution_blocked'] );
			$this->assert_false( $response['meta']['canonical_mutation_repository_execution_ready'] );
			$this->assert_same( 'blocked', $response['meta']['canonical_mutation_transaction_preflight_status'] );
			$this->assert_true( $response['meta']['canonical_mutation_transaction_preflight_blocked'] );
			$this->assert_false( $response['meta']['canonical_mutation_transaction_preflight_ready'] );
			$this->assert_same( 0, $response['meta']['canonical_mutation_transaction_preflight_ready_count'] );
			$this->assert_same( 0, $response['meta']['canonical_mutation_transaction_preflight_blocked_count'] );
			$this->assert_same( 2, $database->prepare_count );
			$this->assert_same( 1, $database->get_row_count );
			$this->assert_same( 1, $database->get_results_count );
			$this->assert_same( 0, $database->query_count );
			$this->assert_same(
				1,
				$response['meta']['audit']['operation_replay_count']
			);
			$this->assert_same(
				array( 'op-push-route-01' ),
				$response['meta']['audit']['operation_replay_ids']
			);
			$this->assert_same( 1, $response['meta']['audit']['operation_replay_response_hydrated_count'] );
			$this->assert_same(
				array( 'op-push-route-01' ),
				$response['meta']['audit']['operation_replay_response_hydrated_ids']
			);
			$this->assert_same( 0, $response['meta']['audit']['canonical_mutation_count'] );
			$this->assert_same( 0, $response['meta']['audit']['canonical_mutation_sql_query_count'] );
			$this->assert_same( array(), $response['meta']['audit']['canonical_mutation_sql_operation_ids'] );
			$this->assert_same( 0, $response['meta']['audit']['canonical_mutation_sql_prepare_arg_count'] );
			$this->assert_same( 'deferred', $response['meta']['audit']['canonical_mutation_repository_status'] );
			$this->assert_same( 0, $response['meta']['audit']['canonical_mutation_repository_query_count'] );
			$this->assert_same( 0, $response['meta']['audit']['canonical_mutation_repository_rows_affected'] );
			$this->assert_same( 'blocked', $response['meta']['audit']['canonical_mutation_repository_execution_status'] );
			$this->assert_true(
				in_array(
					'canonical_mutation_repository_no_mutation_queries',
					$response['meta']['audit']['canonical_mutation_repository_execution_block_reasons'],
					true
				)
			);
			$this->assert_same( 'blocked', $response['meta']['audit']['canonical_mutation_transaction_preflight_status'] );
			$this->assert_true(
				in_array(
					'canonical_mutation_repository_no_mutation_queries',
					$response['meta']['audit']['canonical_mutation_transaction_preflight_block_reasons'],
					true
				)
			);
			$this->assert_same(
				array( 'op-push-route-01' ),
				$response['meta']['audit']['canonical_mutation_skipped_ids']
			);
		}

		public function test_factory_can_use_repository_backed_snapshot_provider_when_explicitly_enabled(): void {
			$database          = new \OfflinePushRouteHandlerFactoryWpdb(
				$this->database_row(),
				array( 1 ),
				array( $this->inventory_snapshot_row() )
			);
			$snapshot_provider = new OfflinePushRouteServerSnapshotProvider( $database );
			$factory           = new OfflinePushRouteHandlerFactory(
				static fn (): \wpdb => $database,
				null,
				$this->server_time_provider(),
				$snapshot_provider,
				null,
				null,
				true
			);
			$summary           = $factory->readiness_summary();
			$response          = $factory->handler()->handle( $this->push_request_data() );

			$this->assert_true( $summary['route_connected_execution_enabled'] );
			$this->assert_true( $summary['server_snapshot_repository_provider_ready'] );
			$this->assert_true( $summary['server_snapshot_route_reads_ready'] );
			$this->assert_false( $summary['route_connected_snapshot_reads_deferred'] );
			$this->assert_same(
				'offline_push_route_server_snapshot_provider_ready',
				$summary['server_snapshot_provider_readiness']['action']
			);
			$this->assert_same( 'ready', $response['status'] );
			$this->assert_same( 'offline_push_response_ready', $response['code'] );
			$this->assert_same( 'accepted', $response['data']['results'][0]['status'] );
			$this->assert_same( 'inventory_reserved', $response['data']['results'][0]['code'] );
			$this->assert_same( 'persisted', $response['meta']['persistence_status'] );
			$this->assert_same( 4, $database->prepare_count );
			$this->assert_same( 2, $database->get_row_count );
			$this->assert_same( 1, $database->get_results_count );
			$this->assert_same( 1, $database->query_count );
			$this->assert_contains( 'FROM `wp_tcg_inventory_items`', $database->prepare_queries[1] );
		}

		public function test_factory_can_use_route_operation_options_provider_for_event_decisions(): void {
			$database          = new \OfflinePushRouteHandlerFactoryWpdb(
				$this->database_row(),
				array( 1 ),
				array( $this->event_snapshot_row() )
			);
			$snapshot_provider = new OfflinePushRouteServerSnapshotProvider( $database );
			$options_provider  = new OfflinePushRouteOperationOptionsProvider();
			$factory           = new OfflinePushRouteHandlerFactory(
				static fn (): \wpdb => $database,
				null,
				$this->server_time_provider(),
				$snapshot_provider,
				$options_provider,
				null,
				true
			);
			$summary           = $factory->readiness_summary();
			$response          = $factory->handler()->handle( $this->event_push_request_data() );

			$this->assert_true( $summary['operation_options_route_provider_ready'] );
			$this->assert_false( $summary['route_connected_operation_options_deferred'] );
			$this->assert_same(
				'offline_push_route_operation_options_provider_ready',
				$summary['operation_options_provider_readiness']['action']
			);
			$this->assert_same( 'ready', $response['status'] );
			$this->assert_same( 'accepted', $response['data']['results'][0]['status'] );
			$this->assert_same( 'event_reserved', $response['data']['results'][0]['code'] );
			$this->assert_false( array_key_exists( 'queueTopDeck', $response['data']['results'][0]['details'] ) );
			$this->assert_same( 4, $database->prepare_count );
			$this->assert_same( 2, $database->get_row_count );
			$this->assert_same( 1, $database->get_results_count );
			$this->assert_same( 1, $database->query_count );
			$this->assert_contains( 'FROM `wp_tcg_events`', $database->prepare_queries[1] );
		}

		public function test_sync_handler_factory_can_receive_route_connected_push_factory(): void {
			$database = new \OfflinePushRouteHandlerFactoryWpdb( $this->database_row(), array( 1 ) );
			$factory  = new OfflineRegisteredDeviceSyncRouteHandlerFactory(
				null,
				null,
				null,
				null,
				null,
				new OfflinePushRouteHandlerFactory(
					static fn (): \wpdb => $database,
					null,
					$this->server_time_provider(),
					$this->server_snapshots_provider(),
					null,
					null,
					true
				)
			);
			$summary  = $factory->readiness_summary();
			$response = $factory->controller()->push_offline_operations(
				array(
					'body'    => $this->push_body(),
					'headers' => $this->headers(),
				)
			);

			$this->assert_true( $summary['push_handler_dependency_factory_ready'] );
			$this->assert_true( $summary['push_handler_route_dependencies_ready'] );
			$this->assert_false( $summary['push_handler_route_dependencies_deferred'] );
			$this->assert_true( $summary['push_handler_route_execution_enabled'] );
			$this->assert_true( $summary['push_handler_route_database_configured'] );
			$this->assert_true( $summary['push_handler_canonical_mutation_planner_ready'] );
			$this->assert_false( $summary['push_handler_canonical_mutation_planning_deferred'] );
			$this->assert_true( $summary['push_handler_canonical_mutation_sql_ready'] );
			$this->assert_false( $summary['push_handler_canonical_mutation_sql_planning_deferred'] );
			$this->assert_true( $summary['push_handler_canonical_mutation_sql_execution_deferred'] );
			$this->assert_true( $summary['push_handler_canonical_repository_ready'] );
			$this->assert_false( $summary['push_handler_canonical_repository_staging_deferred'] );
			$this->assert_true( $summary['push_handler_canonical_repository_execution_deferred'] );
			$this->assert_true( $summary['push_handler_canonical_repository_execution_gate_deferred'] );
			$this->assert_true( $summary['push_handler_canonical_repository_transaction_deferred'] );
			$this->assert_true( $summary['push_handler_canonical_transaction_preflight_deferred'] );
			$this->assert_true( $summary['push_handler_canonical_transaction_execution_deferred'] );
			$this->assert_true( $summary['push_handler_canonical_repository_deferred'] );
			$this->assert_true( $summary['push_handler_canonical_writes_deferred'] );
			$this->assert_false( $summary['push_handler_route_queue_writes_deferred'] );
			$this->assert_false( $summary['push_handler_conflict_writes_deferred'] );
			$this->assert_true( $summary['route_connected_writes_ready'] );
			$this->assert_same( array(), $summary['push_handler_route_dependency_issues'] );
			$this->assert_same( 'offline_push_response_ready', $response['code'] );
			$this->assert_same( 'persisted', $response['meta']['persistence_status'] );
		}

		/**
		 * @return callable(): string
		 */
		private function server_time_provider(): callable {
			return static fn (): string => '2026-06-06T20:30:00Z';
		}

		/**
		 * @return callable(): array<string, mixed>
		 */
		private function server_snapshots_provider(): callable {
			return static fn (): array => array(
				'op-push-route-01' => array(
					'inventory' => array(
						'status'     => 'available',
						'rowVersion' => 4,
					),
				),
			);
		}

		private function push_request_data(): \TCGStorePlatform\Api\V1\OfflineRestRequestData {
			return new \TCGStorePlatform\Api\V1\OfflineRestRequestData(
				$this->push_body(),
				array(),
				array(),
				$this->headers()
			);
		}

		private function event_push_request_data(): \TCGStorePlatform\Api\V1\OfflineRestRequestData {
			return new \TCGStorePlatform\Api\V1\OfflineRestRequestData(
				$this->event_push_body(),
				array(),
				array(),
				$this->headers()
			);
		}

		/**
		 * @return array<string, string>
		 */
		private function headers(): array {
			return array(
				'authorization'     => 'Bearer ' . self::DEVICE_TOKEN,
				'Idempotency-Key'   => 'batch-push-route-01',
			);
		}

		/**
		 * @return array<string, mixed>
		 */
		private function push_body(): array {
			return array(
				'batch_id'   => 'body-batch-ignored',
				'device_id'  => 'device-main-01',
				'operations' => array(
					array(
						'client_operation_id'  => 'op-push-route-01',
						'device_id'            => 'device-main-01',
						'location_id'          => 3,
						'actor_id'             => 22,
						'operation_type'       => 'inventory_reservation',
						'entity_type'          => 'inventory',
						'entity_id'            => 'inv-1001',
						'base_row_version'     => 4,
						'occurred_at_local'    => '2026-06-06T10:15:00-04:00',
						'queued_at_utc'        => '2026-06-06T14:15:05Z',
						'payload'              => array(
							'localStatus' => 'offline_pending_sync',
						),
						'authorization_context' => array(
							'manager_user_id' => 91,
						),
						'schema_version'       => 1,
					),
				),
			);
		}

		/**
		 * @return array<string, mixed>
		 */
		private function event_push_body(): array {
			return array(
				'batch_id'   => 'body-batch-ignored',
				'device_id'  => 'device-main-01',
				'operations' => array(
					array(
						'client_operation_id' => 'op-event-route-01',
						'device_id'           => 'device-main-01',
						'location_id'         => 3,
						'actor_id'            => 22,
						'operation_type'      => 'event_reservation',
						'entity_type'         => 'event',
						'entity_id'           => 'event-100',
						'base_row_version'    => 9,
						'occurred_at_local'   => '2026-06-06T11:15:00-04:00',
						'queued_at_utc'       => '2026-06-06T15:15:05Z',
						'payload'             => array(
							'paymentStatus' => 'pay_at_store',
						),
						'schema_version'      => 1,
					),
				),
			);
		}

		/**
		 * @return array<string, mixed>
		 */
		private function inventory_snapshot_row(): array {
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
		private function event_snapshot_row(): array {
			return array(
				'public_id'           => 'event-100',
				'player_cap'          => '16',
				'registered_count'    => '10',
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
		private function database_row(): array {
			return array(
				'offline_device_id' => '42',
				'public_id'         => 'device-main-01',
				'location_id'       => '2',
				'manager_user_id'   => null,
				'device_label'      => 'Front Counter Kiosk',
				'device_mode'       => 'KIOSK',
				'token_hash'        => OfflineDeviceTokenAuthenticator::token_hash( self::DEVICE_TOKEN ),
				'token_expires_at'  => '2026-06-07 16:00:00.123456',
				'scopes_json'       => '["offline_pull","offline_push","kiosk"]',
				'capabilities_json' => '{"barcode_scanner":true,"label_printer":false}',
				'app_version'       => '0.119.0',
				'platform'          => 'windows',
				'last_seen_at'      => '2026-06-06 19:30:00.000000',
				'revoked_at'        => null,
				'issued_at'         => '2026-06-06 15:00:00.000000',
				'status'            => 'ACTIVE',
				'row_version'       => '8',
				'created_at'        => '2026-06-06 12:00:00.000000',
				'updated_at'        => '2026-06-06 12:00:00.000000',
			);
		}

		/**
		 * @return array<string, mixed>
		 */
		private function existing_operation_row(): array {
			return array(
				'offline_queue_id'    => '501',
				'offline_device_id'   => '42',
				'device_public_id'    => 'device-main-01',
				'batch_id'            => 'batch-route-01',
				'client_operation_id' => 'op-push-route-01',
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
			);
		}
	}
}
