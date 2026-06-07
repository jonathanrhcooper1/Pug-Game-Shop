<?php
/**
 * Offline device registration repository tests.
 *
 * @package TCGStorePlatform
 */

namespace {
	if ( ! class_exists( 'wpdb' ) ) {
		class wpdb {
			public string $prefix = 'wp_';
			public int $insert_id = 77;
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
	use TCGStorePlatform\Offline\OfflineDevicePairingRequestParser;
	use TCGStorePlatform\Offline\OfflineDeviceRegistrationPlan;
	use TCGStorePlatform\Offline\OfflineDeviceRegistrationPlanner;
	use TCGStorePlatform\Offline\OfflineDeviceRegistrationRepository;
	use TCGStorePlatform\Tests\TestCase;

	final class OfflineDeviceRegistrationRepositoryTest extends TestCase {
		private const DEVICE_TOKEN = 'test-device-token-abcdefghijklmnopqrstuvwxyz-123456';
		private const TOKEN_HASH   = 'aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa';

		public function test_repository_inserts_prepared_device_registration(): void {
			$database = new \wpdb( null, 1 );
			$result   = ( new OfflineDeviceRegistrationRepository( $database ) )->register(
				$this->registration_plan()
			);
			$audit    = $result->audit_payload();

			$this->assert_true( $result->is_inserted() );
			$this->assert_false( $result->is_rejected() );
			$this->assert_same( 'inserted', $result->status() );
			$this->assert_same( 1, $result->rows_affected() );
			$this->assert_same( 77, $result->insert_id() );
			$this->assert_same( array(), $result->errors() );
			$this->assert_same( 1, $database->prepare_count );
			$this->assert_same( 1, $database->query_count );
			$this->assert_contains( 'INSERT INTO `wp_tcg_offline_devices`', $database->last_prepare_query );
			$this->assert_contains( '`last_seen_at`, `revoked_at`', $database->last_prepare_query );
			$this->assert_contains( 'NULL, NULL', $database->last_prepare_query );
			$this->assert_contains( 'prepared:INSERT', $database->last_query );
			$this->assert_same( 16, count( $database->last_prepare_args ) );
			$this->assert_same( 'device-main-01', $database->last_prepare_args[0] );
			$this->assert_same( 'active', $database->last_prepare_args[11] );
			$this->assert_same( 1, $database->last_prepare_args[15] );
			$this->assert_same( 'device-main-01', $result->response_payload()['device_id'] );
			$this->assert_same( self::DEVICE_TOKEN, $result->response_payload()['device_token'] );
			$this->assert_same( 'offline_device_registration_repository', $audit['action'] );
			$this->assert_same( 'inserted', $audit['status'] );
			$this->assert_same( 77, $audit['insert_id'] );
			$this->assert_same( 16, $audit['query']['prepare_arg_count'] );
			$this->assert_not_contains( self::DEVICE_TOKEN, (string) json_encode( $audit ) );
			$this->assert_not_contains( self::TOKEN_HASH, (string) json_encode( $audit ) );
		}

		public function test_repository_rejects_invalid_registration_plans_before_query(): void {
			$database = new \wpdb( null, 1 );
			$result   = ( new OfflineDeviceRegistrationRepository( $database ) )->register(
				new OfflineDeviceRegistrationPlan(
					array(
						'public_id'            => 'bad',
						'location_id'          => 0,
						'manager_id'           => null,
						'device_label'         => '',
						'device_mode'          => 'unknown',
						'token_hash'           => 'bad',
						'token_expires_at_utc' => 'bad-time',
						'scopes'               => array(),
						'capabilities'         => array(),
						'app_version'          => 'not-semver',
						'platform'             => 'linux',
						'status'               => 'pending',
						'last_seen_at_utc'     => null,
						'revoked_at_utc'       => null,
						'created_at_utc'       => 'bad-time',
					),
					array(),
					array( 'action' => 'offline_device_registration_planned' )
				)
			);

			$this->assert_true( $result->is_rejected() );
			$this->assert_same( null, $result->rows_affected() );
			$this->assert_same( 0, $database->prepare_count );
			$this->assert_same( 0, $database->query_count );
			$this->assert_true( in_array( 'public_id_invalid', $result->errors(), true ) );
			$this->assert_true( in_array( 'location_id_invalid', $result->errors(), true ) );
			$this->assert_true( in_array( 'token_hash_invalid', $result->errors(), true ) );
			$this->assert_same( array(), $result->response_payload() );
		}

		public function test_repository_rejects_failed_database_inserts(): void {
			$database = new \wpdb( null, false );
			$result   = ( new OfflineDeviceRegistrationRepository( $database ) )->register(
				$this->registration_plan()
			);

			$this->assert_true( $result->is_rejected() );
			$this->assert_same( null, $result->rows_affected() );
			$this->assert_same( 1, $database->prepare_count );
			$this->assert_same( 1, $database->query_count );
			$this->assert_same( array( 'registration_insert_failed' ), $result->errors() );
		}

		public function test_repository_rejects_zero_or_unexpected_insert_counts(): void {
			$zero_database = new \wpdb( null, 0 );
			$zero_result   = ( new OfflineDeviceRegistrationRepository( $zero_database ) )->register(
				$this->registration_plan()
			);
			$two_database  = new \wpdb( null, 2 );
			$two_result    = ( new OfflineDeviceRegistrationRepository( $two_database ) )->register(
				$this->registration_plan()
			);

			$this->assert_true( $zero_result->is_rejected() );
			$this->assert_same( 0, $zero_result->rows_affected() );
			$this->assert_same( array( 'registration_insert_no_rows' ), $zero_result->errors() );
			$this->assert_true( $two_result->is_rejected() );
			$this->assert_same( 2, $two_result->rows_affected() );
			$this->assert_same( array( 'registration_insert_unexpected_rows' ), $two_result->errors() );
		}

		private function registration_plan(): OfflineDeviceRegistrationPlan {
			$parse_result = ( new OfflineDevicePairingRequestParser() )->parse(
				array(
					'pairing_code'     => 'PAIR-2026-REGISTER-DEVICE',
					'installation_id'  => 'front-counter-install',
					'device_label'     => 'Front Counter Kiosk',
					'device_mode'      => 'kiosk',
					'location_id'      => 2,
					'manager_id'       => 42,
					'app_version'      => '0.86.0',
					'platform'         => 'windows',
					'capabilities'     => array(
						'barcode_scanner' => true,
						'label_printer'   => false,
					),
					'requested_scopes' => array( 'offline_pull', 'offline_push', 'kiosk' ),
					'schema_version'   => 1,
				)
			);

			$this->assert_true( $parse_result->is_valid() );

			return ( new OfflineDeviceRegistrationPlanner() )->plan(
				$parse_result->request(),
				'device-main-01',
				self::DEVICE_TOKEN,
				self::TOKEN_HASH,
				'2026-06-06T18:30:00Z',
				'2026-06-07T18:30:00Z'
			);
		}
	}
}
