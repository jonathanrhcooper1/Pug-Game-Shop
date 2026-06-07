<?php
/**
 * Offline pull cursor advancement repository tests.
 *
 * @package TCGStorePlatform
 */

namespace {
	if ( ! class_exists( 'wpdb' ) ) {
		class wpdb {
			public string $prefix = 'wp_';
		}
	}

	if ( ! class_exists( 'OfflinePullCursorAdvanceWpdb' ) ) {
		class OfflinePullCursorAdvanceWpdb extends \wpdb {
			public string $prefix = 'wp_';
			public int $prepare_count = 0;
			public int $query_count = 0;
			public string $last_prepare_query = '';
			public string $last_query = '';

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
			public function __construct( private array $query_results = array() ) {
			}

			/**
			 * @param list<mixed> $args Prepared arguments.
			 */
			public function prepare( string $query, array $args ): string {
				++$this->prepare_count;
				$this->last_prepare_query = $query;
				$this->prepare_queries[]  = $query;
				$this->prepare_args[]     = array_values( $args );

				return 'prepared:' . $query;
			}

			public function query( string $query ): int|false {
				++$this->query_count;
				$this->last_query = $query;

				return array_shift( $this->query_results );
			}
		}
	}
}

namespace TCGStorePlatform\Tests\Unit {
	use TCGStorePlatform\Offline\OfflinePullCursorAdvancePlan;
	use TCGStorePlatform\Offline\OfflinePullCursorAdvanceRepository;
	use TCGStorePlatform\Tests\TestCase;

	final class OfflinePullCursorAdvanceRepositoryTest extends TestCase {
		public function test_repository_advances_prepared_cursor_upserts(): void {
			$database = new \OfflinePullCursorAdvanceWpdb( array( 1, 2 ) );
			$result   = ( new OfflinePullCursorAdvanceRepository( $database ) )->advance(
				$this->plan(
					array(
						$this->row(
							array(
								'cursor_value' => 'inv-cursor-42',
								'row_count'    => 2,
							)
						),
						$this->row(
							array(
								'domain'       => 'branding',
								'cursor_value' => null,
								'row_count'    => 0,
							)
						),
					)
				)
			);
			$audit    = $result->audit_payload();

			$this->assert_true( $result->is_advanced() );
			$this->assert_false( $result->is_rejected() );
			$this->assert_same( 'advanced', $result->status() );
			$this->assert_same( 3, $result->rows_affected() );
			$this->assert_same( array(), $result->errors() );
			$this->assert_same( 2, $database->prepare_count );
			$this->assert_same( 2, $database->query_count );
			$this->assert_contains( 'INSERT INTO `wp_tcg_offline_pull_cursors`', $database->prepare_queries[0] );
			$this->assert_contains( 'ON DUPLICATE KEY UPDATE', $database->prepare_queries[1] );
			$this->assert_same( 10, count( $database->prepare_args[0] ) );
			$this->assert_same( 9, count( $database->prepare_args[1] ) );
			$this->assert_same( 'inventory', $result->cursor_results()[0]['domain'] );
			$this->assert_same( 1, $result->cursor_results()[0]['rows_affected'] );
			$this->assert_false( $result->cursor_results()[0]['cursor_value_is_null'] );
			$this->assert_same( 'branding', $result->cursor_results()[1]['domain'] );
			$this->assert_same( 2, $result->cursor_results()[1]['rows_affected'] );
			$this->assert_true( $result->cursor_results()[1]['cursor_value_is_null'] );
			$this->assert_same( 'offline_pull_cursor_advance_repository', $audit['action'] );
			$this->assert_same( 2, $audit['cursor_query_count'] );
			$this->assert_same( 3, $audit['rows_affected'] );
			$this->assert_same( 19, $audit['query']['prepare_arg_count'] );
			$this->assert_true( $audit['explicit_execution_required'] );
			$this->assert_true( $audit['default_route_execution_deferred'] );
			$this->assert_true( $audit['route_connected_writes_deferred'] );
		}

		public function test_repository_accepts_empty_valid_plans_without_queries(): void {
			$database = new \OfflinePullCursorAdvanceWpdb();
			$result   = ( new OfflinePullCursorAdvanceRepository( $database ) )->advance(
				$this->plan( array() )
			);

			$this->assert_true( $result->is_advanced() );
			$this->assert_same( 0, $result->rows_affected() );
			$this->assert_same( array(), $result->cursor_results() );
			$this->assert_same( 0, $database->prepare_count );
			$this->assert_same( 0, $database->query_count );
			$this->assert_same( 0, $result->audit_payload()['cursor_query_count'] );
		}

		public function test_repository_rejects_invalid_plans_before_database_writes(): void {
			$database = new \OfflinePullCursorAdvanceWpdb( array( 1 ) );
			$result   = ( new OfflinePullCursorAdvanceRepository( $database ) )->advance(
				OfflinePullCursorAdvancePlan::accepted(
					'device-main-01',
					42,
					'wp-bad_',
					array( $this->row() )
				)
			);

			$this->assert_true( $result->is_rejected() );
			$this->assert_same( 0, $result->rows_affected() );
			$this->assert_same( 0, $database->prepare_count );
			$this->assert_same( 0, $database->query_count );
			$this->assert_true( in_array( 'cursor_table_name_invalid', $result->errors(), true ) );
		}

		public function test_repository_rejects_failed_database_upserts(): void {
			$database = new \OfflinePullCursorAdvanceWpdb( array( false ) );
			$result   = ( new OfflinePullCursorAdvanceRepository( $database ) )->advance(
				$this->plan(
					array(
						$this->row(),
					)
				)
			);

			$this->assert_true( $result->is_rejected() );
			$this->assert_same( 0, $result->rows_affected() );
			$this->assert_same( 1, $database->prepare_count );
			$this->assert_same( 1, $database->query_count );
			$this->assert_same( array( 'inventory_cursor_upsert_failed' ), $result->errors() );
		}

		public function test_repository_rejects_invalid_rows_affected_results(): void {
			$database = new \OfflinePullCursorAdvanceWpdb( array( -1 ) );
			$result   = ( new OfflinePullCursorAdvanceRepository( $database ) )->advance(
				$this->plan(
					array(
						$this->row(),
					)
				)
			);

			$this->assert_true( $result->is_rejected() );
			$this->assert_same( 0, $result->rows_affected() );
			$this->assert_same( array( 'inventory_cursor_upsert_invalid_rows_affected' ), $result->errors() );
		}

		/**
		 * @param list<array<string, mixed>> $rows Cursor rows.
		 */
		private function plan( array $rows ): OfflinePullCursorAdvancePlan {
			return OfflinePullCursorAdvancePlan::accepted(
				'device-main-01',
				42,
				'wp_',
				$rows
			);
		}

		/**
		 * @param array<string, mixed> $overrides Row overrides.
		 * @return array<string, mixed>
		 */
		private function row( array $overrides = array() ): array {
			return array_merge(
				array(
					'offline_device_id'     => 42,
					'device_public_id'      => 'device-main-01',
					'domain'                => 'inventory',
					'cursor_value'          => 'inv-cursor-42',
					'last_server_time_utc'  => '2026-06-06 22:00:00',
					'last_pulled_at'        => '2026-06-06 22:00:00',
					'row_count'             => 2,
					'row_version_next'      => 1,
					'has_more_deferred'     => false,
					'cursor_write_deferred' => true,
				),
				$overrides
			);
		}
	}
}
