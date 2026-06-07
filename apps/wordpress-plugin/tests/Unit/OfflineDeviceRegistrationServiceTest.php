<?php
/**
 * Offline device registration service tests.
 *
 * @package TCGStorePlatform
 */

namespace {
	if ( ! class_exists( 'wpdb' ) ) {
		class wpdb {
			public string $prefix = 'wp_';
			public int $insert_id = 88;
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
	use TCGStorePlatform\Offline\OfflineDevicePairingAuthorizer;
	use TCGStorePlatform\Offline\OfflineDeviceRegistrationCredentialIssuer;
	use TCGStorePlatform\Offline\OfflineDeviceRegistrationPlan;
	use TCGStorePlatform\Offline\OfflineDeviceRegistrationRepository;
	use TCGStorePlatform\Offline\OfflineDeviceRegistrationRepositoryResult;
	use TCGStorePlatform\Offline\OfflineDeviceRegistrationService;
	use TCGStorePlatform\Tests\TestCase;

	final class OfflineDeviceRegistrationServiceTest extends TestCase {
		private const EXPECTED_DEVICE_TOKEN = '101112131415161718191a1b1c1d1e1f'
			. '202122232425262728292a2b2c2d2e2f';

		public function test_service_registers_pairing_request_and_returns_one_time_credentials(): void {
			$database           = new \wpdb( null, 1 );
			$repository_calls   = 0;
			$repository_adapter = static function ( OfflineDeviceRegistrationPlan $plan ) use (
				$database,
				&$repository_calls
			): OfflineDeviceRegistrationRepositoryResult {
				++$repository_calls;

				return ( new OfflineDeviceRegistrationRepository( $database ) )->register( $plan );
			};
			$result             = $this->service( $repository_adapter )->register(
				$this->pairing_payload(),
				'2026-06-06T18:30:00Z',
				3600
			);
			$response           = $result->response_payload();
			$audit              = $result->audit_payload();

			$this->assert_true( $result->is_registered() );
			$this->assert_false( $result->is_invalid() );
			$this->assert_same( 'registered', $result->status() );
			$this->assert_same( 201, $result->status_code() );
			$this->assert_same( array(), $result->errors() );
			$this->assert_same( 1, $repository_calls );
			$this->assert_same( 1, $database->prepare_count );
			$this->assert_same( 1, $database->query_count );
			$this->assert_same( '00010203-0405-4607-8809-0a0b0c0d0e0f', $response['device_id'] );
			$this->assert_same( self::EXPECTED_DEVICE_TOKEN, $response['device_token'] );
			$this->assert_same( '2026-06-06T19:30:00Z', $response['token_expires_at_utc'] );
			$this->assert_same( array( 'offline_pull', 'offline_push', 'kiosk' ), $response['scopes'] );
			$this->assert_same( 'offline_device_registration_service', $audit['action'] );
			$this->assert_same( 'registered', $audit['status'] );
			$this->assert_same(
				'offline_device_registration_credentials_issued',
				$audit['credentials']['action']
			);
			$this->assert_same( 'offline_device_registration_repository', $audit['repository']['action'] );
			$this->assert_not_contains( $response['device_token'], (string) json_encode( $audit ) );
			$this->assert_not_contains(
				(string) $database->last_prepare_args[5],
				(string) json_encode( $audit )
			);
		}

		public function test_service_can_require_pairing_authorization_before_issuing_credentials(): void {
			$database           = new \wpdb( null, 1 );
			$repository_calls   = 0;
			$repository_adapter = static function ( OfflineDeviceRegistrationPlan $plan ) use (
				$database,
				&$repository_calls
			): OfflineDeviceRegistrationRepositoryResult {
				++$repository_calls;

				return ( new OfflineDeviceRegistrationRepository( $database ) )->register( $plan );
			};
			$result             = $this->service(
				$repository_adapter,
				$this->pairing_authorizer()
			)->register(
				$this->pairing_payload(),
				'2026-06-06T18:30:00Z',
				3600
			);
			$audit              = $result->audit_payload();

			$this->assert_true( $result->is_registered() );
			$this->assert_same( 1, $repository_calls );
			$this->assert_same( 1, $database->prepare_count );
			$this->assert_same( 'authorized', $audit['pairing_authorization']['status'] );
			$this->assert_same(
				'offline_device_pairing_authorization',
				$audit['pairing_authorization']['action']
			);
			$this->assert_not_contains(
				$this->pairing_payload()['pairing_code'],
				(string) json_encode( $audit )
			);
			$this->assert_not_contains(
				hash( 'sha256', $this->pairing_payload()['pairing_code'] ),
				(string) json_encode( $audit )
			);
		}

		public function test_service_rejects_pairing_authorization_before_credentials_or_repository(): void {
			$database           = new \wpdb( null, 1 );
			$repository_called  = false;
			$repository_adapter = static function () use ( &$repository_called ): void {
				$repository_called = true;
			};
			$result             = $this->service(
				$repository_adapter,
				$this->pairing_authorizer( array( 'manager_ids' => array( 99 ) ) )
			)->register(
				$this->pairing_payload(),
				'2026-06-06T18:30:00Z',
				3600
			);
			$audit              = $result->audit_payload();

			$this->assert_true( $result->is_rejected() );
			$this->assert_same( 403, $result->status_code() );
			$this->assert_true( in_array( 'manager_not_allowed', $result->errors(), true ) );
			$this->assert_same( array(), $result->response_payload() );
			$this->assert_false( $repository_called );
			$this->assert_same( 0, $database->prepare_count );
			$this->assert_same( 0, $database->query_count );
			$this->assert_same( 'denied', $audit['pairing_authorization']['status'] );
			$this->assert_same( array(), $audit['credentials'] );
			$this->assert_same( array(), $audit['repository'] );
			$this->assert_not_contains(
				$this->pairing_payload()['pairing_code'],
				(string) json_encode( $audit )
			);
		}

		public function test_service_rejects_invalid_pairing_payload_without_repository_call(): void {
			$repository_called = false;
			$result            = $this->service(
				static function () use ( &$repository_called ): void {
					$repository_called = true;
				}
			)->register( array() );

			$this->assert_true( $result->is_invalid() );
			$this->assert_same( 400, $result->status_code() );
			$this->assert_same( array(), $result->response_payload() );
			$this->assert_false( $repository_called );
			$this->assert_true( in_array( 'pairing_code_required', $result->errors(), true ) );
			$this->assert_true( in_array( 'installation_id_required', $result->errors(), true ) );
			$this->assert_same( array(), $result->audit_payload()['credentials'] );
			$this->assert_same( array(), $result->audit_payload()['repository'] );
		}

		public function test_service_requires_explicit_repository_configuration(): void {
			$result = $this->service()->register( $this->pairing_payload() );

			$this->assert_true( $result->is_rejected() );
			$this->assert_same( 'rejected', $result->status() );
			$this->assert_same( 503, $result->status_code() );
			$this->assert_same( array( 'registration_repository_not_configured' ), $result->errors() );
			$this->assert_same( array(), $result->response_payload() );
			$this->assert_same( array(), $result->audit_payload()['credentials'] );
			$this->assert_same( array(), $result->audit_payload()['repository'] );
		}

		public function test_service_surfaces_repository_rejection_without_secret_audit_leakage(): void {
			$database           = new \wpdb( null, false );
			$repository_adapter = static function (
				OfflineDeviceRegistrationPlan $plan
			) use ( $database ): OfflineDeviceRegistrationRepositoryResult {
				return ( new OfflineDeviceRegistrationRepository( $database ) )->register( $plan );
			};
			$result             = $this->service( $repository_adapter )->register(
				$this->pairing_payload(),
				'2026-06-06T18:30:00Z'
			);
			$audit              = $result->audit_payload();

			$this->assert_true( $result->is_rejected() );
			$this->assert_same( 500, $result->status_code() );
			$this->assert_same( array( 'registration_insert_failed' ), $result->errors() );
			$this->assert_same( array(), $result->response_payload() );
			$this->assert_same(
				'offline_device_registration_credentials_issued',
				$audit['credentials']['action']
			);
			$this->assert_same( 'offline_device_registration_repository', $audit['repository']['action'] );
			$this->assert_same( 'rejected', $audit['repository']['status'] );
			$this->assert_not_contains( self::EXPECTED_DEVICE_TOKEN, (string) json_encode( $audit ) );
			$this->assert_not_contains(
				(string) $database->last_prepare_args[5],
				(string) json_encode( $audit )
			);
		}

		private function service(
			?callable $repository_adapter = null,
			?callable $pairing_authorizer = null
		): OfflineDeviceRegistrationService {
			return new OfflineDeviceRegistrationService(
				null,
				new OfflineDeviceRegistrationCredentialIssuer( $this->deterministic_bytes() ),
				null,
				$repository_adapter,
				$pairing_authorizer
			);
		}

		/**
		 * @param array<string, mixed> $overrides Policy overrides.
		 */
		private function pairing_authorizer( array $overrides = array() ): OfflineDevicePairingAuthorizer {
			return new OfflineDevicePairingAuthorizer(
				array_merge(
					array(
						'pairing_code_hashes'    => array( hash( 'sha256', 'PAIR-2026-REGISTER-DEVICE' ) ),
						'manager_ids'            => array( 42 ),
						'location_ids'           => array( 2 ),
						'allowed_scopes_by_mode' => array(
							'kiosk' => array( 'offline_pull', 'offline_push', 'kiosk' ),
						),
						'expires_at_utc'         => '2026-06-06T19:30:00Z',
					),
					$overrides
				),
				static fn (): string => '2026-06-06T18:30:00Z'
			);
		}

		private function deterministic_bytes(): callable {
			$offset = 0;

			return static function ( int $length ) use ( &$offset ): string {
				$bytes = '';

				for ( $index = 0; $index < $length; ++$index ) {
					$bytes .= chr( ( $offset + $index ) % 256 );
				}

				$offset += $length;

				return $bytes;
			};
		}

		/**
		 * @return array<string, mixed>
		 */
		private function pairing_payload(): array {
			return array(
				'pairing_code'     => 'PAIR-2026-REGISTER-DEVICE',
				'installation_id'  => 'front-counter-install',
				'device_label'     => 'Front Counter Kiosk',
				'device_mode'      => 'kiosk',
				'location_id'      => 2,
				'manager_id'       => 42,
				'app_version'      => '0.89.0',
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
