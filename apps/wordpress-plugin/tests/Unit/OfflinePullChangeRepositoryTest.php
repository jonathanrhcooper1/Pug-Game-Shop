<?php
/**
 * Offline pull change repository tests.
 *
 * @package TCGStorePlatform
 */

namespace {
	if ( ! class_exists( 'wpdb' ) ) {
		class wpdb {
			public string $prefix = 'wp_';
			public int $prepare_count = 0;
			public int $get_results_count = 0;
			public string $last_prepare_query = '';
			public string $last_query = '';
			public string $last_output_type = '';

			/**
			 * @var list<mixed>
			 */
			public array $last_prepare_args = array();

			/**
			 * @param list<array<string, mixed>>|false $result_set Rows returned by get_results.
			 */
			public function __construct( private array|false $result_set = array() ) {
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
			 * @return list<array<string, mixed>>|false
			 */
			public function get_results( string $query, string $output_type ): array|false {
				++$this->get_results_count;
				$this->last_query       = $query;
				$this->last_output_type = $output_type;

				return $this->result_set;
			}
		}
	}

	if ( ! class_exists( 'OfflinePullChangeResultsWpdb' ) ) {
		class OfflinePullChangeResultsWpdb extends \wpdb {
			public string $prefix = 'wp_';
			public int $prepare_count = 0;
			public int $get_results_count = 0;
			public string $last_prepare_query = '';
			public string $last_query = '';
			public string $last_output_type = '';

			/**
			 * @var list<string>
			 */
			public array $prepare_queries = array();

			/**
			 * @var list<list<mixed>>
			 */
			public array $prepare_args = array();

			/**
			 * @param list<list<array<string, mixed>>|false> $result_sets Result sets.
			 */
			public function __construct( private array $result_sets ) {
			}

			/**
			 * @param list<mixed> $args Prepared arguments.
			 */
			public function prepare( string $query, array $args ): string {
				++$this->prepare_count;
				$this->last_prepare_query = $query;
				$this->prepare_queries[]  = $query;
				$this->prepare_args[]     = array_values( $args );

				return 'prepared:' . $query;
			}

			/**
			 * @return list<array<string, mixed>>|false
			 */
			public function get_results( string $query, string $output_type ): array|false {
				++$this->get_results_count;
				$this->last_query       = $query;
				$this->last_output_type = $output_type;

				return array_shift( $this->result_sets );
			}
		}
	}
}

namespace TCGStorePlatform\Tests\Unit {
	use TCGStorePlatform\Offline\OfflinePullChangeQueryPlanner;
	use TCGStorePlatform\Offline\OfflinePullChangeRepository;
	use TCGStorePlatform\Offline\OfflinePullRequest;
	use TCGStorePlatform\Tests\TestCase;

	final class OfflinePullChangeRepositoryTest extends TestCase {
		public function test_repository_fetches_and_normalizes_domain_change_sets(): void {
			$database = new \OfflinePullChangeResultsWpdb(
				array(
					array( $this->inventory_row() ),
					array( $this->conflict_row() ),
				)
			);
			$result   = ( new OfflinePullChangeRepository( $database ) )->fetch(
				$this->change_query_plan(
					array( 'inventory', 'conflicts' ),
					array( 'inventory' => 'inv-cursor-10' ),
					75,
					77
				)
			);
			$sets     = $result->change_sets();
			$audit    = $result->audit_payload();

			$this->assert_true( $result->is_fetched() );
			$this->assert_same( 'fetched', $result->status() );
			$this->assert_same( 2, $database->prepare_count );
			$this->assert_same( 2, $database->get_results_count );
			$this->assert_contains( 'FROM `wp_tcg_inventory_items`', $database->prepare_queries[0] );
			$this->assert_contains( 'FROM `wp_tcg_sync_conflicts`', $database->prepare_queries[1] );
			$this->assert_same( array( 75 ), $database->prepare_args[0] );
			$this->assert_same( array( 'open', 77, 'device-main-01', 75 ), $database->prepare_args[1] );
			$this->assert_same( 'ARRAY_A', $database->last_output_type );
			$this->assert_same( 'inv-cursor-10', $sets['inventory']['cursor'] );
			$this->assert_false( $sets['inventory']['has_more'] );
			$this->assert_same( array(), $sets['inventory']['tombstones'] );
			$this->assert_same( 'inventory_item', $sets['inventory']['data'][0]['entity_type'] );
			$this->assert_same( 'inv-main-01', $sets['inventory']['data'][0]['entity_id'] );
			$this->assert_same( 5, $sets['inventory']['data'][0]['row_version'] );
			$this->assert_same( '2026-06-06T18:45:00.000000Z', $sets['inventory']['data'][0]['updated_at_utc'] );
			$this->assert_same( 'Lightning Bolt', $sets['inventory']['data'][0]['payload']['card_name'] );
			$this->assert_same( 'sync-conflict-01', $sets['conflicts']['data'][0]['entity_id'] );
			$this->assert_same( 'offline_pull_change_repository_fetch', $audit['action'] );
			$this->assert_same( 2, $audit['domain_count'] );
			$this->assert_same( 2, $audit['row_count'] );
			$this->assert_true( $audit['cursor_advance_deferred'] );
			$this->assert_true( $audit['tombstone_read_deferred'] );
		}

