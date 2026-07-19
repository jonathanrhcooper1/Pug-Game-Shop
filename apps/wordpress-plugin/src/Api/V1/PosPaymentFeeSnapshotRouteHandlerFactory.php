<?php
/**
 * Staged POS/payment fee snapshot route handler factory.
 *
 * @package TCGStorePlatform
 */

namespace TCGStorePlatform\Api\V1;

use TCGStorePlatform\Payments\PosPaymentFeeSnapshotRepository;
use Throwable;

final class PosPaymentFeeSnapshotRouteHandlerFactory {
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

	public function handler(): ?PosPaymentFeeSnapshotRouteHandler {
		if ( ! $this->route_dependencies_ready() ) {
			return null;
		}

		$database = $this->database();
		if ( null === $database || ! $this->table_prefix_ready( (string) $database->prefix ) ) {
			return null;
		}

		return new PosPaymentFeeSnapshotRouteHandler(
			new PosPaymentFeeSnapshotRepository( $database ),
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
			'list_payment_fee_snapshots' => fn ( OfflineRestRequestData $data ): array => $handler->list_payment_fee_snapshots( $data ),
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
			'action'                              => 'pos_payment_fee_snapshot_route_handler_factory_ready',
			'configured'                          => true,
			'handler_factory_ready'               => true,
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
				if ( ! defined( 'ABSPATH' ) ) {
					return null;
				}

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
