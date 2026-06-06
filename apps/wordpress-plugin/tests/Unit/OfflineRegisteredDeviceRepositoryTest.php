<?php
/**
 * Offline registered device repository tests.
 *
 * @package TCGStorePlatform
 */

namespace {
	if ( ! class_exists( 'wpdb' ) ) {
		class wpdb {
			public string $prefix = 'wp_';
			public int $prepare_count = 0;
			public int $get_row_count = 0;
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
			public function __construct( private ?array $row = null ) {
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
		}
	}
}

namespace TCGStorePlatform\Tests\Unit {
	use TCGStorePlatform\Offline\OfflineDeviceTokenLookupPlanner;
	use TCGStorePlatform\Offline\OfflineRegisteredDeviceLookupPlanner;
	use TCGStorePlatform\Offline\OfflineRegisteredDeviceRepository;
	use TCGStorePlatform\Tests\TestCase;

	final class OfflineRegisteredDeviceRepositoryTest extends TestCase {
		private const DEVICE_TOKEN = 'test-device-token-abcdefghijklmnopqrstuvwxyz-123456';

		public function test_repository_finds_and_normalizes_registered_device(): void {
			$database = new \wpdb( $this->database_row() );
			$result   = ( new OfflineRegisteredDeviceRepository( $database ) )->find_by_lookup_plan(
				$this->lookup_plan()
			);
			$audit    = $result->audit_payload();

			$this->assert_true( $result->is_found() );
			$this->assert_same( 'found', $result->status() );
			$this->assert_same( 42, $result->device_row()['offline_device_id'] );
			$this->assert_same( 'device-main-01', $result->device_row()['public_id'] );
			$this->assert_same( 1, $database->prepare_count );
			$this->assert_same( 1, $database->get_row_count );
			$this->assert_contains( 'FROM `wp_tcg_offline_devices`', $database->last_prepare_query );
			$this->assert_contains( '`token_expires_at` > %s', $database->last_prepare_query );
			$this->assert_same( 'ARRAY_A', $database->last_output_type );
			$this->assert_same( 4, count( $database->last_prepare_args ) );
			$this->assert_same( 'active', $database->last_prepare_args[1] );
			$this->assert_same( '2026-06-06 20:30:00.000000', $database->last_prepare_args[2] );
			$this->assert_same( 1, $database->last_prepare_args[3] );
			$this->assert_same( 'offline_registered_device_repository_lookup', $audit['action'] );
			$this->assert_same( 'found', $audit['status'] );
			$this->assert_same( 4, $audit['query']['prepare_arg_count'] );
			$this->assert_false( array_key_exists( 'token_hash', $audit ) );
			$this->assert_false( array_key_exists( 'token_hash', $audit['query'] ) );
		}

		public function test_repository_returns_not_found_without_normalizing(): void {
			$database = new \wpdb();
			$result   = ( new OfflineRegisteredDeviceRepository( $database ) )->find_by_lookup_plan(
				$this->lookup_plan()
			);

			$this->assert_true( $result->is_not_found() );
			$this->assert_false( $result->is_found() );
			$this->assert_same( array(), $result->errors() );
			$this->assert_same( 1, $database->prepare_count );
			$this->assert_same( 1, $database->get_row_count );
		}

		public function test_repository_rejects_invalid_lookup_plan_before_query(): void {
			$token_lookup_plan = ( new OfflineDeviceTokenLookupPlanner() )->plan(
				array(
					'Authorization' => 'Bearer short',
				)
			);
			$lookup_plan       = ( new OfflineRegisteredDeviceLookupPlanner() )->plan(
				$token_lookup_plan,
				'offline_push',
				'2026-06-06T20:30:00Z'
			);
			$database          = new \wpdb( $this->database_row() );
			$result            = ( new OfflineRegisteredDeviceRepository( $database ) )->find_by_lookup_plan(
				$lookup_plan
			);

			$this->assert_true( $result->is_rejected() );
			$this->assert_same( 0, $database->prepare_count );
			$this->assert_same( 0, $database->get_row_count );
			$this->assert_true( in_array( 'lookup_plan_invalid', $result->errors(), true ) );
			$this->assert_true( in_array( 'device_token_invalid', $result->errors(), true ) );
		}

		public function test_repository_rejects_malformed_database_rows(): void {
			$database = new \wpdb(
				$this->database_row(
					array(
						'offline_device_id' => '0',
						'token_hash'        => 'bad',
					)
				)
			);
			$result   = ( new OfflineRegisteredDeviceRepository( $database ) )->find_by_lookup_plan(
				$this->lookup_plan()
			);
			$audit    = $result->audit_payload();

			$this->assert_true( $result->is_rejected() );
			$this->assert_same( 1, $database->prepare_count );
			$this->assert_same( 1, $database->get_row_count );
			$this->assert_true( in_array( 'offline_device_id_invalid', $result->errors(), true ) );
			$this->assert_true( in_array( 'token_hash_invalid', $result->errors(), true ) );
			$this->assert_same( 'rejected', $audit['status'] );
			$this->assert_false( $audit['normalization_audit']['is_valid'] );
			$this->assert_false( array_key_exists( 'token_hash', $audit['normalization_audit'] ) );
		}

		private function lookup_plan(): \TCGStorePlatform\Offline\OfflineRegisteredDeviceLookupPlan {
			return ( new OfflineRegisteredDeviceLookupPlanner() )->plan(
				( new OfflineDeviceTokenLookupPlanner() )->plan(
					array(
						'Authorization' => 'Bearer ' . self::DEVICE_TOKEN,
					)
				),
				'offline_push',
				'2026-06-06T20:30:00Z'
			);
		}

		/**
		 * @param array<string, mixed> $overrides Row overrides.
		 * @return array<string, mixed>
		 */
		private function database_row( array $overrides = array() ): array {
			return array_merge(
				array(
					'offline_device_id' => '42',
					'public_id'         => 'device-main-01',
					'location_id'       => '2',
					'manager_user_id'   => null,
					'device_label'      => 'Front Counter Kiosk',
					'device_mode'       => 'KIOSK',
					'token_hash'        => str_repeat( 'a', 64 ),
					'token_expires_at'  => '2026-06-07 16:00:00.123456',
					'scopes_json'       => '["offline_pull","offline_push","kiosk"]',
					'capabilities_json' => '{"barcode_scanner":true,"label_printer":false}',
					'app_version'       => '0.69.0',
					'platform'          => 'windows',
					'status'            => 'ACTIVE',
					'last_seen_at'      => '2026-06-06 15:30:00',
					'revoked_at'        => null,
					'issued_at'         => '2026-06-06 15:00:00',
					'created_at'        => '2026-06-06 15:00:00',
					'updated_at'        => '2026-06-06 15:15:00',
					'row_version'       => '8',
				),
				$overrides
			);
		}
	}
}
