<?php
/**
 * Staged offline push route handler factory.
 *
 * @package TCGStorePlatform
 */

namespace TCGStorePlatform\Api\V1;

use TCGStorePlatform\Offline\OfflinePushPersistenceRepository;
use TCGStorePlatform\Offline\OfflineRegisteredDevicePermissionResolver;
use TCGStorePlatform\Offline\OfflineRegisteredDevicePermissionResolverFactory;
use Throwable;

final class OfflinePushRouteHandlerFactory {
	/**
	 * @var callable|null
	 */
	private $database_provider;

	/**
	 * @var callable|null
	 */
	private $server_time_provider;

	/**
	 * @var callable|null
	 */
	private $server_snapshots_provider;

	/**
	 * @var callable|null
	 */
	private $operation_options_provider;

	/**
	 * @var callable|null
	 */
	private $existing_operation_rows_provider;

	private bool $database_provider_failed = false;

	public function __construct(
		?callable $database_provider = null,
		private ?OfflineRegisteredDevicePermissionResolverFactory $permission_resolver_factory = null,
		?callable $server_time_provider = null,
		?callable $server_snapshots_provider = null,
		?callable $operation_options_provider = null,
		?callable $existing_operation_rows_provider = null,
		private bool $route_connected_execution_enabled = false
	) {
		$this->database_provider                = $database_provider;
		$this->server_time_provider             = $server_time_provider;
		$this->server_snapshots_provider        = $server_snapshots_provider;
		$this->operation_options_provider       = $operation_options_provider;
		$this->existing_operation_rows_provider = $existing_operation_rows_provider;
	}

	public function handler(): OfflinePushRouteHandler {
		if ( ! $this->route_dependencies_ready() ) {
			return new OfflinePushRouteHandler();
		}

		$database = $this->database();
		$resolver = $this->permission_resolver();

		if ( null === $database || null === $resolver ) {
			return new OfflinePushRouteHandler();
		}

		return new OfflinePushRouteHandler(
			null,
			new OfflinePushRoutePersistenceProvider(
				$resolver,
				new OfflinePushPersistenceRepository( $database ),
				null,
				null,
				$this->server_time_provider,
				$this->server_snapshots_provider,
				$this->operation_options_provider,
				$this->existing_operation_rows_provider
			)
		);
	}

	/**
	 * @return array<string, mixed>
	 */
	public function readiness_summary(): array {
		$database                            = $this->database();
		$table_prefix                        = null !== $database ? trim( (string) $database->prefix ) : '';
		$database_ready                      = null !== $database;
		$table_prefix_ready                  = $this->table_prefix_ready( $table_prefix );
		$permission_resolver                 = $this->permission_resolver();
		$permission_ready                    = null !== $permission_resolver;
		$server_snapshot_provider_configured = is_callable( $this->server_snapshots_provider );
		$route_dependencies_ready            = $this->route_connected_execution_enabled
			&& $database_ready
			&& $table_prefix_ready
			&& $permission_ready
			&& $server_snapshot_provider_configured;
		$issues                              = array();

		if ( $this->route_connected_execution_enabled ) {
			if ( ! $database_ready ) {
				$issues[] = $this->database_provider_failed
					? 'database_provider_failed'
					: 'database_not_configured';
			}

			if ( $database_ready && ! $table_prefix_ready ) {
				$issues[] = 'table_prefix_invalid';
			}

			if ( ! $permission_ready ) {
				$issues[] = 'permission_resolver_not_configured';
			}

			if ( ! $server_snapshot_provider_configured ) {
				$issues[] = 'server_snapshot_provider_not_configured';
			}
		}

		return array(
			'action'                                      => 'offline_push_route_handler_factory_ready',
			'configured'                                  => true,
			'handler_factory_ready'                       => true,
			'route_connected_execution_enabled'           => $this->route_connected_execution_enabled,
			'database_configured'                         => $database_ready,
			'table_prefix_ready'                          => $table_prefix_ready,
			'permission_resolver_configured'              => $permission_ready,
			'server_snapshot_provider_configured'         => $server_snapshot_provider_configured,
			'operation_options_provider_configured'       => is_callable( $this->operation_options_provider ),
			'existing_operation_rows_provider_configured' => is_callable( $this->existing_operation_rows_provider ),
			'persistence_provider_configured'             => $route_dependencies_ready,
			'route_connected_handler_ready'               => $route_dependencies_ready,
			'route_connected_handler_deferred'            => ! $route_dependencies_ready,
			'route_connected_queue_writes_deferred'       => ! $route_dependencies_ready,
			'route_connected_conflict_writes_deferred'    => ! $route_dependencies_ready,
			'route_connected_writes_ready'                => $route_dependencies_ready,
			'canonical_route_writes_deferred'             => true,
			'queue_replay_deferred'                       => true,
			'default_route_registration_deferred'         => true,
			'default_route_execution_deferred'            => ! $route_dependencies_ready,
			'configuration_issues'                        => array_values( array_unique( $issues ) ),
		);
	}

	private function route_dependencies_ready(): bool {
		$summary = $this->readiness_summary();

		return true === ( $summary['route_connected_handler_ready'] ?? false );
	}

	private function permission_resolver(): ?OfflineRegisteredDevicePermissionResolver {
		$factory = $this->permission_resolver_factory
			?? new OfflineRegisteredDevicePermissionResolverFactory( $this->database_provider );

		return $factory->resolver();
	}

	private function database(): ?\wpdb {
		$this->database_provider_failed = false;

		try {
			if ( is_callable( $this->database_provider ) ) {
				$database = ( $this->database_provider )();
			} else {
				global $wpdb;
				$database = $wpdb ?? null;
			}
		} catch ( Throwable ) {
			$this->database_provider_failed = true;

			return null;
		}

		if ( ! class_exists( 'wpdb' ) || ! $database instanceof \wpdb ) {
			return null;
		}

		return $database;
	}

	private function table_prefix_ready( string $table_prefix ): bool {
		return '' !== $table_prefix
			&& 1 === preg_match( '/^[A-Za-z0-9_]+$/', $table_prefix );
	}
}
