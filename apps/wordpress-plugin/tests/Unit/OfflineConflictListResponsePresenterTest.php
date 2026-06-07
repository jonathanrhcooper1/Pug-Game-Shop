<?php
/**
 * Offline conflict list response presenter tests.
 *
 * @package TCGStorePlatform
 */

namespace TCGStorePlatform\Tests\Unit;

use InvalidArgumentException;
use TCGStorePlatform\Offline\OfflineConflictListRequest;
use TCGStorePlatform\Offline\OfflineConflictListResponsePresenter;
use TCGStorePlatform\Tests\TestCase;

final class OfflineConflictListResponsePresenterTest extends TestCase {
	public function test_presenter_builds_empty_conflict_response_with_filters(): void {
		$request = $this->request();

		$response = ( new OfflineConflictListResponsePresenter() )->present(
			$request,
			array(),
			null,
			false,
			'2026-06-06T18:00:00Z'
		);

		$this->assert_same( 'device-main-01', $response['device_id'] );
		$this->assert_same( 1, $response['schema_version'] );
		$this->assert_same( '2026-06-06T18:00:00Z', $response['server_time_utc'] );
		$this->assert_same( '', $response['cursor'] );
		$this->assert_false( $response['has_more'] );
		$this->assert_same( array( 'open', 'assigned' ), $response['filters']['statuses'] );
		$this->assert_same( array( 'inventory', 'event' ), $response['filters']['entity_types'] );
		$this->assert_same( array(), $response['conflicts'] );
	}

	public function test_presenter_normalizes_conflict_rows(): void {
		$response = ( new OfflineConflictListResponsePresenter() )->present(
			$this->request(),
			array(
				array(
					'conflict_id'        => 'conflict-main-01',
					'status'             => 'Open',
					'entity_type'        => 'Inventory',
					'entity_id'          => 'inv-1001',
					'conflict_type'      => 'double_sell',
					'severity'           => 'Blocking',
					'summary'            => " Online sale and offline sale both claimed item \n",
					'row_version'        => '7',
					'server_row_version' => 12,
					'device_row_version' => '11',
					'detected_at_utc'    => '2026-06-06T17:50:00Z',
					'updated_at_utc'     => '2026-06-06T17:55:00Z',
					'server_payload'     => array(
						'status' => 'sold',
					),
					'device_payload'     => array(
						'status' => 'offline_pending_sync',
					),
					'resolution_options' => array( 'accept_server', 'Accept_Device', 'accept_server' ),
				),
			),
			'conflict-cursor-11',
			true,
			'2026-06-06T18:00:00Z'
		);

		$conflict = $response['conflicts'][0];

		$this->assert_true( $response['has_more'] );
		$this->assert_same( 'conflict-cursor-11', $response['cursor'] );
		$this->assert_same( 'conflict-main-01', $conflict['conflict_id'] );
		$this->assert_same( 'open', $conflict['status'] );
		$this->assert_same( 'inventory', $conflict['entity_type'] );
		$this->assert_same( 'double_sell', $conflict['conflict_type'] );
		$this->assert_same( 'blocking', $conflict['severity'] );
		$this->assert_same( 'Online sale and offline sale both claimed item', $conflict['summary'] );
		$this->assert_same( 7, $conflict['row_version'] );
		$this->assert_same( 12, $conflict['server_row_version'] );
		$this->assert_same( 11, $conflict['device_row_version'] );
		$this->assert_same( 'sold', $conflict['server_payload']['status'] );
		$this->assert_same( 'offline_pending_sync', $conflict['device_payload']['status'] );
		$this->assert_same( array( 'accept_server', 'accept_device' ), $conflict['resolution_options'] );
	}

	public function test_presenter_rejects_invalid_response_contract_inputs(): void {
		$presenter = new OfflineConflictListResponsePresenter();
		$request   = $this->request();

		$this->assert_throws_invalid_argument(
			static fn () => $presenter->present( $request, array(), null, false, '2026-06-06T18:00:00-04:00' )
		);

		$this->assert_throws_invalid_argument(
			static fn () => $presenter->present( $request, array(), 'cursor with spaces', false, '2026-06-06T18:00:00Z' )
		);

		$this->assert_throws_invalid_argument(
			static fn () => $presenter->present(
				$request,
				array(
					array(
						'conflict_id'        => 'bad',
						'status'             => 'paid',
						'entity_type'        => 'payments',
						'entity_id'          => 'bad entity',
						'conflict_type'      => '',
						'severity'           => 'critical',
						'summary'            => '',
						'row_version'        => 0,
						'detected_at_utc'    => 'not-now',
						'updated_at_utc'     => 'not-now',
						'server_payload'     => 'not-object',
						'device_payload'     => 'not-object',
						'resolution_options' => array( 'capture_payment' ),
					),
				),
				null,
				false,
				'2026-06-06T18:00:00Z'
			)
		);
	}

	private function request(): OfflineConflictListRequest {
		return new OfflineConflictListRequest(
			'device-main-01',
			array( 'open', 'assigned' ),
			array( 'inventory', 'event' ),
			null,
			50,
			false,
			1
		);
	}

	/**
	 * @param callable(): void $callback Callback expected to throw.
	 */
	private function assert_throws_invalid_argument( callable $callback ): void {
		try {
			$callback();
		} catch ( InvalidArgumentException ) {
			$this->assert_true( true );

			return;
		}

		$this->assert_true( false, 'Expected InvalidArgumentException.' );
	}
}
