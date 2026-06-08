<?php
/**
 * Staged offline conflict route handler factory.
 *
 * @package TCGStorePlatform
 */

namespace TCGStorePlatform\Api\V1;

use TCGStorePlatform\Offline\OfflineConflictResolutionRepository;
use Throwable;

final class OfflineConflictRouteHandlerFactory {
	private const HANDLER_CALLBACKS = array(
		'list_offline_conflicts',
		'resolve_offline_conflict',
	);

	/**
	 * @var callable|null
	 */
	private $database_provider;

	/**
	 * @var callable|null
	 */
	private $server_time_provider;

	private bool $database_provider_failed = false;

	public function __construct(
		private ?OfflineRouteValidationHandlerFactory $validation_handler_factory = null,
		private ?OfflineRestRequestAdapter $request_adapter = null,
		private ?OfflineConflictResolutionRouteHandler $resolution_handler = null,
		?callable $database_provider = null,
		?callable $server_time_provider = null,
		private bool $route_connected_execution_enabled = false
	) {
		$this->database_provider    = $database_provider;
		$this->server_time_provider = $server_time_provider;
	}

	public function is_configured(): bool {
		return count( self::HANDLER_CALLBACKS ) === count( $this->handlers() );
	}

	public function controller(): OfflineController {
		return new OfflineController(
			$this->request_adapter,
			$this->handlers()
		);
	}

	/**
	 * @return array<string, callable(OfflineRestRequestData): array<string, mixed>>
	 */
	public function handlers(): array {
		$handlers                              = ( $this->validation_handler_factory ?? new OfflineRouteValidationHandlerFactory() )->handlers();
		$handlers['resolve_offline_conflict'] = array( $this->resolution_handler(), 'handle' );

		return array_intersect_key( $handlers, array_flip( self::HANDLER_CALLBACKS ) );
	}

	/**
	 * @return array<string, mixed>
	 */
	public function readiness_summary(): array {
		$database                 = $this->database();
		$table_prefix             = null !== $database ? trim( (string) $database->prefix ) : '';
		$database_ready           = null !== $database;
		$table_prefix_ready       = $this->table_prefix_ready( $table_prefix );
		$route_dependencies_ready = $this->route_connected_execution_enabled
			&& $database_ready
			&& $table_prefix_ready;
		$handlers                 = $this->handlers();
		$issues                   = array();

		if ( $this->route_connected_execution_enabled ) {
			if ( ! $database_ready ) {
				$issues[] = $this->database_provider_failed
					? 'database_provider_failed'
					: 'database_not_configured';
			}

			if ( $database_ready && ! $table_prefix_ready ) {
				$issues[] = 'table_prefix_invalid';
			}
		}

		foreach ( self::HANDLER_CALLBACKS as $callback ) {
			if ( ! is_callable( $handlers[ $callback ] ?? null ) ) {
				$issues[] = $callback . '_handler_not_configured';
			}
		}

		return array(
			'action'                                 => 'offline_conflict_route_handler_factory_ready',
			'configured'                             => array() === $issues,
			'handler_factory_ready'                  => true,
			'handler_count'                          => count( $handlers ),
			'controller_callbacks'                   => array_values( array_keys( $handlers ) ),
			'list_handler_configured'                => is_callable( $handlers['list_offline_conflicts'] ?? null ),
			'resolution_handler_configured'          => is_callable( $handlers['resolve_offline_conflict'] ?? null ),
			'route_connected_execution_enabled'      => $this->route_connected_execution_enabled,
			'database_configured'                    => $database_ready,
			'table_prefix_ready'                     => $table_prefix_ready,
			'current_conflict_provider_ready'        => method_exists( OfflineConflictResolutionCurrentRowProvider::class, '__invoke' ),
			'resolution_repository_ready'            => method_exists( OfflineConflictResolutionRepository::class, 'apply' ),
			'route_connected_handler_ready'          => $route_dependencies_ready,
			'route_connected_handler_deferred'       => ! $route_dependencies_ready,
			'route_connected_reads_deferred'         => ! $route_dependencies_ready,
			'route_connected_writes_deferred'        => ! $route_dependencies_ready,
			'route_connected_resolution_writes_ready' => $route_dependencies_ready,
			'default_route_registration_deferred'    => true,
			'default_route_execution_deferred'       => ! $route_dependencies_ready,
			'configuration_issues'                   => array_values( array_unique( $issues ) ),
		);
	}

	private function resolution_handler(): OfflineConflictResolutionRouteHandler {
		if ( null !== $this->resolution_handler ) {
			return $this->resolution_handler;
		}

		if ( ! $this->route_dependencies_ready() ) {
			return new OfflineConflictResolutionRouteHandler();
		}

		$database = $this->database();

		if ( null === $database ) {
			return new OfflineConflictResolutionRouteHandler();
		}

		return new OfflineConflictResolutionRouteHandler(
			null,
			null,
			new OfflineConflictResolutionRepository( $database ),
			new OfflineConflictResolutionCurrentRowProvider( $database ),
			$this->server_time_provider
		);
	}

	private function route_dependencies_ready(): bool {
		$database     = $this->database();
		$table_prefix = null !== $database ? trim( (string) $database->prefix ) : '';

		return $this->route_connected_execution_enabled
			&& null !== $database
			&& $this->table_prefix_ready( $table_prefix );
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
