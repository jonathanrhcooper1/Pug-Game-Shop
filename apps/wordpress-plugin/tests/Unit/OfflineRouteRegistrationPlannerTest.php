<?php
/**
 * Offline route registration planner tests.
 *
 * @package TCGStorePlatform
 */

namespace {
	if ( ! class_exists( 'wpdb' ) ) {
		class wpdb {
			public string $prefix = 'wp_';

			/**
			 * @param array<string, mixed>|null $row Row returned by get_row.
			 */
			public function __construct( private ?array $row = null ) {
			}

			/**
			 * @param list<mixed> $args Prepared arguments.
			 */
			public function prepare( string $query, array $args ): string {
				unset( $args );

				return 'prepared:' . $query;
			}

			/**
			 * @return array<string, mixed>|null
			 */
			public function get_row( string $query, string $output_type ): ?array {
				unset( $query, $output_type );

				return $this->row;
			}

			public function query( string $query ): int|false {
				unset( $query );

				return 1;
			}
		}
	}
}

namespace TCGStorePlatform\Tests\Unit {
	use TCGStorePlatform\Api\V1\OfflineController;
	use TCGStorePlatform\Api\V1\OfflineRoutePermissionCallbackFactory;
	use TCGStorePlatform\Api\V1\OfflineRouteRegistrationPlanner;
	use TCGStorePlatform\Offline\OfflineDeviceSessionUpdateRepository;
	use TCGStorePlatform\Offline\OfflineDeviceTokenAuthenticator;
	use TCGStorePlatform\Offline\OfflineRegisteredDevicePermissionCallbackAdapter;
	use TCGStorePlatform\Offline\OfflineRegisteredDevicePermissionResolver;
	use TCGStorePlatform\Offline\OfflineRegisteredDeviceRepository;
	use TCGStorePlatform\Tests\TestCase;

	final class OfflineRouteRegistrationPlannerTest extends TestCase {
		private const DEVICE_TOKEN = 'test-device-token-abcdefghijklmnopqrstuvwxyz-123456';

		public function test_offline_routes_remain_disabled_without_callback_factory(): void {
			$planner = new OfflineRouteRegistrationPlanner();
			$plans   = $planner->planned_registration_args();

			$this->assert_same( 5, count( $plans ) );
			$this->assert_same( array(), $planner->enabled_registration_args() );

			foreach ( $plans as $plan ) {
				$this->assert_false( $plan['should_register'] );
				$this->assert_false( $plan['permission_callback_ready'] );
				$this->assert_false( $plan['controller_callback_ready'] );
				$this->assert_same( null, $plan['controller_callback'] );
				$this->assert_same( '__return_false', $plan['permission_callback'] );
				$this->assert_true( in_array( 'route_disabled_by_default', $plan['registration_block_reasons'], true ) );
				$this->assert_true( in_array( 'permission_callback_not_ready', $plan['registration_block_reasons'], true ) );
				$this->assert_true( in_array( 'controller_callback_not_ready', $plan['registration_block_reasons'], true ) );
			}
		}

		public function test_planner_attaches_registered_device_permission_callbacks_as_planned_metadata(): void {
			$plans = $this->planner()->planned_registration_args();
			$pull  = $plans['POST /offline/pull'];
			$push  = $plans['POST /offline/push'];

			$this->assert_true( $pull['permission_callback'] instanceof OfflineRegisteredDevicePermissionCallbackAdapter );
			$this->assert_true( $push['permission_callback'] instanceof OfflineRegisteredDevicePermissionCallbackAdapter );
			$this->assert_true( $pull['permission_callback_ready'] );
			$this->assert_true( $push['permission_callback_ready'] );
			$this->assert_same( 'offline_pull', $pull['permission_callback']->required_scope() );
			$this->assert_same( 'offline_push', $push['permission_callback']->required_scope() );
			$this->assert_false( $pull['should_register'] );
			$this->assert_false( $push['should_register'] );
			$this->assert_true( in_array( 'route_disabled_by_default', $pull['registration_block_reasons'], true ) );
			$this->assert_false( in_array( 'permission_callback_not_ready', $pull['registration_block_reasons'], true ) );
		}

		public function test_planner_keeps_pairing_and_conflict_routes_locked(): void {
			$plans = $this->planner()->planned_registration_args();

			foreach (
				array(
					'POST /offline/devices/register',
					'GET /offline/conflicts',
					'POST /offline/conflicts/(?P<conflict_id>[a-zA-Z0-9_-]+)/resolve',
				) as $route_key
			) {
				$this->assert_same( '__return_false', $plans[ $route_key ]['permission_callback'] );
				$this->assert_false( $plans[ $route_key ]['permission_callback_ready'] );
				$this->assert_false( $plans[ $route_key ]['should_register'] );
			}
		}

		public function test_planner_tracks_controller_callback_readiness_without_enabling_routes(): void {
			$plans = $this->planner_with_controller()->planned_registration_args();

			foreach ( $plans as $plan ) {
				$this->assert_true( $plan['controller_callback_ready'] );
				$this->assert_true( is_callable( $plan['controller_callback'] ) );
				$this->assert_false( $plan['should_register'] );
				$this->assert_true( in_array( 'route_disabled_by_default', $plan['registration_block_reasons'], true ) );
				$this->assert_false(
					in_array( 'controller_callback_not_ready', $plan['registration_block_reasons'], true )
				);
			}
		}

		public function test_planner_never_uses_public_permission_bypass(): void {
			$plans = $this->planner()->planned_registration_args();

			foreach ( $plans as $plan ) {
				if ( is_string( $plan['permission_callback'] ) ) {
					$this->assert_not_contains( '__return_true', $plan['permission_callback'] );
				}
			}
		}

		private function planner(): OfflineRouteRegistrationPlanner {
			return new OfflineRouteRegistrationPlanner( $this->permission_callback_factory() );
		}

		private function planner_with_controller(): OfflineRouteRegistrationPlanner {
			return new OfflineRouteRegistrationPlanner(
				$this->permission_callback_factory(),
				new OfflineController()
			);
		}

		private function permission_callback_factory(): OfflineRoutePermissionCallbackFactory {
			$database = new \wpdb( $this->database_row() );

			return new OfflineRoutePermissionCallbackFactory(
				new OfflineRegisteredDevicePermissionResolver(
					new OfflineRegisteredDeviceRepository( $database ),
					null,
					new OfflineDeviceSessionUpdateRepository( $database )
				),
				static fn (): string => '2026-06-06T20:30:00Z'
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
				'app_version'       => '0.73.0',
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
