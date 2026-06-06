<?php
/**
 * Offline registered device permission callback adapter tests.
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
	use TCGStorePlatform\Offline\OfflineDeviceSessionUpdateRepository;
	use TCGStorePlatform\Offline\OfflineDeviceTokenAuthenticator;
	use TCGStorePlatform\Offline\OfflineRegisteredDevicePermissionCallbackAdapter;
	use TCGStorePlatform\Offline\OfflineRegisteredDevicePermissionResolver;
	use TCGStorePlatform\Offline\OfflineRegisteredDeviceRepository;
	use TCGStorePlatform\Tests\TestCase;

	final class OfflineRegisteredDevicePermissionCallbackAdapterTest extends TestCase {
		private const DEVICE_TOKEN = 'test-device-token-abcdefghijklmnopqrstuvwxyz-123456';

		public function test_callback_authorizes_wordpress_style_request_and_applies_session_update(): void {
			$database = new \wpdb( $this->database_row(), 1 );
			$adapter  = $this->adapter( $database, 'offline_push' );
			$allowed  = $adapter( new HeaderBagRequest( array( 'http_authorization' => array( 'Bearer ' . self::DEVICE_TOKEN ) ) ) );
			$audit    = $adapter->last_resolution()?->audit_payload();

			$this->assert_true( $allowed );
			$this->assert_true( $adapter->last_resolution()?->is_authorized() );
			$this->assert_true( $adapter->last_resolution()?->session_update_result()?->is_applied() );
			$this->assert_same( 2, $database->prepare_count );
			$this->assert_same( 1, $database->get_row_count );
			$this->assert_same( 1, $database->query_count );
			$this->assert_same( 'applied', $audit['session_update_status'] );
			$this->assert_not_contains( self::DEVICE_TOKEN, (string) json_encode( $audit ) );
			$this->assert_not_contains(
				OfflineDeviceTokenAuthenticator::token_hash( self::DEVICE_TOKEN ),
				(string) json_encode( $audit )
			);
		}

		public function test_callback_denies_stale_session_update_results(): void {
			$database   = new \wpdb( $this->database_row(), 0 );
			$resolution = $this->adapter( $database, 'offline_push' )->authorize(
				array(
					'Authorization' => 'Bearer ' . self::DEVICE_TOKEN,
				)
			);

			$this->assert_false( $resolution->is_authorized() );
			$this->assert_true( $resolution->session_update_result()?->is_stale() );
			$this->assert_true( in_array( 'session_update_stale', $resolution->errors(), true ) );
			$this->assert_same( 1, $database->query_count );
		}

		public function test_callback_denies_missing_headers_without_database_access(): void {
			$database   = new \wpdb( $this->database_row(), 1 );
			$resolution = $this->adapter( $database, 'offline_pull' )->authorize(
				array(
					'headers' => array(),
				)
			);

			$this->assert_false( $resolution->is_authorized() );
			$this->assert_false( $resolution->lookup_attempted() );
			$this->assert_same( array( 'authorization_header_required' ), $resolution->errors() );
			$this->assert_same( 0, $database->prepare_count );
			$this->assert_same( 0, $database->query_count );
		}

		public function test_callback_reads_get_header_style_requests(): void {
			$database   = new \wpdb( $this->database_row(), 1 );
			$resolution = $this->adapter( $database, 'offline_pull' )->authorize(
				new SingleHeaderRequest( 'Bearer ' . self::DEVICE_TOKEN )
			);

			$this->assert_true( $resolution->is_authorized() );
			$this->assert_same( 'applied', $resolution->session_update_result()?->status() );
			$this->assert_same( 1, $database->query_count );
		}

		public function test_callback_can_use_plan_only_resolvers_until_routes_are_enabled(): void {
			$database = new \wpdb( $this->database_row(), 1 );
			$adapter  = new OfflineRegisteredDevicePermissionCallbackAdapter(
				new OfflineRegisteredDevicePermissionResolver(
					new OfflineRegisteredDeviceRepository( $database )
				),
				'offline_pull',
				$this->clock()
			);

			$this->assert_true(
				$adapter(
					array(
						'Authorization' => 'Bearer ' . self::DEVICE_TOKEN,
					)
				)
			);
			$this->assert_same( null, $adapter->last_resolution()?->session_update_result() );
			$this->assert_same( 0, $database->query_count );
		}

		private function adapter(
			\wpdb $database,
			string $required_scope
		): OfflineRegisteredDevicePermissionCallbackAdapter {
			return new OfflineRegisteredDevicePermissionCallbackAdapter(
				new OfflineRegisteredDevicePermissionResolver(
					new OfflineRegisteredDeviceRepository( $database ),
					null,
					new OfflineDeviceSessionUpdateRepository( $database )
				),
				$required_scope,
				$this->clock()
			);
		}

		/**
		 * @return callable(): string
		 */
		private function clock(): callable {
			return static fn (): string => '2026-06-06T20:30:00Z';
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
					'token_hash'        => OfflineDeviceTokenAuthenticator::token_hash( self::DEVICE_TOKEN ),
					'token_expires_at'  => '2026-06-07 16:00:00.123456',
					'scopes_json'       => '["offline_pull","offline_push","kiosk"]',
					'capabilities_json' => '{"barcode_scanner":true,"label_printer":false}',
					'app_version'       => '0.74.0',
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

	final class HeaderBagRequest {
		/**
		 * @param array<string, mixed> $headers Request headers.
		 */
		public function __construct( private array $headers ) {
		}

		/**
		 * @return array<string, mixed>
		 */
		public function get_headers(): array {
			return $this->headers;
		}
	}

	final class SingleHeaderRequest {
		public function __construct( private string $authorization ) {
		}

		public function get_header( string $header_name ): string {
			if ( in_array( $header_name, array( 'authorization', 'http_authorization' ), true ) ) {
				return $this->authorization;
			}

			return '';
		}
	}
}
