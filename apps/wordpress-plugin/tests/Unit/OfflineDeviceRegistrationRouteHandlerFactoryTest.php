<?php
/**
 * Offline device registration route handler factory tests.
 *
 * @package TCGStorePlatform
 */

namespace {
	if ( ! class_exists( 'wpdb' ) ) {
		class wpdb {
			public string $prefix = 'wp_';
			public int $insert_id = 119;
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
	use TCGStorePlatform\Api\V1\OfflineDevicePairingRouteReadinessPlanner;
	use TCGStorePlatform\Api\V1\OfflineDeviceRegistrationRouteHandler;
	use TCGStorePlatform\Api\V1\OfflineDeviceRegistrationRouteHandlerFactory;
	use TCGStorePlatform\Api\V1\OfflineRestRequestData;
	use TCGStorePlatform\Offline\OfflineDevicePairingAuthorizerFactory;
	use TCGStorePlatform\Tests\TestCase;

	final class OfflineDeviceRegistrationRouteHandlerFactoryTest extends TestCase {
		private const PAIRING_CODE = 'PAIR-2026-HANDLER';

		public function test_factory_reports_missing_dependencies_fail_closed(): void {
			$factory = new OfflineDeviceRegistrationRouteHandlerFactory();
			$summary = $factory->readiness_summary();

			$this->assert_false( $factory->is_configured() );
			$this->assert_false( $summary['configured'] );
			$this->assert_false( $summary['database_configured'] );
			$this->assert_false( $summary['pairing_policy_configured'] );
			$this->assert_true( in_array( 'database_not_configured', $summary['configuration_issues'], true ) );
			$this->assert_true(
				in_array( 'pairing_policy_provider_not_configured', $summary['configuration_issues'], true )
			);
			$this->assert_same( null, $factory->handler() );
		}

		public function test_factory_builds_staged_handler_from_database_and_policy(): void {
			$database = new \wpdb( null, 1 );
			$factory  = $this->factory( $database );
			$summary  = $factory->readiness_summary();
			$handler  = $factory->handler();

			$this->assert_true( $factory->is_configured() );
			$this->assert_true( $summary['configured'] );
			$this->assert_true( $summary['database_configured'] );
			$this->assert_true( $summary['repository_configured'] );
			$this->assert_true( $summary['pairing_policy_configured'] );
			$this->assert_same( array(), $summary['configuration_issues'] );
			$this->assert_true( $handler instanceof OfflineDeviceRegistrationRouteHandler );

			$response = $handler->register(
				new OfflineRestRequestData( $this->pairing_payload(), array(), array(), array() )
			);
			$audit    = $handler->last_audit_payload();

			$this->assert_same( 'registered', $response['status'] );
			$this->assert_same( 201, $response['status_code'] );
			$this->assert_same( 'offline_device_registered', $response['code'] );
			$this->assert_same( 1, $database->prepare_count );
			$this->assert_same( 1, $database->query_count );
			$this->assert_same( 'authorized', $audit['pairing_authorization']['status'] );
			$this->assert_not_contains( self::PAIRING_CODE, (string) json_encode( $response ) );
			$this->assert_not_contains( self::PAIRING_CODE, (string) json_encode( $audit ) );
		}

		public function test_route_readiness_can_use_factory_built_handler_without_registering_route(): void {
			$database           = new \wpdb( null, 1 );
			$authorizer_factory = $this->authorizer_factory();
			$handler_factory    = new OfflineDeviceRegistrationRouteHandlerFactory(
				static fn (): \wpdb => $database,
				$authorizer_factory
			);
			$plan               = ( new OfflineDevicePairingRouteReadinessPlanner(
				null,
				null,
				$authorizer_factory,
				$handler_factory
			) )->plan( true );

			$this->assert_same( 'gated', $plan['status'] );
			$this->assert_true( $plan['handler_injected'] );
			$this->assert_true( $plan['handler_summary']['configured'] );
			$this->assert_true( $plan['handler_summary']['database_configured'] );
			$this->assert_true( $plan['policy_configured'] );
			$this->assert_true( $plan['permission_callback_ready'] );
			$this->assert_true( $plan['controller_callback_ready'] );
			$this->assert_false( $plan['should_register'] );
			$this->assert_true( in_array( 'route_disabled_by_default', $plan['registration_block_reasons'], true ) );
			$this->assert_same( 0, $database->prepare_count );
			$this->assert_same( 0, $database->query_count );
		}

		public function test_factory_keeps_handler_unavailable_when_policy_is_incomplete(): void {
			$factory = new OfflineDeviceRegistrationRouteHandlerFactory(
				static fn (): \wpdb => new \wpdb( null, 1 ),
				new OfflineDevicePairingAuthorizerFactory(
					static fn (): array => array(),
					static fn (): string => '2026-06-06T18:30:00Z'
				)
			);
			$summary = $factory->readiness_summary();

			$this->assert_false( $factory->is_configured() );
			$this->assert_true( $summary['database_configured'] );
			$this->assert_false( $summary['pairing_policy_configured'] );
			$this->assert_true(
				in_array( 'pairing_policy_not_configured', $summary['configuration_issues'], true )
			);
			$this->assert_same( null, $factory->handler() );
		}

		public function test_factory_reports_database_provider_failures_without_building_handler(): void {
			$factory = new OfflineDeviceRegistrationRouteHandlerFactory(
				static function (): \wpdb {
					throw new RuntimeException( 'database unavailable' );
				},
				$this->authorizer_factory()
			);
			$summary = $factory->readiness_summary();

			$this->assert_false( $summary['configured'] );
			$this->assert_false( $summary['database_configured'] );
			$this->assert_true( $summary['pairing_policy_configured'] );
			$this->assert_true(
				in_array( 'database_provider_failed', $summary['configuration_issues'], true )
			);
			$this->assert_same( null, $factory->handler() );
		}

		private function factory( \wpdb $database ): OfflineDeviceRegistrationRouteHandlerFactory {
			return new OfflineDeviceRegistrationRouteHandlerFactory(
				static fn (): \wpdb => $database,
				$this->authorizer_factory()
			);
		}

		private function authorizer_factory(): OfflineDevicePairingAuthorizerFactory {
			return new OfflineDevicePairingAuthorizerFactory(
				fn (): array => array( 'offline_pairing_authorization' => $this->policy() ),
				static fn (): string => '2026-06-06T18:30:00Z'
			);
		}

		/**
		 * @return array<string, mixed>
		 */
		private function policy(): array {
			return array(
				'pairing_code_hashes'    => array( hash( 'sha256', self::PAIRING_CODE ) ),
				'manager_ids'            => array( 42 ),
				'location_ids'           => array( 2 ),
				'allowed_scopes_by_mode' => array(
					'kiosk' => array( 'offline_pull', 'offline_push', 'kiosk' ),
				),
				'expires_at_utc'         => '2026-06-06T19:00:00Z',
			);
		}

		/**
		 * @return array<string, mixed>
		 */
		private function pairing_payload(): array {
			return array(
				'pairing_code'     => self::PAIRING_CODE,
				'installation_id'  => 'front-counter-install',
				'device_label'     => 'Front Counter Kiosk',
				'device_mode'      => 'kiosk',
				'location_id'      => 2,
				'manager_id'       => 42,
				'app_version'      => '0.112.0',
				'platform'         => 'windows',
				'capabilities'     => array(
					'barcode_scanner' => true,
					'label_printer'   => false,
				),
				'requested_scopes' => array( 'offline_pull', 'offline_push', 'kiosk' ),
				'schema_version'   => 1,
			);
		}
	}
}