		public function test_repository_rejects_invalid_query_plan_before_database_reads(): void {
			$database = new \OfflinePullChangeResultsWpdb(
				array(
					array( $this->inventory_row() ),
				)
			);
			$result   = ( new OfflinePullChangeRepository( $database ) )->fetch(
				( new OfflinePullChangeQueryPlanner() )->plan(
					$this->pull_request(),
					0,
					'wp;drop_'
				)
			);

			$this->assert_true( $result->is_rejected() );
			$this->assert_same( array(), $result->change_sets() );
			$this->assert_same( 0, $database->prepare_count );
			$this->assert_same( 0, $database->get_results_count );
			$this->assert_true( in_array( 'change_query_plan_invalid', $result->errors(), true ) );
			$this->assert_true( in_array( 'offline_device_id_invalid', $result->errors(), true ) );
			$this->assert_true( in_array( 'table_prefix_invalid', $result->errors(), true ) );
		}

		public function test_repository_rejects_database_failures(): void {
			$database = new \OfflinePullChangeResultsWpdb( array( false ) );
			$result   = ( new OfflinePullChangeRepository( $database ) )->fetch(
				$this->change_query_plan()
			);

			$this->assert_true( $result->is_rejected() );
			$this->assert_same( 1, $database->prepare_count );
			$this->assert_same( 1, $database->get_results_count );
			$this->assert_same( array( 'inventory_query_failed' ), $result->errors() );
		}

		public function test_repository_rejects_malformed_database_rows(): void {
			$database = new \OfflinePullChangeResultsWpdb(
				array(
					array(
						$this->inventory_row(
							array(
								'public_id'     => 'bad value',
								'updated_at'    => 'not-a-date',
								'row_version'   => '0',
								'sale_currency' => null,
							)
						),
					),
				)
			);
			$result   = ( new OfflinePullChangeRepository( $database ) )->fetch(
				$this->change_query_plan()
			);

			$this->assert_true( $result->is_rejected() );
			$this->assert_true( in_array( 'inventory_row_0_entity_id_invalid', $result->errors(), true ) );
			$this->assert_true( in_array( 'inventory_row_0_row_version_invalid', $result->errors(), true ) );
			$this->assert_true( in_array( 'inventory_row_0_updated_at_invalid', $result->errors(), true ) );
		}

		private function change_query_plan(
			array $domains = array( 'inventory' ),
			array $cursors = array(),
			int $page_size = 50,
			int $offline_device_id = 42
		): \TCGStorePlatform\Offline\OfflinePullChangeQueryPlan {
			return ( new OfflinePullChangeQueryPlanner() )->plan(
				new OfflinePullRequest(
					'device-main-01',
					$domains,
					$cursors,
					$page_size,
					true,
					1
				),
				$offline_device_id,
				'wp_'
			);
		}

		private function pull_request(): OfflinePullRequest {
			return new OfflinePullRequest(
				'device-main-01',
				array( 'inventory' ),
				array(),
				50,
				true,
				1
			);
		}

		/**
		 * @param array<string, mixed> $overrides Row overrides.
		 * @return array<string, mixed>
		 */
		private function inventory_row( array $overrides = array() ): array {
			return array_merge(
				array(
					'inventory_id'      => '1001',
					'public_id'         => 'inv-main-01',
					'game'              => 'mtg',
					'card_name'         => 'Lightning Bolt',
					'set_name'          => 'Magic Core Set',
					'set_code'          => 'MCS',
					'card_number'       => '150',
					'barcode'           => '123456789012',
					'sku'               => 'MTG-MCS-150',
					'sale_price'        => '4.99',
					'sale_currency'     => 'USD',
					'location_id'       => '2',
					'status'            => 'available',
					'online_visibility' => 'visible',
					'kiosk_visibility'  => 'visible',
					'pos_visibility'    => 'visible',
					'updated_at'        => '2026-06-06 18:45:00.000000',
					'row_version'       => '5',
				),
				$overrides
			);
		}

		/**
		 * @return array<string, mixed>
		 */
		private function conflict_row(): array {
			return array(
				'sync_conflict_id'   => '8',
				'conflict_id'        => 'sync-conflict-01',
				'offline_device_id'  => '77',
				'device_public_id'   => 'device-main-01',
				'status'             => 'open',
				'entity_type'        => 'inventory',
				'entity_id'          => 'inv-main-01',
				'conflict_type'      => 'double_sell',
				'severity'           => 'high',
				'summary'            => 'Inventory changed before offline push.',
				'server_row_version' => '9',
				'device_row_version' => '5',
				'updated_at'         => '2026-06-06 18:50:00',
				'row_version'        => '3',
			);
		}
	}
}
