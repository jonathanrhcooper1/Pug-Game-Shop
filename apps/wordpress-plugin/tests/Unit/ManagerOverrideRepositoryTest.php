<?php
/**
 * Manager override repository tests.
 *
 * @package TCGStorePlatform
 */

namespace {
	if ( ! class_exists( 'wpdb' ) ) {
		class wpdb {
			public string $prefix = 'wp_';
			public int $insert_id = 0;
		}
	}

	if ( ! class_exists( 'ManagerOverrideRepositoryWpdb' ) ) {
		class ManagerOverrideRepositoryWpdb extends \wpdb {
			public string $prefix = 'wp_';
			public int $insert_id = 808;
			public int $insert_count = 0;
			public string $last_table = '';

			/**
			 * @var array<string, mixed>
			 */
			public array $last_data = array();

			/**
			 * @var list<string>
			 */
			public array $last_formats = array();

			public function __construct(
				private int|false $insert_result = 1,
				string $prefix = 'wp_',
				int $insert_id = 808
			) {
				$this->prefix    = $prefix;
				$this->insert_id = $insert_id;
			}

			/**
			 * @param array<string, mixed> $data Row data.
			 * @param list<string>         $format Insert formats.
			 */
			public function insert( string $table, array $data, array $format ): int|false {
				++$this->insert_count;
				$this->last_table   = $table;
				$this->last_data    = $data;
				$this->last_formats = array_values( $format );

				return $this->insert_result;
			}
		}
	}
}

namespace TCGStorePlatform\Tests\Unit {
	use TCGStorePlatform\Overrides\ManagerOverridePersistencePlan;
	use TCGStorePlatform\Overrides\ManagerOverridePersistencePlanner;
	use TCGStorePlatform\Overrides\ManagerOverridePolicy;
	use TCGStorePlatform\Overrides\ManagerOverrideRepository;
	use TCGStorePlatform\Overrides\ManagerOverrideRequest;
	use TCGStorePlatform\Tests\TestCase;

	final class ManagerOverrideRepositoryTest extends TestCase {
		public function test_repository_persists_approved_override_plan(): void {
			$database = new \ManagerOverrideRepositoryWpdb();
			$plan     = $this->valid_plan();
			$result   = ( new ManagerOverrideRepository( $database ) )->persist( $plan );
			$audit    = $result->audit_payload();

			$this->assert_true( $result->is_persisted() );
			$this->assert_same( 'persisted', $result->status() );
			$this->assert_same( 1, $result->rows_affected() );
			$this->assert_same( 808, $result->manager_override_id() );
			$this->assert_same( array(), $result->errors() );
			$this->assert_same( 1, $database->insert_count );
			$this->assert_same( 'wp_tcg_manager_overrides', $database->last_table );
			$this->assert_same( $plan->row_data()['public_id'], $database->last_data['public_id'] );
			$this->assert_same( 'below_minimum_sale', $database->last_data['override_type'] );
			$this->assert_same( 10, $database->last_data['employee_user_id'] );
			$this->assert_same( 22, $database->last_data['manager_user_id'] );
			$this->assert_same( count( $database->last_data ), count( $database->last_formats ) );
			$this->assert_same( 'manager_override_repository_persist', $audit['action'] );
			$this->assert_true( $audit['manager_override_persisted'] );
			$this->assert_false( $audit['manager_override_repository_deferred'] );
			$this->assert_same( hash( 'sha256', 'Customer recovery.' ), $audit['plan']['reason_hash'] );
			$this->assert_not_contains( 'Customer recovery.', (string) json_encode( $audit ) );
		}

		public function test_repository_skips_non_persistent_plan_without_insert(): void {
			$database = new \ManagerOverrideRepositoryWpdb();
			$plan     = ManagerOverridePersistencePlan::skip( 'override_row_not_required' );
			$result   = ( new ManagerOverrideRepository( $database ) )->persist( $plan );

			$this->assert_true( $result->is_skipped() );
			$this->assert_same( 'skipped', $result->status() );
			$this->assert_same( 0, $database->insert_count );
			$this->assert_same( array(), $result->errors() );
		}

		public function test_repository_rejects_prefix_and_invalid_rows_before_insert(): void {
			$prefix_result = ( new ManagerOverrideRepository(
				new \ManagerOverrideRepositoryWpdb( 1, 'wp-bad_' )
			) )->persist( $this->valid_plan() );
			$invalid_plan  = ManagerOverridePersistencePlan::persist(
				array(
					'public_id'        => '',
					'override_type'    => 'other',
					'employee_user_id' => 0,
					'manager_user_id'  => 0,
					'reason'           => '',
				),
				array()
			);
			$row_result    = ( new ManagerOverrideRepository(
				new \ManagerOverrideRepositoryWpdb()
			) )->persist( $invalid_plan );

			$this->assert_true( $prefix_result->is_rejected() );
			$this->assert_same( array( 'manager_override_table_prefix_invalid' ), $prefix_result->errors() );
			$this->assert_true( $row_result->is_rejected() );
			$this->assert_true( in_array( 'manager_override_public_id_required', $row_result->errors(), true ) );
			$this->assert_true( in_array( 'manager_override_type_invalid', $row_result->errors(), true ) );
			$this->assert_true( in_array( 'manager_override_employee_required', $row_result->errors(), true ) );
			$this->assert_true( in_array( 'manager_override_manager_required', $row_result->errors(), true ) );
			$this->assert_true( in_array( 'manager_override_reason_required', $row_result->errors(), true ) );
		}

		public function test_repository_rejects_failed_and_unexpected_insert_counts(): void {
			$failed_result = ( new ManagerOverrideRepository(
				new \ManagerOverrideRepositoryWpdb( false )
			) )->persist( $this->valid_plan() );
			$zero_result   = ( new ManagerOverrideRepository(
				new \ManagerOverrideRepositoryWpdb( 0 )
			) )->persist( $this->valid_plan() );
			$two_result    = ( new ManagerOverrideRepository(
				new \ManagerOverrideRepositoryWpdb( 2 )
			) )->persist( $this->valid_plan() );

			$this->assert_true( $failed_result->is_rejected() );
			$this->assert_same( array( 'manager_override_insert_failed' ), $failed_result->errors() );
			$this->assert_true( $zero_result->is_rejected() );
			$this->assert_same( array( 'manager_override_insert_no_rows' ), $zero_result->errors() );
			$this->assert_same( 0, $zero_result->rows_affected() );
			$this->assert_true( $two_result->is_rejected() );
			$this->assert_same( array( 'manager_override_insert_unexpected_rows' ), $two_result->errors() );
			$this->assert_same( 2, $two_result->rows_affected() );
		}

		private function valid_plan(): ManagerOverridePersistencePlan {
			$request  = new ManagerOverrideRequest(
				10,
				22,
				1500,
				900,
				1200,
				'USD',
				'Customer recovery.',
				true,
				'2026-06-07 14:00:00'
			);
			$decision = ( new ManagerOverridePolicy() )->authorize_below_minimum_sale( $request );

			return ( new ManagerOverridePersistencePlanner() )->plan(
				$request,
				$decision,
				array(
					'public_id'    => 'override-public-id',
					'inventory_id' => 42,
					'cart_id'      => 'cart-abc',
					'order_id'     => 100,
					'location_id'  => 7,
					'expires_at'   => '2026-06-07 15:00:00',
					'created_at'   => '2026-06-07 14:01:00',
				)
			);
		}
	}
}
