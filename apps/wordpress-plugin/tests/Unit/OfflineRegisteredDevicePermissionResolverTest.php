<?php
/**
 * Offline registered device permission resolver tests.
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
	use TCGStorePlatform\Offline\OfflineRegisteredDevicePermissionResolver;
	use TCGStorePlatform\Offline\OfflineRegisteredDeviceRepository;
	use TCGStorePlatform\Tests\TestCase;

	final class OfflineRegisteredDevicePermissionResolverTest extends TestCase {
		private const DEVICE_TOKEN = 'test-device-token-abcdefghijklmnopqrstuvwxyz-123456';

		public function test_resolver_authorizes_registered_device_from_repository(): void {
			$database   = new \wpdb( $this->database_row() );
			$resolution = $this->resolver( $database )->resolve(
				$this->headers(),
				'offline_push',
				'2026-06-06T20:30:00Z'
			);
			$audit      = $resolution->audit_payload();

			$this->assert_true( $resolution->is_authorized() );
			$this->assert_true( $resolution->lookup_attempted() );
			$this->assert_same( 'found', $resolution->repository_result()?->status() );
			$this->assert_same( 1, $database->prepare_count );
			$this->assert_same( 1, $database->get_row_count );
			$this->assert_same( 9, $resolution->session_plan()?->device_update_row()['row_version'] );
			$this->assert_same( 'authorized', $audit['status'] );
			$this->assert_same( 'authorized', $audit['stage'] );
			$this->assert_true( $audit['has_session_plan'] );
			$this->assert_not_contains( self::DEVICE_TOKEN, (string) json_encode( $audit ) );
			$this->assert_not_contains(
				OfflineDeviceTokenAuthenticator::token_hash( self::DEVICE_TOKEN ),
				(string) json_encode( $audit )
			);
		}

		public function test_resolver_denies_not_found_devices_without_final_permission_plan(): void {
			$database   = new \wpdb();
			$resolution = $this->resolver( $database )->resolve(
				$this->headers(),
				'offline_push',
				'2026-06-06T20:30:00Z'
			);
			$audit      = $resolution->audit_payload();

			$this->assert_false( $resolution->is_authorized() );
			$this->assert_true( $resolution->lookup_attempted() );
			$this->assert_same( 'not_found', $resolution->repository_result()?->status() );
			$this->assert_same( null, $resolution->final_permission_plan() );
			$this->assert_same( array( 'registered_device_not_found' ), $resolution->errors() );
			$this->assert_same( 'repository_not_found', $audit['stage'] );
			$this->assert_false( $audit['has_session_plan'] );
		}

		public function test_resolver_rejects_invalid_tokens_before_repository_lookup(): void {
			$database   = new \wpdb( $this->database_row() );
			$resolution = $this->resolver( $database )->resolve(
				array(
					'Authorization' => 'Bearer short',
				),
				'offline_push',
				'2026-06-06T20:30:00Z'
			);
			$audit      = $resolution->audit_payload();

			$this->assert_false( $resolution->is_authorized() );
			$this->assert_false( $resolution->lookup_attempted() );
			$this->assert_same( null, $resolution->repository_result() );
			$this->assert_same( 0, $database->prepare_count );
			$this->assert_same( 0, $database->get_row_count );
			$this->assert_same( array( 'device_token_invalid' ), $resolution->errors() );
			$this->assert_same( 'token_lookup_rejected', $audit['stage'] );
		}

		public function test_resolver_rejects_malformed_repository_rows(): void {
			$database   = new \wpdb(
				$this->database_row(
					array(
						'offline_device_id' => '0',
						'token_hash'        => 'bad',
					)
				)
			);
			$resolution = $this->resolver( $database )->resolve(
				$this->headers(),
				'offline_push',
				'2026-06-06T20:30:00Z'
			);
			$audit      = $resolution->audit_payload();

			$this->assert_false( $resolution->is_authorized() );
			$this->assert_same( 'rejected', $resolution->repository_result()?->status() );
			$this->assert_same( null, $resolution->final_permission_plan() );
			$this->assert_true( in_array( 'offline_device_id_invalid', $resolution->errors(), true ) );
			$this->assert_true( in_array( 'token_hash_invalid', $resolution->errors(), true ) );
			$this->assert_same( 'repository_rejected', $audit['stage'] );
			$this->assert_false( array_key_exists( 'token_hash', $audit['repository']['normalization_audit'] ) );
		}

		public function test_resolver_returns_final_permission_denials_for_loaded_rows(): void {
			$database   = new \wpdb(
				$this->database_row(
					array(
						'scopes_json' => '["offline_pull"]',
					)
				)
			);
			$resolution = $this->resolver( $database )->resolve(
				$this->headers(),
				'offline_push',
				'2026-06-06T20:30:00Z'
			);
			$audit      = $resolution->audit_payload();

			$this->assert_false( $resolution->is_authorized() );
			$this->assert_same( 'found', $resolution->repository_result()?->status() );
			$this->assert_false( null === $resolution->final_permission_plan() );
			$this->assert_true( in_array( 'required_scope_denied', $resolution->errors(), true ) );
			$this->assert_same( 'device_authorization_denied', $audit['stage'] );
			$this->assert_false( $audit['has_session_plan'] );
		}

		public function test_resolver_can_apply_session_update_for_authorized_devices(): void {
			$database   = new \wpdb( $this->database_row(), 1 );
			$resolution = $this->resolver_with_session_updates( $database )->resolve_and_apply_session_update(
				$this->headers(),
				'offline_push',
				'2026-06-06T20:30:00Z'
			);
			$audit      = $resolution->audit_payload();

			$this->assert_true( $resolution->is_authorized() );
			$this->assert_true( $resolution->session_update_attempted() );
			$this->assert_true( $resolution->session_update_result()?->is_applied() );
			$this->assert_same( 'applied', $audit['session_update_status'] );
			$this->assert_true( $audit['session_updated'] );
			$this->assert_same( 2, $database->prepare_count );
			$this->assert_same( 1, $database->get_row_count );
			$this->assert_same( 1, $database->query_count );
			$this->assert_contains( 'prepared:UPDATE `wp_tcg_offline_devices`', $database->last_query );
			$this->assert_same( array(), $resolution->errors() );
			$this->assert_not_contains( self::DEVICE_TOKEN, (string) json_encode( $audit ) );
			$this->assert_not_contains(
				OfflineDeviceTokenAuthenticator::token_hash( self::DEVICE_TOKEN ),
				(string) json_encode( $audit )
			);
		}

		public function test_resolver_denies_stale_session_update_results(): void {
			$database   = new \wpdb( $this->database_row(), 0 );
			$resolution = $this->resolver_with_session_updates( $database )->resolve_and_apply_session_update(
				$this->headers(),
				'offline_push',
				'2026-06-06T20:30:00Z'
			);
			$audit      = $resolution->audit_payload();

			$this->assert_false( $resolution->is_authorized() );
			$this->assert_true( $resolution->session_update_attempted() );
			$this->assert_true( $resolution->session_update_result()?->is_stale() );
			$this->assert_same( 'session_update_stale', $audit['stage'] );
			$this->assert_same( 'stale', $audit['session_update_status'] );
			$this->assert_false( $audit['session_updated'] );
			$this->assert_true( in_array( 'session_update_stale', $resolution->errors(), true ) );
			$this->assert_same( 2, $database->prepare_count );
			$this->assert_same( 1, $database->query_count );
		}

		public function test_resolver_denies_failed_session_update_results(): void {
			$database   = new \wpdb( $this->database_row(), false );
			$resolution = $this->resolver_with_session_updates( $database )->resolve_and_apply_session_update(
				$this->headers(),
				'offline_push',
				'2026-06-06T20:30:00Z'
			);
			$audit      = $resolution->audit_payload();

			$this->assert_false( $resolution->is_authorized() );
			$this->assert_true( $resolution->session_update_attempted() );
			$this->assert_true( $resolution->session_update_result()?->is_rejected() );
			$this->assert_same( 'session_update_rejected', $audit['stage'] );
			$this->assert_same( 'rejected', $audit['session_update_status'] );
			$this->assert_true( in_array( 'session_update_failed', $resolution->errors(), true ) );
			$this->assert_same( 2, $database->prepare_count );
			$this->assert_same( 1, $database->query_count );
		}

		public function test_resolver_skips_session_update_when_device_is_denied(): void {
			$database   = new \wpdb(
				$this->database_row(
					array(
						'scopes_json' => '["offline_pull"]',
					)
				),
				1
			);
			$resolution = $this->resolver_with_session_updates( $database )->resolve_and_apply_session_update(
				$this->headers(),
				'offline_push',
				'2026-06-06T20:30:00Z'
			);

			$this->assert_false( $resolution->is_authorized() );
			$this->assert_false( $resolution->session_update_attempted() );
			$this->assert_same( null, $resolution->session_update_result() );
			$this->assert_same( 1, $database->prepare_count );
			$this->assert_same( 1, $database->get_row_count );
			$this->assert_same( 0, $database->query_count );
		}

		private function resolver( \wpdb $database ): OfflineRegisteredDevicePermissionResolver {
			return new OfflineRegisteredDevicePermissionResolver(
				new OfflineRegisteredDeviceRepository( $database )
			);
		}

		private function resolver_with_session_updates(
			\wpdb $database
		): OfflineRegisteredDevicePermissionResolver {
			return new OfflineRegisteredDevicePermissionResolver(
				new OfflineRegisteredDeviceRepository( $database ),
				null,
				new OfflineDeviceSessionUpdateRepository( $database )
			);
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
					'app_version'       => '0.67.0',
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
