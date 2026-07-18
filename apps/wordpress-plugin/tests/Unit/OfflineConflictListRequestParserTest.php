<?php
/**
 * Offline conflict list request parser tests.
 *
 * @package TCGStorePlatform
 */

namespace TCGStorePlatform\Tests\Unit;

use TCGStorePlatform\Offline\OfflineConflictListRequestParser;
use TCGStorePlatform\Tests\TestCase;

final class OfflineConflictListRequestParserTest extends TestCase {
	public function test_parser_builds_conflict_list_request_with_normalized_filters(): void {
		$result = ( new OfflineConflictListRequestParser() )->parse(
			array(
				'device_id'        => 'device-main-01',
				'statuses'         => 'Open,resolving,open',
				'entity_types'     => array( 'Inventory', 'event', 'inventory' ),
				'cursor'           => 'conflict-cursor-10',
				'page_size'        => '75',
				'include_resolved' => 'true',
				'schema_version'   => 1,
			)
		);

		$this->assert_true( $result->is_valid() );

		$request = $result->request();

		$this->assert_true( null !== $request );
		$this->assert_same( 'device-main-01', $request->device_id() );
		$this->assert_same( array( 'open', 'resolving' ), $request->statuses() );
		$this->assert_same( array( 'inventory', 'event' ), $request->entity_types() );
		$this->assert_same( 'conflict-cursor-10', $request->cursor() );
		$this->assert_same( 75, $request->page_size() );
		$this->assert_true( $request->include_resolved() );
		$this->assert_same( 1, $request->schema_version() );
	}

	public function test_parser_defaults_open_filters_page_size_and_entity_types(): void {
		$result = ( new OfflineConflictListRequestParser() )->parse(
			array(
				'device_id'      => 'device-main-01',
				'schema_version' => 1,
			)
		);

		$this->assert_true( $result->is_valid() );
		$this->assert_same( array( 'open', 'assigned', 'resolving' ), $result->request()?->statuses() );
		$this->assert_same(
			array( 'inventory', 'event', 'customer_credit', 'buylist', 'kiosk_cart', 'device' ),
			$result->request()?->entity_types()
		);
		$this->assert_same( null, $result->request()?->cursor() );
		$this->assert_same( 50, $result->request()?->page_size() );
		$this->assert_false( $result->request()?->include_resolved() ?? true );
	}

	public function test_parser_rejects_missing_device_schema_and_invalid_shapes(): void {
		$result = ( new OfflineConflictListRequestParser() )->parse(
			array(
				'statuses'         => array(),
				'entity_types'     => '',
				'cursor'           => 'cursor with spaces',
				'page_size'        => 0,
				'include_resolved' => 'sometimes',
			)
		);

		$this->assert_false( $result->is_valid() );
		$this->assert_true( in_array( 'device_id_required', $result->errors(), true ) );
		$this->assert_true( in_array( 'schema_version_required', $result->errors(), true ) );
		$this->assert_true( in_array( 'statuses_required', $result->errors(), true ) );
		$this->assert_true( in_array( 'entity_types_0_required', $result->errors(), true ) );
		$this->assert_true( in_array( 'cursor_invalid', $result->errors(), true ) );
		$this->assert_true( in_array( 'page_size_invalid', $result->errors(), true ) );
		$this->assert_true( in_array( 'include_resolved_invalid', $result->errors(), true ) );
	}

	public function test_parser_rejects_unsupported_filters_and_schema(): void {
		$result = ( new OfflineConflictListRequestParser() )->parse(
			array(
				'device_id'      => 'bad',
				'statuses'       => array( 'open', 'paid' ),
				'entity_types'   => array( 'inventory', 'payments' ),
				'cursor'         => 'conflict-cursor-1',
				'page_size'      => 201,
				'schema_version' => 2,
			)
		);

		$this->assert_false( $result->is_valid() );
		$this->assert_true( in_array( 'device_id_invalid', $result->errors(), true ) );
		$this->assert_true( in_array( 'statuses_1_unsupported', $result->errors(), true ) );
		$this->assert_true( in_array( 'entity_types_1_unsupported', $result->errors(), true ) );
		$this->assert_true( in_array( 'page_size_invalid', $result->errors(), true ) );
		$this->assert_true( in_array( 'schema_version_unsupported', $result->errors(), true ) );
	}
}
