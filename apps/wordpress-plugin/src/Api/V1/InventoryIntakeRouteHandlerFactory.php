<?php
/**
 * Staged inventory intake route handler factory.
 *
 * @package TCGStorePlatform
 */

namespace TCGStorePlatform\Api\V1;

use TCGStorePlatform\Inventory\InventoryIntakeParser;
use TCGStorePlatform\Inventory\InventoryExternalMappingRepository;
use TCGStorePlatform\Inventory\InventoryIntakePersistencePlanner;
use TCGStorePlatform\Inventory\InventoryIntakeRepository;
use TCGStorePlatform\Square\SquareInventoryProjectionPlanner;
use TCGStorePlatform\Square\SquareInventorySyncRequestPlanner;
use TCGStorePlatform\WooCommerce\InventoryProductProjectionPlanner;
use TCGStorePlatform\WooCommerce\InventoryProductWriteRequestPlanner;
use TCGStorePlatform\WooCommerce\WooCommerceInventoryProductWriter;
use Throwable;

final class InventoryIntakeRouteHandlerFactory {
	/**
	 * @var callable|null
	 */
	private $database_provider;

	private bool $database_provider_failed = false;

	public function __construct(
		?callable $database_provider = null,
		private bool $route_connected_writes_enabled = false
	) {
		$this->database_provider = $database_provider;
	}

	public function handler(): ?InventoryIntakeRouteHandler {
		if ( ! $this->route_dependencies_ready() ) {
			return null;
		}

		$database = $this->database();
		if ( null === $database || ! $this->table_prefix_ready( (string) $database->prefix ) ) {
			return null;
		}

		return new InventoryIntakeRouteHandler(
			new InventoryIntakeRepository( $database ),
			null,
			null,
			(string) $database->prefix,
			null,
			null,
			null,
			array(),
			null,
			new InventoryExternalMappingRepository( $database )
		);
	}

	public function mark_sold_handler(): ?InventoryMarkSoldRouteHandler {
		if ( ! $this->route_dependencies_ready() ) {
			return null;
		}

		$database = $this->database();
		if ( null === $database || ! $this->table_prefix_ready( (string) $database->prefix ) ) {
			return null;
		}

		return new InventoryMarkSoldRouteHandler( $database, (string) $database->prefix );
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
			'create_inventory_item'    => fn ( OfflineRestRequestData $data ): array => $handler->create_inventory_item( $data ),
			'mark_inventory_item_sold' => fn ( OfflineRestRequestData $data ): array => $this->mark_sold_handler()?->mark_inventory_item_sold( $data )
				?? array(
					'status'      => 'disabled',
					'status_code' => 501,
					'code'        => 'inventory_mark_sold_route_disabled',
				),
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
		$handler_ready  = $this->route_connected_writes_enabled
			&& $database_ready
			&& $prefix_ready;
		$issues         = array();

		if ( $this->route_connected_writes_enabled ) {
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
			'action'                                      => 'inventory_intake_route_handler_factory_ready',
			'configured'                                  => true,
			'handler_factory_ready'                       => true,
			'intake_parser_ready'                         => method_exists( InventoryIntakeParser::class, 'parse' ),
			'persistence_planner_ready'                   => method_exists( InventoryIntakePersistencePlanner::class, 'plan' ),
			'repository_adapter_ready'                    => method_exists( InventoryIntakeRepository::class, 'create' ),
			'woocommerce_projection_planner_ready'        => method_exists( InventoryProductProjectionPlanner::class, 'plan_row' ),
			'woocommerce_product_write_request_planner_ready' => method_exists( InventoryProductWriteRequestPlanner::class, 'plan' ),
			'woocommerce_product_writer_ready'            => class_exists( WooCommerceInventoryProductWriter::class ),
			'inventory_external_mapping_repository_ready' => method_exists( InventoryExternalMappingRepository::class, 'mark_woocommerce_product_synced' ),
			'inventory_mark_sold_route_handler_ready'     => class_exists( InventoryMarkSoldRouteHandler::class ),
			'square_inventory_projection_planner_ready'   => method_exists( SquareInventoryProjectionPlanner::class, 'plan_row' ),
			'square_inventory_sync_request_planner_ready' => method_exists( SquareInventorySyncRequestPlanner::class, 'plan' ),
			'route_connected_writes_enabled'              => $this->route_connected_writes_enabled,
			'database_configured'                         => $database_ready,
			'table_prefix_ready'                          => $prefix_ready,
			'repository_configured'                       => $handler_ready,
			'route_connected_handler_ready'               => $handler_ready,
			'route_connected_handler_deferred'            => ! $handler_ready,
			'route_connected_writes_deferred'             => ! $handler_ready,
			'woocommerce_projection_deferred'             => true,
			'woocommerce_product_write_request_deferred'  => true,
			'square_inventory_projection_deferred'        => true,
			'external_projection_planning_deferred'       => ! $handler_ready,
			'label_print_deferred'                        => true,
			'default_route_registration_deferred'         => true,
			'default_route_execution_deferred'            => ! $handler_ready,
			'configuration_issues'                        => array_values( array_unique( $issues ) ),
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
