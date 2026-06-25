<?php
/**
 * Offline pull response presenter tests.
 *
 * @package TCGStorePlatform
 */

namespace TCGStorePlatform\Tests\Unit;

use InvalidArgumentException;
use TCGStorePlatform\Offline\OfflinePullRequest;
use TCGStorePlatform\Offline\OfflinePullResponsePresenter;
use TCGStorePlatform\Tests\TestCase;

final class OfflinePullResponsePresenterTest extends TestCase {
	public function test_presenter_builds_empty_domain_responses_with_request_cursors(): void {
		$request = new OfflinePullRequest(
			'device-main-01',
			array( 'branding', 'inventory' ),
			array( 'inventory' => 'inv-cursor-10' ),
			100,
			true,
			1
		);

		$response = ( new OfflinePullResponsePresenter() )->present(
			$request,
			array(),
			'2026-06-06T15:40:00Z'
		);

		$this->assert_same( 'device-main-01', $response['device_id'] );
		$this->assert_same( 1, $response['schema_version'] );
		$this->assert_same( '2026-06-06T15:40:00Z', $response['server_time_utc'] );
		$this->assert_same( '', $response['domains']['branding']['cursor'] );
		$this->assert_same( 'inv-cursor-10', $response['domains']['inventory']['cursor'] );
		$this->assert_false( $response['domains']['inventory']['has_more'] );
		$this->assert_same( array(), $response['domains']['inventory']['data'] );
		$this->assert_same( array(), $response['domains']['inventory']['tombstones'] );
	}

	public function test_presenter_normalizes_data_rows_and_hides_tombstones_when_excluded(): void {
		$request = new OfflinePullRequest(
			'device-main-01',
			array( 'inventory' ),
			array(),
			100,
			false,
			1
		);

		$response = ( new OfflinePullResponsePresenter() )->present(
			$request,
			array(
				'inventory' => array(
					'cursor'     => 'inv-cursor-42',
					'has_more'   => true,
					'data'       => array(
						array(
							'entity_id'      => 'inv-1001',
							'row_version'    => '42',
							'updated_at_utc' => '2026-06-06T15:41:00Z',
							'payload'        => array(
								'sku'    => 'PUG-INV-1001',
								'status' => 'available',
							),
						),
					),
					'tombstones' => array(
						array(
							'entity_id'      => 'inv-999',
							'row_version'    => 43,
							'deleted_at_utc' => '2026-06-06T15:42:00Z',
						),
					),
				),
			),
			'2026-06-06T15:43:00Z'
		);

		$domain = $response['domains']['inventory'];

		$this->assert_true( $domain['has_more'] );
		$this->assert_same( 'inv-cursor-42', $domain['cursor'] );
		$this->assert_same( 'inventory_item', $domain['data'][0]['entity_type'] );
		$this->assert_same( 'inv-1001', $domain['data'][0]['entity_id'] );
		$this->assert_same( 42, $domain['data'][0]['row_version'] );
		$this->assert_same( 'available', $domain['data'][0]['payload']['status'] );
		$this->assert_same( array(), $domain['tombstones'] );
	}

	public function test_presenter_includes_tombstones_when_requested(): void {
		$request = new OfflinePullRequest(
			'device-main-01',
			array( 'events' ),
			array(),
			100,
			true,
			1
		);

		$response = ( new OfflinePullResponsePresenter() )->present(
			$request,
			array(
				'events' => array(
					'cursor'     => 'evt-cursor-11',
					'tombstones' => array(
						array(
							'entity_id'      => 'event-9',
							'row_version'    => 11,
							'deleted_at_utc' => '2026-06-06T15:44:00Z',
						),
					),
				),
			),
			'2026-06-06T15:45:00Z'
		);

		$tombstone = $response['domains']['events']['tombstones'][0];

		$this->assert_same( 'event', $tombstone['entity_type'] );
		$this->assert_same( 'event-9', $tombstone['entity_id'] );
		$this->assert_same( 11, $tombstone['row_version'] );
		$this->assert_same( '2026-06-06T15:44:00Z', $tombstone['deleted_at_utc'] );
	}

	public function test_presenter_rejects_invalid_response_contract_inputs(): void {
		$presenter = new OfflinePullResponsePresenter();
		$request   = new OfflinePullRequest(
			'device-main-01',
			array( 'inventory' ),
			array(),
			100,
			true,
			1
		);

		$this->assert_throws_invalid_argument(
			static fn () => $presenter->present( $request, array(), '2026-06-06T15:45:00-04:00' )
		);

		$this->assert_throws_invalid_argument(
			static fn () => $presenter->present(
				$request,
				array(
					'inventory' => array(
						'data' => array(
							array(
								'entity_id'      => 'inv-1001',
								'row_version'    => 0,
								'updated_at_utc' => '2026-06-06T15:45:00Z',
								'payload'        => array(),
							),
						),
					),
				),
				'2026-06-06T15:45:00Z'
			)
		);

		$this->assert_throws_invalid_argument(
			static fn () => $presenter->present(
				new OfflinePullRequest( 'device-main-01', array( 'payments' ), array(), 100, true, 1 ),
				array(),
				'2026-06-06T15:45:00Z'
			)
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
