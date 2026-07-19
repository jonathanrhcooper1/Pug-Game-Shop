<?php
/**
 * ScryDex webhook relay schema repair migration tests.
 *
 * @package TCGStorePlatform
 */

namespace {
	if ( ! class_exists( 'ScryDexWebhookRelayRepairWpdb' ) ) {
		class ScryDexWebhookRelayRepairWpdb extends \wpdb {
			public string $prefix = 'wp_';
			public array $queries = array();
			private array $columns;
			private array $indexes;

			public function __construct( array $columns = array(), array $indexes = array() ) {
				$this->columns = array_fill_keys( $columns, true );
				$this->indexes = array_fill_keys( $indexes, true );
			}

			public function prepare( string $query, array $args ): string {
				return str_replace( '%s', (string) ( $args[0] ?? '' ), $query );
			}

			public function get_var( string $query ): mixed {
				if ( preg_match( '/SHOW COLUMNS.+LIKE ([A-Za-z0-9_]+)/', $query, $match ) ) {
					return isset( $this->columns[ $match[1] ] ) ? $match[1] : null;
				}
				if ( preg_match( '/SHOW INDEX.+Key_name = ([A-Za-z0-9_]+)/', $query, $match ) ) {
					return isset( $this->indexes[ $match[1] ] ) ? $match[1] : null;
				}

				return null;
			}

			public function query( string $query ): int|false {
				$this->queries[] = $query;
				if ( preg_match( '/ADD COLUMN `([A-Za-z0-9_]+)`/', $query, $match ) ) {
					$this->columns[ $match[1] ] = true;
				}
				if ( preg_match( '/ADD KEY `([A-Za-z0-9_]+)`/', $query, $match ) ) {
					$this->indexes[ $match[1] ] = true;
				}

				return 1;
			}
		}
	}
}

namespace TCGStorePlatform\Tests\Unit {
	use ScryDexWebhookRelayRepairWpdb;
	use TCGStorePlatform\Migrations\Version0018ScryDexWebhookRelayRepair;
	use TCGStorePlatform\Tests\TestCase;

	final class ScryDexWebhookRelayRepairMigrationTest extends TestCase {
		private const COLUMNS = array(
			'relay_attempt_count',
			'next_attempt_at',
			'result_reference',
			'last_error_code',
			'last_error_message',
		);

		public function test_repairs_every_missing_relay_field_and_index(): void {
			$database  = new ScryDexWebhookRelayRepairWpdb();
			$migration = new Version0018ScryDexWebhookRelayRepair();

			$migration->up( $database );

			$this->assert_same( 6, count( $database->queries ) );
			$this->assert_contains( 'ADD COLUMN `relay_attempt_count`', implode( "\n", $database->queries ) );
			$this->assert_contains( 'ADD KEY `relay_ready`', implode( "\n", $database->queries ) );
		}

		public function test_repairs_only_missing_parts_on_a_partial_schema(): void {
			$database  = new ScryDexWebhookRelayRepairWpdb(
				array( 'relay_attempt_count', 'next_attempt_at', 'result_reference' )
			);
			$migration = new Version0018ScryDexWebhookRelayRepair();

			$migration->up( $database );

			$this->assert_same( 3, count( $database->queries ) );
			$this->assert_not_contains( 'ADD COLUMN `relay_attempt_count`', implode( "\n", $database->queries ) );
			$this->assert_contains( 'ADD COLUMN `last_error_code`', implode( "\n", $database->queries ) );
		}

		public function test_is_a_no_op_when_the_schema_is_already_repaired(): void {
			$database  = new ScryDexWebhookRelayRepairWpdb( self::COLUMNS, array( 'relay_ready' ) );
			$migration = new Version0018ScryDexWebhookRelayRepair();

			$migration->up( $database );

			$this->assert_same( array(), $database->queries );
			$this->assert_same( 18, $migration->version() );
			$this->assert_same( 'scrydex_webhook_lan_relay_repair', $migration->name() );
		}
	}
}
