<?php
/**
 * Versioned migration runner.
 *
 * @package TCGStorePlatform
 */

namespace TCGStorePlatform\Migrations;

use Throwable;
use TCGStorePlatform\Logging\Logger;
use TCGStorePlatform\Version;

final class MigrationRunner {
	public const VERSION_OPTION = 'tcg_store_platform_db_version';

	private ?Logger $logger;

	public function __construct( ?Logger $logger = null ) {
		$this->logger = $logger;
	}

	/**
	 * Run pending migrations.
	 *
	 * @return list<int> Applied migration versions.
	 */
	public function migrate(): array {
		global $wpdb;

		$lock_name = 'tcgsp_migration_' . substr( hash( 'sha256', $wpdb->prefix ), 0, 40 );
		$locked    = (int) $wpdb->get_var(
			$wpdb->prepare( 'SELECT GET_LOCK(%s, 10)', $lock_name )
		);

		if ( 1 !== $locked ) {
			throw new \RuntimeException( 'Unable to acquire the database migration lock.' );
		}

		$current_version = $this->current_version();
		$applied         = array();

		try {
			foreach ( $this->pending_migrations( $current_version ) as $migration ) {
				try {
					$migration->up( $wpdb );
					$this->record_applied_migration( $wpdb, $migration );
					update_option( self::VERSION_OPTION, $migration->version(), false );
					$current_version = $migration->version();
					$applied[]       = $migration->version();
				} catch ( Throwable $error ) {
					if ( $this->logger ) {
						$this->logger->error(
							'database.migration_failed',
							array(
								'migration' => $migration->name(),
								'version'   => $migration->version(),
								'error'     => $error->getMessage(),
							)
						);
					}

					throw $error;
				}
			}
		} finally {
			$wpdb->get_var(
				$wpdb->prepare( 'SELECT RELEASE_LOCK(%s)', $lock_name )
			);
		}

		return $applied;
	}

	public function maybe_migrate(): void {
		if ( $this->current_version() >= Version::DATABASE ) {
			return;
		}

		if ( ! current_user_can( 'activate_plugins' ) ) {
			return;
		}

		$this->migrate();
	}

	public function current_version(): int {
		return (int) get_option( self::VERSION_OPTION, 0 );
	}

	/**
	 * Roll back to a target version.
	 *
	 * Intended for controlled deployment rollback and uninstall, not normal
	 * request handling.
	 */
	public function rollback_to( int $target_version ): void {
		global $wpdb;

		foreach ( $this->rollback_migrations( $this->current_version(), $target_version ) as $migration ) {
			$migration->down( $wpdb );
			update_option( self::VERSION_OPTION, $migration->version() - 1, false );
		}

		if ( 0 === $target_version ) {
			delete_option( self::VERSION_OPTION );
		}
	}

	/**
	 * @return list<int>
	 */
	public function pending_versions( int $current_version ): array {
		return array_map(
			static fn ( Migration $migration ): int => $migration->version(),
			$this->pending_migrations( $current_version )
		);
	}

	/**
	 * @return list<int>
	 */
	public function rollback_versions( int $current_version, int $target_version ): array {
		return array_map(
			static fn ( Migration $migration ): int => $migration->version(),
			$this->rollback_migrations( $current_version, $target_version )
		);
	}

	/**
	 * @return list<Migration>
	 */
	private function migrations(): array {
		return array(
			new Version0001Foundation(),
			new Version0002InventoryPricing(),
			new Version0003Events(),
			new Version0004CustomerCredit(),
			new Version0005Buylist(),
			new Version0006Sync(),
			new Version0007Reservations(),
			new Version0008OfflineSync(),
			new Version0009PosPayments(),
			new Version0010ProviderPriceObservations(),
			new Version0011ReferenceCardImages(),
			new Version0012ScryDexCatalog(),
			new Version0013ExternalInventoryMappings(),
			new Version0014ReferenceVariantImages(),
			new Version0015ProviderPriceReferenceBackfill(),
			new Version0016ScryDexWebhookRelay(),
			new Version0017InventoryProjectionQuantity(),
		);
	}
	/**
	 * @return list<Migration>
	 */
	private function pending_migrations( int $current_version ): array {
		return array_values(
			array_filter(
				$this->migrations(),
				static fn ( Migration $migration ): bool => $migration->version() > $current_version
			)
		);
	}

	/**
	 * @return list<Migration>
	 */
	private function rollback_migrations( int $current_version, int $target_version ): array {
		return array_values(
			array_filter(
				array_reverse( $this->migrations() ),
				static fn ( Migration $migration ): bool => $migration->version() > $target_version
					&& $migration->version() <= $current_version
			)
		);
	}

	private function record_applied_migration( \wpdb $database, Migration $migration ): void {
		$table_name = $database->prefix . 'tcg_schema_migrations';
		$now        = gmdate( 'Y-m-d H:i:s.u' );

		$result = $database->replace(
			$table_name,
			array(
				'migration_version' => $migration->version(),
				'migration_name'    => $migration->name(),
				'checksum'          => $migration->checksum(),
				'applied_at'        => $now,
			),
			array( '%d', '%s', '%s', '%s' )
		);

		if ( false === $result ) {
			throw new \RuntimeException( 'Unable to record migration: ' . $database->last_error );
		}
	}
}
