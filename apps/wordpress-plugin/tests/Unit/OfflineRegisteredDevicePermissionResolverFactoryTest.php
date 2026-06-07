<?php
/**
 * Offline registered device permission resolver factory tests.
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
	use RuntimeException;
	use TCGStorePlatform\Offline\OfflineDeviceTokenAuthenticator;
	use TCGStorePlatform\Offline\OfflineRegisteredDevicePermissionResolver;
	use TCGStorePlatform\Offline\OfflineRegisteredDevicePermissionResolverFactory;
	use TCGStorePlatform\Tests\TestCase;

	final class OfflineRegisteredDevicePermissionResolverFactoryTest extends TestCase {
		private const DEVICE_TOKEN = 'test-device-token-abcdefghijklmnopqrstuvwxyz-123456';

		public function test_factory_reports_missing_database_fail_closed(): void {
			$factory = new OfflineRegisteredDevicePermissionResolverFactory();
			$summary = $factory->readiness_summary();

			$this->assert_false( $factory->is_configured() );
			$this->assert_false( $summary['configured'] );
			$this->assert_false( $summary['database_configured'] );
			$this->assert_false( $summary['permission_resolver_configured'] );
			$this->assert_true( in_array( 'database_not_configured', $summary['configuration_issues'], true ) );
			$this->assert_same( null, $factory->resolver() );
		}

		public function test_factory_builds_resolver_from_database_dependencies(): void {
			$database = new \wpdb( $this->database_row(), 1 );
			$factory  = new OfflineRegisteredDevicePermissionResolverFactory(
				static fn (): \wpdb => $database
			);
			$summary  = $factory->readiness_summary();
			$resolver = $factory->resolver();

			$this->assert_true( $factory->is_configured() );
			$this->assert_true( $summary['registered_device_repository_configured'] );
			$this->assert_true( $summary['session_update_repository_configured'] );
			$this->assert_true( $resolver instanceof OfflineRegisteredDevicePermissionResolver );

			$resolution = $resolver->resolve_and_apply_session_update(
				$this->headers(),
				'offline_push',
				'2026-06-06T20:30:00Z'
			);
			$audit      = $resolution->audit_payload();

			$this->assert_true( $resolution->is_authorized() );
			$this->assert_true( $resolution->session_update_result()?->is_applied() );
			$this->assert_same( 2, $database->prepare_count );
			$this->assert_same( 1, $database->get_row_count );
			$this->assert_same( 1, $database->query_count );
			$this->assert_not_contains( self::DEVICE_TOKEN, (string) json_encode( $audit ) );
			$this->assert_not_contains(
				OfflineDeviceTokenAuthenticator::token_hash( self::DEVICE_TOKEN ),
				(string) json_encode( $audit )
			);
		}

		public function test_factory_reports_database_provider_failures(): void {
			$factory = new OfflineRegisteredDevicePermissionResolverFactory(
				static function (): \wpdb {
					throw new RuntimeException( 'database unavailable' );
				}
			);
			$summary = $factory->readiness_summary();

			$this->assert_false( $factory->is_configured() );
			$this->assert_false( $summary['database_configured'] );
			$this->assert_true(
				in_array( 'database_provider_failed', $summary['configuration_issues'], true )
			);
			$this->assert_same( null, $factory->resolver() );
		}

		/**
		 * @return array<string, string>
		 */
		private function headers(): array {
			return array(
				'Authorization' => 'Bearer ' . self::DEVICE_TOKEN,
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
				'app_version'       => '0.115.0',
				'platform'          => 'windows',
				'status'            => 'ACTIVE',
				'last_seen_at'      => '2026-06-06 15:30:00',
				'revoked_at'        => null,
				'issued_at'         => '2026-06-06 15:00:00',
				'created_at'        => '2026-06-06 15:00:00',
				'updated_at'        => '2026-06-06 15:15:00',
				'row_version'       => '8',
			);
		}
	}
}
