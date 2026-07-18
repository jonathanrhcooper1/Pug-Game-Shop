<?php
/**
 * Offline conflict route handler factory tests.
 *
 * @package TCGStorePlatform
 */

namespace {
	if ( ! class_exists( 'wpdb' ) ) {
		class wpdb {
			public string $prefix = 'wp_';
		}
	}

	if ( ! class_exists( 'OfflineConflictRouteHandlerFactoryWpdb' ) ) {
		class OfflineConflictRouteHandlerFactoryWpdb extends \wpdb {
			public string $prefix = 'wp_';
			public int $prepare_count = 0;
			public int $get_row_count = 0;
			public int $query_count = 0;
			public string $last_prepare_query = '';
			public string $last_query = '';
			public string $last_output_type = '';

			/**
			 * @var list<mixed>
			 */
			public array $last_prepare_args = array();

			/**
			 * @param array<string, mixed>|null $row Current conflict row.
			 */
			public function __construct(
				private ?array $row = null,
				private int|false $query_result = 1,
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
				++$this->prepare_count;
				$this->last_prepare_query = $query;
				$this->last_prepare_args  = array_values( $args );

				return 'prepared:' . $query;
			}

			/**
			 * @return array<string, mixed>|null
			 */
			public function get_row( string $query, string $output_type ): ?array {
				++$this->get_row_count;
				$this->last_query       = $query;
				$this->last_output_type = $output_type;

				return $this->row;
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
	use TCGStorePlatform\Api\V1\OfflineConflictResolutionCurrentRowProvider;
	use TCGStorePlatform\Api\V1\OfflineConflictResolutionRouteHandler;
	use TCGStorePlatform\Api\V1\OfflineConflictRouteHandlerFactory;
	use TCGStorePlatform\Api\V1\OfflineRestRequestData;
	use TCGStorePlatform\Offline\OfflineConflictResolutionRepository;
	use TCGStorePlatform\Offline\OfflineConflictResolutionRequestParser;
	use TCGStorePlatform\Tests\TestCase;

	final class OfflineConflictRouteHandlerFactoryTest extends TestCase {
		public function test_current_row_provider_loads_and_normalizes_conflict_row(): void {
			$database = new \OfflineConflictRouteHandlerFactoryWpdb( $this->current_conflict_row() );
			$result   = ( new OfflineConflictResolutionRequestParser() )->parse(
				'conflict-main-01',
				$this->resolution_body(),
				'resolution-main-01'
			);
			$request  = $result->request();

			$this->assert_true( $result->is_valid() );
			$this->assert_true( null !== $request );

			$row = ( new OfflineConflictResolutionCurrentRowProvider( $database ) )( $request );

			$this->assert_true( is_array( $row ) );
			$this->assert_same( 'conflict-main-01', $row['conflict_id'] );
			$this->assert_same( 'open', $row['status'] );
			$this->assert_same( 'inventory', $row['entity_type'] );
			$this->assert_same( array( 'accept_server', 'accept_device' ), $row['resolution_options'] );
			$this->assert_same( 1, $database->prepare_count );
			$this->assert_same( 1, $database->get_row_count );
			$this->assert_contains( 'FROM `wp_tcg_sync_conflicts`', $database->last_prepare_query );
			$this->assert_same( array( 'conflict-main-01', 1 ), $database->last_prepare_args );
			$this->assert_same( 'ARRAY_A', $database->last_output_type );
		}

		public function test_resolution_handler_validates_without_route_connected_repository(): void {
			$response = ( new OfflineConflictResolutionRouteHandler() )->handle( $this->request_data() );

			$this->assert_same( 'validated', $response['status'] );
			$this->assert_same( 202, $response['status_code'] );
			$this->assert_same( 'offline_request_validated', $response['code'] );
			$this->assert_same( 'resolve_offline_conflict', $response['callback'] );
			$this->assert_same( 'conflict-main-01', $response['data']['conflict_id'] );
			$this->assert_true( $response['data']['write_deferred'] );
			$this->assert_true( $response['data']['route_still_gated'] );
		}

		public function test_resolution_handler_applies_repository_write_when_dependencies_are_supplied(): void {
			$database = new \OfflineConflictRouteHandlerFactoryWpdb( $this->current_conflict_row(), 1 );
			$response = $this->repository_backed_handler( $database )->handle( $this->request_data() );

			$this->assert_same( 'ready', $response['status'] );
			$this->assert_same( 200, $response['status_code'] );
			$this->assert_same( 'offline_conflict_resolution_applied', $response['code'] );
			$this->assert_same( 'applied', $response['data']['write_status'] );
			$this->assert_false( $response['data']['write_deferred'] );
			$this->assert_false( $response['meta']['write_deferred'] );
			$this->assert_same( 1, $response['meta']['conflict_resolution_rows_affected'] );
			$this->assert_same( 2, $database->prepare_count );
			$this->assert_same( 1, $database->get_row_count );
			$this->assert_same( 1, $database->query_count );
		}

		public function test_resolution_handler_reports_stale_repository_updates(): void {
			$database = new \OfflineConflictRouteHandlerFactoryWpdb( $this->current_conflict_row(), 0 );
			$response = $this->repository_backed_handler( $database )->handle( $this->request_data() );

			$this->assert_same( 'stale', $response['status'] );
			$this->assert_same( 409, $response['status_code'] );
			$this->assert_same( 'offline_conflict_resolution_stale', $response['code'] );
			$this->assert_same( 'stale', $response['data']['write_status'] );
			$this->assert_same( 0, $response['meta']['conflict_resolution_rows_affected'] );
		}

		public function test_factory_composes_deferred_conflict_handlers_by_default(): void {
			$factory  = new OfflineConflictRouteHandlerFactory();
			$summary  = $factory->readiness_summary();
			$response = $factory->controller()->resolve_offline_conflict(
				array(
					'route'   => array( 'conflict_id' => 'conflict-main-01' ),
					'body'    => $this->resolution_body(),
					'headers' => array( 'Idempotency-Key' => 'resolution-main-01' ),
				)
			);

			$this->assert_true( $factory->is_configured() );
			$this->assert_same( 2, $summary['handler_count'] );
			$this->assert_true( $summary['list_handler_configured'] );
			$this->assert_true( $summary['resolution_handler_configured'] );
			$this->assert_false( $summary['route_connected_execution_enabled'] );
			$this->assert_true( $summary['route_connected_handler_deferred'] );
			$this->assert_true( $summary['route_connected_writes_deferred'] );
			$this->assert_same( 'validated', $response['status'] );
			$this->assert_same( 202, $response['status_code'] );
		}

		public function test_factory_composes_repository_backed_resolution_when_explicitly_enabled(): void {
			$database = new \OfflineConflictRouteHandlerFactoryWpdb( $this->current_conflict_row(), 1 );
			$factory  = new OfflineConflictRouteHandlerFactory(
				database_provider: static fn (): \wpdb => $database,
				server_time_provider: $this->server_time_provider(),
				route_connected_execution_enabled: true
			);
			$summary  = $factory->readiness_summary();
			$response = $factory->controller()->resolve_offline_conflict(
				array(
					'route'   => array( 'conflict_id' => 'conflict-main-01' ),
					'body'    => $this->resolution_body(),
					'headers' => array( 'Idempotency-Key' => 'resolution-main-01' ),
				)
			);

			$this->assert_true( $summary['route_connected_execution_enabled'] );
			$this->assert_true( $summary['database_configured'] );
			$this->assert_true( $summary['table_prefix_ready'] );
			$this->assert_true( $summary['route_connected_handler_ready'] );
			$this->assert_false( $summary['route_connected_handler_deferred'] );
			$this->assert_false( $summary['route_connected_writes_deferred'] );
			$this->assert_true( $summary['route_connected_resolution_writes_ready'] );
			$this->assert_same( 'ready', $response['status'] );
			$this->assert_same( 'offline_conflict_resolution_applied', $response['code'] );
		}

		private function repository_backed_handler(
			\OfflineConflictRouteHandlerFactoryWpdb $database
		): OfflineConflictResolutionRouteHandler {
			return new OfflineConflictResolutionRouteHandler(
				null,
				null,
				new OfflineConflictResolutionRepository( $database ),
				new OfflineConflictResolutionCurrentRowProvider( $database ),
				$this->server_time_provider()
			);
		}

		private function request_data(): OfflineRestRequestData {
			return new OfflineRestRequestData(
				$this->resolution_body(),
				array(),
				array(
					'conflict_id' => 'conflict-main-01',
				),
				array(
					'idempotency-key' => 'resolution-main-01',
				)
			);
		}

		/**
		 * @return callable(): string
		 */
		private function server_time_provider(): callable {
			return static fn (): string => '2026-06-06T18:05:00Z';
		}

		/**
		 * @return array<string, mixed>
		 */
		private function resolution_body(): array {
			return array(
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
			);
		}

		/**
		 * @return array<string, mixed>
		 */
		private function current_conflict_row(): array {
			return array(
				'conflict_id'             => 'conflict-main-01',
				'status'                  => 'OPEN',
				'entity_type'             => 'Inventory',
				'entity_id'               => 'inv-1001',
				'conflict_type'           => 'double_sell',
				'row_version'             => '12',
				'resolution_options_json' => '["accept_server","accept_device","accept_device"]',
			);
		}
	}
}
