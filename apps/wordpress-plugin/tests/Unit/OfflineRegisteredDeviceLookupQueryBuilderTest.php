<?php
/**
 * Offline registered device lookup query builder tests.
 *
 * @package TCGStorePlatform
 */

namespace TCGStorePlatform\Tests\Unit;

use TCGStorePlatform\Offline\OfflineDeviceTokenLookupPlanner;
use TCGStorePlatform\Offline\OfflineRegisteredDeviceLookupPlan;
use TCGStorePlatform\Offline\OfflineRegisteredDeviceLookupPlanner;
use TCGStorePlatform\Offline\OfflineRegisteredDeviceLookupQueryBuilder;
use TCGStorePlatform\Offline\OfflineRegisteredDeviceRowNormalizer;
use TCGStorePlatform\Tests\TestCase;

final class OfflineRegisteredDeviceLookupQueryBuilderTest extends TestCase {
	private const DEVICE_TOKEN = 'test-device-token-abcdefghijklmnopqrstuvwxyz-123456';

	public function test_builder_creates_prepared_sql_template_from_lookup_plan(): void {
		$lookup_plan = ( new OfflineRegisteredDeviceLookupPlanner() )->plan(
			$this->token_lookup_plan(),
			'offline_push',
			'2026-06-06T20:30:00Z'
		);

		$query_plan = ( new OfflineRegisteredDeviceLookupQueryBuilder() )->build(
			$lookup_plan,
			'wp_'
		);
		$sql        = $query_plan->sql_template();
		$args       = $query_plan->prepare_args();
		$audit      = $query_plan->audit_payload();

		$this->assert_true( $query_plan->is_valid() );
		$this->assert_same( 'wp_tcg_offline_devices', $query_plan->table_name() );
		$this->assert_contains( 'SELECT `offline_device_id`, `public_id`, `location_id`', $sql );
		$this->assert_contains( 'FROM `wp_tcg_offline_devices`', $sql );
		$this->assert_contains( '`token_hash` = %s', $sql );
		$this->assert_contains( '`status` = %s', $sql );
		$this->assert_contains( '`revoked_at` IS NULL', $sql );
		$this->assert_contains( '`token_expires_at` > %s', $sql );
		$this->assert_contains( 'ORDER BY `offline_device_id` ASC LIMIT %d', $sql );
		$this->assert_same( $this->token_lookup_plan()->token_hash(), $args[0] );
		$this->assert_same( 'active', $args[1] );
		$this->assert_same( '2026-06-06 20:30:00.000000', $args[2] );
		$this->assert_same( 1, $args[3] );
		$this->assert_same( 19, count( $query_plan->selected_columns() ) );
		$this->assert_same(
			OfflineRegisteredDeviceRowNormalizer::class,
			$query_plan->row_normalizer()
		);
		$this->assert_same( 'offline_registered_device_lookup_query_planned', $audit['action'] );
		$this->assert_same( 4, $audit['prepare_arg_count'] );
		$this->assert_false( array_key_exists( 'token_hash', $audit ) );
		$this->assert_false( array_key_exists( 'device_token', $audit ) );
	}

	public function test_builder_rejects_invalid_lookup_plan_without_sql(): void {
		$token_lookup_plan = ( new OfflineDeviceTokenLookupPlanner() )->plan(
			array(
				'Authorization' => 'Bearer short',
			)
		);
		$lookup_plan       = ( new OfflineRegisteredDeviceLookupPlanner() )->plan(
			$token_lookup_plan,
			'offline_push',
			'2026-06-06T20:30:00Z'
		);

		$query_plan = ( new OfflineRegisteredDeviceLookupQueryBuilder() )->build(
			$lookup_plan,
			'wp_'
		);

		$this->assert_false( $query_plan->is_valid() );
		$this->assert_same( '', $query_plan->sql_template() );
		$this->assert_same( array(), $query_plan->prepare_args() );
		$this->assert_true(
			in_array( 'lookup_plan_invalid', $query_plan->errors(), true )
		);
		$this->assert_true(
			in_array( 'device_token_invalid', $query_plan->errors(), true )
		);
	}

	public function test_builder_rejects_invalid_table_prefix_before_query_text(): void {
		$query_plan = ( new OfflineRegisteredDeviceLookupQueryBuilder() )->build(
			$this->lookup_plan(),
			'wp;drop_'
		);

		$this->assert_false( $query_plan->is_valid() );
		$this->assert_same( '', $query_plan->sql_template() );
		$this->assert_true(
			in_array( 'table_prefix_invalid', $query_plan->errors(), true )
		);
	}

	public function test_builder_rejects_tampered_query_contracts(): void {
		$query_args                       = $this->lookup_plan()->query_args();
		$query_args['table']              = 'tcg_users';
		$query_args['selected_columns'][] = 'password_hash';
		$query_args['where']['status']    = 'revoked';

		$lookup_plan = OfflineRegisteredDeviceLookupPlan::accepted(
			'token:test',
			array(),
			$query_args
		);
		$query_plan = ( new OfflineRegisteredDeviceLookupQueryBuilder() )->build(
			$lookup_plan,
			'wp_'
		);
		$errors     = $query_plan->errors();

		$this->assert_false( $query_plan->is_valid() );
		$this->assert_same( '', $query_plan->sql_template() );
		$this->assert_true( in_array( 'table_unsupported', $errors, true ) );
		$this->assert_true( in_array( 'selected_columns_unsupported', $errors, true ) );
		$this->assert_true( in_array( 'status_filter_unsupported', $errors, true ) );
	}

	private function lookup_plan(): \TCGStorePlatform\Offline\OfflineRegisteredDeviceLookupPlan {
		return ( new OfflineRegisteredDeviceLookupPlanner() )->plan(
			$this->token_lookup_plan(),
			'offline_pull',
			'2026-06-06T20:30:00Z'
		);
	}

	private function token_lookup_plan(): \TCGStorePlatform\Offline\OfflineDeviceTokenLookupPlan {
		return ( new OfflineDeviceTokenLookupPlanner() )->plan(
			array(
				'Authorization' => 'Bearer ' . self::DEVICE_TOKEN,
			)
		);
	}
}
