<?php
/**
 * Offline device registration route handler tests.
 *
 * @package TCGStorePlatform
 */

namespace {
	if ( ! class_exists( 'wpdb' ) ) {
		class wpdb {
			public string $prefix = 'wp_';
			public int $insert_id = 91;
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
	use TCGStorePlatform\Api\V1\OfflineController;
	use TCGStorePlatform\Api\V1\OfflineDeviceRegistrationRouteHandler;
	use TCGStorePlatform\Offline\OfflineDeviceRegistrationCredentialIssuer;
	use TCGStorePlatform\Offline\OfflineDeviceRegistrationPlan;
	use TCGStorePlatform\Offline\OfflineDeviceRegistrationRepository;
	use TCGStorePlatform\Offline\OfflineDeviceRegistrationRepositoryResult;
	use TCGStorePlatform\Offline\OfflineDeviceRegistrationService;
	use TCGStorePlatform\Tests\TestCase;

	final class OfflineDeviceRegistrationRouteHandlerTest extends TestCase {
		private const EXPECTED_DEVICE_TOKEN = '101112131415161718191a1b1c1d1e1f'
			. '202122232425262728292a2b2c2d2e2f';

		public function test_handler_can_be_injected_for_registration_response(): void {
			$database = new \wpdb( null, 1 );
			$handler  = $this->handler( $database );
			$response = ( new OfflineController( null, $handler->handlers() ) )->register_offline_device(
				array(
					'body' => $this->pairing_payload(),
				)
			);
			$audit    = $handler->last_audit_payload();

			$this->assert_same( 'registered', $response['status'] );
			$this->assert_same( 201, $response['status_code'] );
			$this->assert_same( 'offline_device_registered', $response['code'] );
			$this->assert_same( 'register_offline_device', $response['callback'] );
			$this->assert_same( '00010203-0405-4607-8809-0a0b0c0d0e0f', $response['data']['device_id'] );
			$this->assert_same( self::EXPECTED_DEVICE_TOKEN, $response['data']['device_token'] );
			$this->assert_same( 1, $database->prepare_count );
			$this->assert_same( 1, $database->query_count );
			$this->assert_same( 'offline_device_registration_service', $audit['action'] );
			$this->assert_not_contains( self::EXPECTED_DEVICE_TOKEN, (string) json_encode( $audit ) );
			$this->assert_not_contains(
				(string) $database->last_prepare_args[5],
				(string) json_encode( $audit )
			);
		}

		public function test_handler_maps_invalid_pairing_payload_without_repository_call(): void {
			$database = new \wpdb( null, 1 );
			$handler  = $this->handler( $database );
			$response = ( new OfflineController( null, $handler->handlers() ) )->register_offline_device(
				array(
					'body' => array(),
				)
			);

			$this->assert_same( 'invalid', $response['status'] );
			$this->assert_same( 400, $response['status_code'] );
			$this->assert_same( 'offline_device_registration_invalid', $response['code'] );
			$this->assert_true( in_array( 'pairing_code_required', $response['errors'], true ) );
			$this->assert_same( 0, $database->prepare_count );
			$this->assert_same( 0, $database->query_count );
			$this->assert_same( 'invalid', $handler->last_audit_payload()['status'] );
		}

		public function test_handler_maps_repository_rejection(): void {
			$database = new \wpdb( null, false );
			$handler  = $this->handler( $database );
			$response = ( new OfflineController( null, $handler->handlers() ) )->register_offline_device(
				array(
					'body' => $this->pairing_payload(),
				)
			);

			$this->assert_same( 'rejected', $response['status'] );
			$this->assert_same( 500, $response['status_code'] );
			$this->assert_same( 'offline_device_registration_rejected', $response['code'] );
			$this->assert_same( array( 'registration_insert_failed' ), $response['errors'] );
			$this->assert_same( 'rejected', $handler->last_audit_payload()['status'] );
		}

		private function handler( \wpdb $database ): OfflineDeviceRegistrationRouteHandler {
			$repository_adapter = static function (
				OfflineDeviceRegistrationPlan $plan
			) use ( $database ): OfflineDeviceRegistrationRepositoryResult {
				return ( new OfflineDeviceRegistrationRepository( $database ) )->register( $plan );
			};

			return new OfflineDeviceRegistrationRouteHandler(
				new OfflineDeviceRegistrationService(
					null,
					new OfflineDeviceRegistrationCredentialIssuer( $this->deterministic_bytes() ),
					null,
					$repository_adapter
				)
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
				'app_version'      => '0.81.0',
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
