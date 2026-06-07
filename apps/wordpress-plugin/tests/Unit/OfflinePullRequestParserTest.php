<?php
/**
 * Offline pull request parser tests.
 *
 * @package TCGStorePlatform
 */

namespace TCGStorePlatform\Tests\Unit;

use TCGStorePlatform\Offline\OfflinePullRequestParser;
use TCGStorePlatform\Tests\TestCase;

final class OfflinePullRequestParserTest extends TestCase {
	public function test_parser_builds_pull_request_with_requested_domains_and_cursors(): void {
		$result = ( new OfflinePullRequestParser() )->parse(
			array(
				'device_id'          => 'device-main-01',
				'domains'            => array( 'Inventory', 'events', 'inventory' ),
				'cursors'            => array(
					'inventory' => 'inv-cursor-100',
					'events'    => 'evt-cursor-9',
				),
				'page_size'          => '250',
				'include_tombstones' => false,
				'schema_version'     => 1,
			)
		);

		$this->assert_true( $result->is_valid() );

		$request = $result->request();

		$this->assert_true( null !== $request );
		$this->assert_same( 'device-main-01', $request->device_id() );
		$this->assert_same( array( 'inventory', 'events' ), $request->domains() );
		$this->assert_same( 'inv-cursor-100', $request->cursors()['inventory'] );
		$this->assert_same( 'evt-cursor-9', $request->cursors()['events'] );
		$this->assert_same( 250, $request->page_size() );
		$this->assert_false( $request->include_tombstones() );
		$this->assert_same( 1, $request->schema_version() );
	}

	public function test_parser_defaults_domains_page_size_and_tombstones(): void {
		$result = ( new OfflinePullRequestParser() )->parse(
			array(
				'device_id'      => 'device-main-01',
				'schema_version' => 1,
			)
		);

		$this->assert_true( $result->is_valid() );
		$this->assert_same(
			array( 'branding', 'inventory', 'customer_credit', 'events', 'conflicts' ),
			$result->request()?->domains()
		);
		$this->assert_same( 100, $result->request()?->page_size() );
		$this->assert_true( $result->request()?->include_tombstones() ?? false );
	}

	public function test_parser_rejects_missing_device_schema_and_invalid_shapes(): void {
		$result = ( new OfflinePullRequestParser() )->parse(
			array(
				'domains'            => array(),
				'cursors'            => 'not-an-object',
				'page_size'          => 0,
				'include_tombstones' => 'yes',
			)
		);

		$this->assert_false( $result->is_valid() );
		$this->assert_true( in_array( 'device_id_required', $result->errors(), true ) );
		$this->assert_true( in_array( 'schema_version_required', $result->errors(), true ) );
		$this->assert_true( in_array( 'domains_required', $result->errors(), true ) );
		$this->assert_true( in_array( 'cursors_must_be_object', $result->errors(), true ) );
		$this->assert_true( in_array( 'page_size_invalid', $result->errors(), true ) );
		$this->assert_true( in_array( 'include_tombstones_invalid', $result->errors(), true ) );
	}

	public function test_parser_rejects_unsupported_domain_bad_cursor_and_schema(): void {
		$result = ( new OfflinePullRequestParser() )->parse(
			array(
				'device_id'      => 'bad',
				'domains'        => array( 'inventory', 'payments' ),
				'cursors'        => array(
					'inventory' => 'cursor with spaces',
					'payments'  => 'pay-1',
				),
				'page_size'      => 501,
				'schema_version' => 2,
			)
		);

		$this->assert_false( $result->is_valid() );
		$this->assert_true( in_array( 'device_id_invalid', $result->errors(), true ) );
		$this->assert_true( in_array( 'domains_1_unsupported', $result->errors(), true ) );
		$this->assert_true( in_array( 'cursors_inventory_invalid', $result->errors(), true ) );
		$this->assert_true( in_array( 'cursors_payments_unsupported', $result->errors(), true ) );
		$this->assert_true( in_array( 'page_size_invalid', $result->errors(), true ) );
		$this->assert_true( in_array( 'schema_version_unsupported', $result->errors(), true ) );
	}
}
