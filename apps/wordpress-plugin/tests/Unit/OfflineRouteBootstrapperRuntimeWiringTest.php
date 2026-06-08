<?php
/**
 * Offline route runtime wiring tests.
 *
 * @package TCGStorePlatform
 */

namespace {
	if ( ! class_exists( 'wpdb' ) ) {
		class wpdb {
			public string $prefix = 'wp_';
		}
	}

	if ( ! class_exists( 'OfflineRouteBootstrapperRuntimeWpdb' ) ) {
		class OfflineRouteBootstrapperRuntimeWpdb extends \wpdb {
			public string $prefix = 'wp_';
			public int $query_count = 0;
			public int $get_row_count = 0;
			public int $get_results_count = 0;
			public int $prepare_count = 0;

			/**
			 * @param array<string, mixed> $device_row Registered device row.
			 * @param array<string, mixed> $snapshot_row Server snapshot row.
			 */
			public function __construct(
				private array $device_row,
				private array $snapshot_row
			) {
			}

			/**
			 * @param list<mixed> $args Prepared arguments.
			 */
			public function prepare( string $query, array $args ): string {
				unset( $args );

				++$this->prepare_count;

				return 'prepared:' . $query;
			}

			/**
			 * @return array<string, mixed>|null
			 */
			public function get_row( string $query, string $output_type ): ?array {
				unset( $query, $output_type );

				++$this->get_row_count;

				return 1 === $this->get_row_count ? $this->device_row : $this->snapshot_row;
			}

			/**
			 * @return list<array<string, mixed>>
			 */
			public function get_results( string $query, string $output_type ): array {
				unset( $query, $output_type );

				++$this->get_results_count;

				return array();
			}

			public function query( string $query ): int|false {
				unset( $query );

				++$this->query_count;

				return 1;
			}
		}
	}
}

namespace TCGStorePlatform\Tests\Unit {
	use ReflectionMethod;
	use TCGStorePlatform\Api\V1\OfflineRouteBootstrapper;
	use TCGStorePlatform\Api\V1\OfflineRouteRuntimeConfigurator;
	use TCGStorePlatform\Offline\OfflineDeviceTokenAuthenticator;
	use TCGStorePlatform\Settings\Settings;
	use TCGStorePlatform\Tests\TestCase;

	final class OfflineRouteBootstrapperRuntimeWiringTest extends TestCase {
		private const DEVICE_TOKEN = 'route-runtime-device-token-abcdefghijklmnopqrstuvwxyz';

		public function test_runtime_enabled_push_uses_route_connected_handler_with_canonical_writes_deferred(): void {
			global $wpdb;

			$database = new \OfflineRouteBootstrapperRuntimeWpdb(
				$this->database_row(),
				$this->inventory_snapshot_row()
			);
			$previous_database = $wpdb ?? null;
			$wpdb              = $database;

			try {
				$settings  = Settings::defaults();
				$settings['offline_route_runtime'] = array(
					'device_pairing_route_enabled' => false,
					'pull_route_enabled'           => true,
					'push_route_enabled'           => true,
					'conflict_routes_enabled'      => false,
				);
				$planner   = $this->runtime_registration_planner( $settings );
				$contracts = ( new OfflineRouteRuntimeConfigurator() )->route_contracts(
					$settings['offline_route_runtime']
				);
				$plans     = $planner->planned_registration_args( $contracts );
				$push_plan = $plans['POST /offline/push'];
				$callback  = $push_plan['controller_callback'];

				$this->assert_true( $push_plan['should_register'] );
				$this->assert_true( $push_plan['permission_callback_ready'] );
				$this->assert_true( $push_plan['controller_callback_ready'] );
				$this->assert_true( is_array( $callback ) );

				$response = $callback(
					array(
						'body'    => $this->push_body(),
						'headers' => $this->headers(),
					)
				);

				$this->assert_same( 'ready', $response['status'] );
				$this->assert_same( 'offline_push_response_ready', $response['code'] );
				$this->assert_same( 'persisted', $response['meta']['persistence_status'] );
				$this->assert_false( $response['meta']['push_queue_persistence_deferred'] );
				$this->assert_false( $response['meta']['push_conflict_persistence_deferred'] );
				$this->assert_true( $response['meta']['push_canonical_mutation_repository_execution_gate_deferred'] );
				$this->assert_true( $response['meta']['push_canonical_mutation_transaction_execution_deferred'] );
				$this->assert_true( $response['meta']['push_canonical_mutations_deferred'] );
				$this->assert_same( 1, $database->query_count );
			} finally {
				$wpdb = $previous_database;
			}
		}

		/**
		 * @param array<string, mixed> $settings Platform settings.
		 */
		private function runtime_registration_planner( array $settings ): object {
			$method = new ReflectionMethod( OfflineRouteBootstrapper::class, 'runtime_registration_planner' );
			$method->setAccessible( true );

			return $method->invoke( new OfflineRouteBootstrapper(), $settings );
		}

		/**
		 * @return array<string, string>
		 */
		private function headers(): array {
			return array(
				'authorization'   => 'Bearer ' . self::DEVICE_TOKEN,
				'Idempotency-Key' => 'batch-runtime-01',
			);
		}

		/**
		 * @return array<string, mixed>
		 */
		private function push_body(): array {
			return array(
				'device_id'  => 'device-runtime-01',
				'operations' => array(
					array(
						'client_operation_id'   => 'op-runtime-01',
						'device_id'             => 'device-runtime-01',
						'location_id'           => 1,
						'actor_id'              => 22,
						'operation_type'        => 'inventory_reservation',
						'entity_type'           => 'inventory',
						'entity_id'             => 'inv-runtime-01',
						'base_row_version'      => 4,
						'occurred_at_local'     => '2026-06-08T12:00:00-04:00',
						'queued_at_utc'         => '2026-06-08T16:00:00Z',
						'payload'               => array(
							'localStatus' => 'offline_pending_sync',
						),
						'authorization_context' => array(
							'manager_user_id' => 91,
						),
						'schema_version'        => 1,
					),
				),
			);
		}

		/**
		 * @return array<string, mixed>
		 */
		private function database_row(): array {
			return array(
				'offline_device_id' => '42',
				'public_id'         => 'device-runtime-01',
				'location_id'       => '1',
				'manager_user_id'   => null,
				'device_label'      => 'Runtime Test Device',
				'device_mode'       => 'staff',
				'token_hash'        => OfflineDeviceTokenAuthenticator::token_hash( self::DEVICE_TOKEN ),
				'token_expires_at'  => '2026-06-09 16:00:00.000000',
				'scopes_json'       => '["offline_pull","offline_push","conflicts"]',
				'capabilities_json' => '{"barcode_scanner":true}',
				'app_version'       => '0.156.0',
				'platform'          => 'windows',
				'last_seen_at'      => '2026-06-08 16:00:00.000000',
				'revoked_at'        => null,
				'issued_at'         => '2026-06-08 15:00:00.000000',
				'status'            => 'active',
				'row_version'       => '1',
				'created_at'        => '2026-06-08 15:00:00.000000',
				'updated_at'        => '2026-06-08 15:00:00.000000',
			);
		}

		/**
		 * @return array<string, mixed>
		 */
		private function inventory_snapshot_row(): array {
			return array(
				'public_id'   => 'inv-runtime-01',
				'status'      => 'available',
				'row_version' => '4',
				'updated_at'  => '2026-06-08 15:30:00',
			);
		}
	}
}
