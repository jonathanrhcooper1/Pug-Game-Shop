<?php
/**
 * Staged inventory search route handler factory.
 *
 * @package TCGStorePlatform
 */

namespace TCGStorePlatform\Api\V1;

use TCGStorePlatform\Inventory\InventorySearchQueryPlanner;
use TCGStorePlatform\Inventory\InventorySearchRepository;
use TCGStorePlatform\Inventory\InventorySearchRequestParser;
use Throwable;

final class InventorySearchRouteHandlerFactory {
	/**
	 * @var callable|null
	 */
	private $database_provider;

	private bool $database_provider_failed = false;

	public function __construct(
		?callable $database_provider = null,
		private bool $route_connected_reads_enabled = false
	) {
		$this->database_provider = $database_provider;
	}

	public function handler(): ?InventorySearchRouteHandler {
		if ( ! $this->route_dependencies_ready() ) {
			return null;
		}

		$database = $this->database();
		if ( null === $database || ! $this->table_prefix_ready( (string) $database->prefix ) ) {
			return null;
		}

		return new InventorySearchRouteHandler(
			new InventorySearchRepository( $database ),
			null,
			null,
			(string) $database->prefix
		);
	}

	/**
	 * @return array<string, callable(OfflineRestRequestData): array<string, mixed>>
	 */
	public function handlers(): array {
		$handler = $this->handler();

		if ( null === $handler ) {
			return array();
		}

		return array(
			'search_inventory_items' => fn ( OfflineRestRequestData $data ): array => $handler->search_inventory_items( $data ),
		);
	}

	/**
	 * @return array<string, mixed>
	 */
	public function readiness_summary(): array {
		$database       = $this->database();
		$table_prefix   = null !== $database ? trim( (string) $database->prefix ) : '';
		$database_ready = null !== $database;
		$prefix_ready   = $this->table_prefix_ready( $table_prefix );
		$handler_ready  = $this->route_connected_reads_enabled
			&& $database_ready
			&& $prefix_ready;
		$issues         = array();

		if ( $this->route_connected_reads_enabled ) {
			if ( ! $database_ready ) {
				$issues[] = $this->database_provider_failed
					? 'database_provider_failed'
					: 'database_not_configured';
			}

			if ( $database_ready && ! $prefix_ready ) {
				$issues[] = 'table_prefix_invalid';
			}
		}

		return array(
			'action'                              => 'inventory_search_route_handler_factory_ready',
			'configured'                          => true,
			'handler_factory_ready'               => true,
			'request_parser_ready'                => method_exists( InventorySearchRequestParser::class, 'parse' ),
			'query_planner_ready'                 => method_exists( InventorySearchQueryPlanner::class, 'plan' ),
			'repository_adapter_ready'            => method_exists( InventorySearchRepository::class, 'fetch' ),
			'route_connected_reads_enabled'       => $this->route_connected_reads_enabled,
			'database_configured'                 => $database_ready,
			'table_prefix_ready'                  => $prefix_ready,
			'repository_configured'               => $handler_ready,
			'route_connected_handler_ready'       => $handler_ready,
			'route_connected_handler_deferred'    => ! $handler_ready,
			'route_connected_reads_deferred'      => ! $handler_ready,
			'route_connected_writes_deferred'     => true,
			'default_route_registration_deferred' => true,
			'default_route_execution_deferred'    => ! $handler_ready,
			'configuration_issues'                => array_values( array_unique( $issues ) ),
		);
	}

	private function route_dependencies_ready(): bool {
		$summary = $this->readiness_summary();

		return true === ( $summary['route_connected_handler_ready'] ?? false );
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
