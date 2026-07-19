<?php
/**
 * Offline registered-device permission readiness presenter tests.
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
	use TCGStorePlatform\Api\V1\OfflineRegisteredDevicePermissionReadinessStatusPresenter;
	use TCGStorePlatform\Offline\OfflineRegisteredDevicePermissionResolverFactory;
	use TCGStorePlatform\Tests\TestCase;

	final class OfflineRegisteredDevicePermissionReadinessStatusPresenterTest extends TestCase {
		public function test_health_payload_reports_blocked_default_readiness(): void {
			$payload = ( new OfflineRegisteredDevicePermissionReadinessStatusPresenter(
				new OfflineRegisteredDevicePermissionResolverFactory()
			) )->health_payload();

			$this->assert_same( 'blocked', $payload['status'] );
			$this->assert_false( $payload['configured'] );
			$this->assert_false( $payload['database_configured'] );
			$this->assert_same( 2, $payload['registered_device_route_count'] );
			$this->assert_same( array( 'offline_pull', 'offline_push' ), $payload['registered_device_scopes'] );
			$this->assert_true( in_array( 'database_not_configured', $payload['configuration_issues'], true ) );
		}

		public function test_admin_summary_reports_ready_configured_resolver(): void {
			$summary = ( new OfflineRegisteredDevicePermissionReadinessStatusPresenter(
				new OfflineRegisteredDevicePermissionResolverFactory(
					static fn (): \wpdb => new \wpdb()
				)
			) )->admin_summary();

			$this->assert_same( 'ready', $summary['status'] );
			$this->assert_contains( 'resolver ready', $summary['value'] );
			$this->assert_contains( 'repository ready', $summary['value'] );
			$this->assert_contains( 'session updates ready', $summary['value'] );
			$this->assert_contains( '2 scopes', $summary['value'] );
		}
	}
}
