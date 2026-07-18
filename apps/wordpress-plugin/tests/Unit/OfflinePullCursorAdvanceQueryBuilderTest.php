<?php
/**
 * Offline pull cursor advancement SQL builder tests.
 *
 * @package TCGStorePlatform
 */

namespace TCGStorePlatform\Tests\Unit;

use TCGStorePlatform\Offline\OfflinePullCursorAdvancePlan;
use TCGStorePlatform\Offline\OfflinePullCursorAdvanceQueryBuilder;
use TCGStorePlatform\Tests\TestCase;

final class OfflinePullCursorAdvanceQueryBuilderTest extends TestCase {
	public function test_builder_creates_prepared_cursor_upsert_templates(): void {
		$build = ( new OfflinePullCursorAdvanceQueryBuilder() )->build(
			$this->plan(
				array(
					$this->row(
						array(
							'cursor_value' => 'inv-cursor-42',
							'row_count'    => 2,
						)
					),
				)
			)
		);
		$audit = $build->audit_payload();
		$query = $build->cursor_queries()[0];

		$this->assert_true( $build->is_valid() );
		$this->assert_same( 'wp_tcg_offline_pull_cursors', $build->table_name() );
		$this->assert_contains( 'INSERT INTO `wp_tcg_offline_pull_cursors`', $query['sql_template'] );
		$this->assert_contains( 'VALUES (%d, %s, %s, %s, %s, %s, %d, %s, %s, %d)', $query['sql_template'] );
		$this->assert_contains( 'ON DUPLICATE KEY UPDATE', $query['sql_template'] );
		$this->assert_same(
			array(
				42,
				'device-main-01',
				'inventory',
				'inv-cursor-42',
				'2026-06-06 22:00:00',
				'2026-06-06 22:00:00',
				2,
				'2026-06-06 22:00:00',
				'2026-06-06 22:00:00',
				1,
			),
			$query['prepare_args']
		);
		$this->assert_false( $query['cursor_value_is_null'] );
		$this->assert_true( $query['cursor_write_execution_deferred'] );
		$this->assert_same( 'offline_pull_cursor_advance_sql_planned', $audit['action'] );
		$this->assert_same( 1, $audit['query_count'] );
		$this->assert_same( 10, $audit['prepare_arg_count'] );
		$this->assert_true( $audit['cursor_repository_deferred'] );
	}

	public function test_builder_uses_null_literal_for_empty_cursor_rows(): void {
		$build = ( new OfflinePullCursorAdvanceQueryBuilder() )->build(
			$this->plan(
				array(
					$this->row(
						array(
							'cursor_value' => null,
							'domain'       => 'branding',
							'row_count'    => 0,
						)
					),
				)
			)
		);
		$query = $build->cursor_queries()[0];

		$this->assert_true( $build->is_valid() );
		$this->assert_contains( 'VALUES (%d, %s, %s, NULL, %s, %s, %d, %s, %s, %d)', $query['sql_template'] );
		$this->assert_same( 9, count( $query['prepare_args'] ) );
		$this->assert_true( $query['cursor_value_is_null'] );
	}

	public function test_builder_accepts_empty_valid_plans_without_queries(): void {
		$build = ( new OfflinePullCursorAdvanceQueryBuilder() )->build(
			$this->plan( array() )
		);

		$this->assert_true( $build->is_valid() );
		$this->assert_same( array(), $build->cursor_queries() );
		$this->assert_same( 0, $build->audit_payload()['query_count'] );
	}

	public function test_builder_rejects_invalid_source_plans(): void {
		$build = ( new OfflinePullCursorAdvanceQueryBuilder() )->build(
			OfflinePullCursorAdvancePlan::rejected(
				'device-main-01',
				array( 'server_time_utc_invalid' )
			)
		);

		$this->assert_false( $build->is_valid() );
		$this->assert_true( in_array( 'cursor_advance_plan_invalid', $build->errors(), true ) );
		$this->assert_true( in_array( 'server_time_utc_invalid', $build->errors(), true ) );
	}

	public function test_builder_rejects_tampered_rows_and_table_names(): void {
		$build = ( new OfflinePullCursorAdvanceQueryBuilder() )->build(
			OfflinePullCursorAdvancePlan::accepted(
				'device-main-01',
				42,
				'wp-bad_',
				array(
					$this->row(
						array(
							'offline_device_id'    => 0,
							'device_public_id'     => 'bad id',
							'domain'               => 'payments',
							'cursor_value'         => 'cursor with spaces',
							'last_server_time_utc' => 'bad',
							'last_pulled_at'       => 'bad',
							'row_count'            => -1,
							'row_version_next'     => 0,
						)
					),
				)
			)
		);

		$this->assert_false( $build->is_valid() );
		$this->assert_true( in_array( 'cursor_table_name_invalid', $build->errors(), true ) );
		$this->assert_true( in_array( 'cursor_row_0_offline_device_id_invalid', $build->errors(), true ) );
		$this->assert_true( in_array( 'cursor_row_0_device_public_id_invalid', $build->errors(), true ) );
		$this->assert_true( in_array( 'cursor_row_0_domain_invalid', $build->errors(), true ) );
		$this->assert_true( in_array( 'cursor_row_0_cursor_value_invalid', $build->errors(), true ) );
		$this->assert_true( in_array( 'cursor_row_0_last_server_time_invalid', $build->errors(), true ) );
		$this->assert_true( in_array( 'cursor_row_0_last_pulled_at_invalid', $build->errors(), true ) );
		$this->assert_true( in_array( 'cursor_row_0_row_count_invalid', $build->errors(), true ) );
		$this->assert_true( in_array( 'cursor_row_0_row_version_next_invalid', $build->errors(), true ) );
	}

	/**
	 * @param list<array<string, mixed>> $rows Cursor rows.
	 */
	private function plan( array $rows ): OfflinePullCursorAdvancePlan {
		return OfflinePullCursorAdvancePlan::accepted(
			'device-main-01',
			42,
			'wp_',
			$rows
		);
	}

	/**
	 * @param array<string, mixed> $overrides Row overrides.
	 * @return array<string, mixed>
	 */
	private function row( array $overrides = array() ): array {
		return array_merge(
			array(
				'offline_device_id'     => 42,
				'device_public_id'      => 'device-main-01',
				'domain'                => 'inventory',
				'cursor_value'          => 'inv-cursor-42',
				'last_server_time_utc'  => '2026-06-06 22:00:00',
				'last_pulled_at'        => '2026-06-06 22:00:00',
				'row_count'             => 2,
				'row_version_next'      => 1,
				'has_more_deferred'     => false,
				'cursor_write_deferred' => true,
			),
			$overrides
		);
	}
}
