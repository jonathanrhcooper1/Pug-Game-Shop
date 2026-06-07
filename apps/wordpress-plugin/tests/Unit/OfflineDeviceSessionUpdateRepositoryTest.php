<?php
/**
 * Offline device session update repository tests.
 *
 * @package TCGStorePlatform
 */

namespace {
	if ( ! class_exists( 'wpdb' ) ) {
		class wpdb {
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
			 * @param array<string, mixed>|null $row Row returned by get_row.
			 */
			public function __construct(
				private ?array $row = null,
				private int|false $query_result = 1
			) {
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
	use TCGStorePlatform\Offline\OfflineDeviceAccessDecision;
	use TCGStorePlatform\Offline\OfflineDeviceSessionPlan;
	use TCGStorePlatform\Offline\OfflineDeviceSessionPlanner;
	use TCGStorePlatform\Offline\OfflineDeviceSessionUpdateRepository;
	use TCGStorePlatform\Tests\TestCase;

	final class OfflineDeviceSessionUpdateRepositoryTest extends TestCase {
		public function test_repository_applies_prepared_session_update(): void {
			$database = new \wpdb( null, 1 );
			$result   = ( new OfflineDeviceSessionUpdateRepository( $database ) )->apply(
				$this->session_plan()
			);
			$audit    = $result->audit_payload();

			$this->assert_true( $result->is_applied() );
			$this->assert_same( 'applied', $result->status() );
			$this->assert_same( 1, $result->rows_affected() );
			$this->assert_same( array(), $result->errors() );
			$this->assert_same( 1, $database->prepare_count );
			$this->assert_same( 1, $database->query_count );
			$this->assert_contains( 'UPDATE `wp_tcg_offline_devices`', $database->last_prepare_query );
			$this->assert_contains( 'AND `public_id` = %s AND `row_version` = %d', $database->last_prepare_query );
			$this->assert_contains( 'prepared:UPDATE', $database->last_query );
			$this->assert_same( 7, count( $database->last_prepare_args ) );
			$this->assert_same( 42, $database->last_prepare_args[3] );
			$this->assert_same( 'device-main-01', $database->last_prepare_args[4] );
			$this->assert_same( 8, $database->last_prepare_args[5] );
			$this->assert_same( 'offline_device_session_update_repository', $audit['action'] );
			$this->assert_same( 'applied', $audit['status'] );
			$this->assert_same( 1, $audit['rows_affected'] );
			$this->assert_same( 7, $audit['query']['prepare_arg_count'] );
			$this->assert_false( array_key_exists( 'device_token', $audit ) );
			$this->assert_false( array_key_exists( 'token_hash', $audit ) );
			$this->assert_false( array_key_exists( 'token_hash', $audit['query'] ) );
		}

		public function test_repository_reports_stale_updates_without_error(): void {
			$database = new \wpdb( null, 0 );
			$result   = ( new OfflineDeviceSessionUpdateRepository( $database ) )->apply(
				$this->session_plan()
			);

			$this->assert_true( $result->is_stale() );
			$this->assert_false( $result->is_applied() );
			$this->assert_same( 'stale', $result->status() );
			$this->assert_same( 0, $result->rows_affected() );
			$this->assert_same( array(), $result->errors() );
			$this->assert_same( 1, $database->prepare_count );
			$this->assert_same( 1, $database->query_count );
		}

		public function test_repository_rejects_invalid_session_plans_before_query(): void {
			$database = new \wpdb( null, 1 );
			$result   = ( new OfflineDeviceSessionUpdateRepository( $database ) )->apply(
				$this->manual_session_plan(
					array(
						'offline_device_id'    => 0,
						'public_id'            => 'bad',
						'last_seen_at'         => 'not-now',
						'updated_at'           => 'also-bad',
						'row_version'          => 1,
						'expected_row_version' => 8,
						'previous_row_version' => 7,
					)
				)
			);

			$this->assert_true( $result->is_rejected() );
			$this->assert_same( null, $result->rows_affected() );
			$this->assert_same( 0, $database->prepare_count );
			$this->assert_same( 0, $database->query_count );
			$this->assert_true( in_array( 'offline_device_id_invalid', $result->errors(), true ) );
			$this->assert_true( in_array( 'public_id_invalid', $result->errors(), true ) );
			$this->assert_true( in_array( 'last_seen_at_invalid', $result->errors(), true ) );
			$this->assert_true( in_array( 'updated_at_invalid', $result->errors(), true ) );
		}

		public function test_repository_rejects_failed_database_updates(): void {
			$database = new \wpdb( null, false );
			$result   = ( new OfflineDeviceSessionUpdateRepository( $database ) )->apply(
				$this->session_plan()
			);

			$this->assert_true( $result->is_rejected() );
			$this->assert_same( null, $result->rows_affected() );
			$this->assert_same( 1, $database->prepare_count );
			$this->assert_same( 1, $database->query_count );
			$this->assert_same( array( 'session_update_failed' ), $result->errors() );
		}

		public function test_repository_rejects_unexpected_row_counts(): void {
			$database = new \wpdb( null, 2 );
			$result   = ( new OfflineDeviceSessionUpdateRepository( $database ) )->apply(
				$this->session_plan()
			);

			$this->assert_true( $result->is_rejected() );
			$this->assert_same( 2, $result->rows_affected() );
			$this->assert_same( 1, $database->prepare_count );
			$this->assert_same( 1, $database->query_count );
			$this->assert_same( array( 'session_update_unexpected_rows' ), $result->errors() );
		}

		private function session_plan(): OfflineDeviceSessionPlan {
			return ( new OfflineDeviceSessionPlanner() )->plan(
				OfflineDeviceAccessDecision::accepted(
					array(
						'offline_device_id'    => 42,
						'device_id'            => 'device-main-01',
						'device_mode'          => 'kiosk',
						'location_id'          => 2,
						'scopes'               => array( 'offline_pull', 'offline_push', 'kiosk' ),
						'required_scope'       => 'offline_push',
						'auth_type'            => 'device_bearer',
						'token_verified'       => true,
						'authenticated_at_utc' => '2026-06-06T18:29:00Z',
					)
				),
				array(
					'offline_device_id' => 42,
					'public_id'         => 'device-main-01',
					'row_version'       => 8,
				),
				'2026-06-06T18:30:00Z'
			);
		}

		/**
		 * @param array<string, mixed> $update_row Future update row.
		 */
		private function manual_session_plan( array $update_row ): OfflineDeviceSessionPlan {
			return new OfflineDeviceSessionPlan(
				$update_row,
				array(),
				array(
					'action' => 'offline_device_session_planned',
				)
			);
		}
	}
}
