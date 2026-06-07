<?php
/**
 * Offline pull route handler tests.
 *
 * @package TCGStorePlatform
 */

namespace TCGStorePlatform\Tests\Unit;

use RuntimeException;
use TCGStorePlatform\Api\V1\OfflinePullRouteHandler;
use TCGStorePlatform\Api\V1\OfflineRestRequestData;
use TCGStorePlatform\Offline\OfflinePullRequest;
use TCGStorePlatform\Tests\TestCase;

final class OfflinePullRouteHandlerTest extends TestCase {
	public function test_handler_returns_empty_pull_response_without_live_queries(): void {
		$response = $this->handler()->handle(
			new OfflineRestRequestData( $this->pull_payload(), array(), array(), array() )
		);

		$this->assert_same( 'ready', $response['status'] );
		$this->assert_same( 200, $response['status_code'] );
		$this->assert_same( 'offline_pull_response_ready', $response['code'] );
		$this->assert_same( 'pull_offline_changes', $response['callback'] );
		$this->assert_same( 'device-main-01', $response['data']['device_id'] );
		$this->assert_same( 1, $response['data']['schema_version'] );
		$this->assert_same( '2026-06-06T20:00:00Z', $response['data']['server_time_utc'] );
		$this->assert_same( 'inv-cursor-01', $response['data']['domains']['inventory']['cursor'] );
		$this->assert_same( array(), $response['data']['domains']['inventory']['data'] );
		$this->assert_same( array(), $response['data']['domains']['inventory']['tombstones'] );
		$this->assert_true( $response['meta']['query_deferred'] );
		$this->assert_true( $response['meta']['cursor_advance_deferred'] );
		$this->assert_true( $response['meta']['write_deferred'] );
		$this->assert_true( $response['meta']['route_still_gated'] );
	}

	public function test_handler_uses_injected_change_sets_without_advancing_cursors(): void {
		$handler = new OfflinePullRouteHandler(
			null,
			null,
			static fn ( OfflinePullRequest $request ): array => array(
				'inventory' => array(
					'cursor'   => 'inv-cursor-02',
					'has_more' => true,
					'data'     => array(
						array(
							'entity_id'      => 'inv-1001',
							'row_version'    => 7,
							'updated_at_utc' => '2026-06-06T20:01:00Z',
							'payload'        => array(
								'status' => 'available',
							),
						),
					),
				),
			),
			static fn (): string => '2026-06-06T20:02:00Z'
		);
		$response = $handler->handle(
			new OfflineRestRequestData( $this->pull_payload(), array(), array(), array() )
		);

		$this->assert_same( 'ready', $response['status'] );
		$this->assert_same( 'inv-cursor-02', $response['data']['domains']['inventory']['cursor'] );
		$this->assert_true( $response['data']['domains']['inventory']['has_more'] );
		$this->assert_same( 'inventory_item', $response['data']['domains']['inventory']['data'][0]['entity_type'] );
		$this->assert_same( 'available', $response['data']['domains']['inventory']['data'][0]['payload']['status'] );
		$this->assert_true( $response['meta']['cursor_advance_deferred'] );
	}

	public function test_handler_passes_request_data_to_route_aware_provider(): void {
		$provider_headers = array();
		$handler          = new OfflinePullRouteHandler(
			null,
			null,
			static function ( OfflinePullRequest $request, OfflineRestRequestData $data ) use ( &$provider_headers ): array {
				$provider_headers = $data->headers();

				return array(
					'inventory' => array(
						'cursor'   => 'inv-route-aware-01',
						'has_more' => false,
						'data'     => array(),
					),
				);
			},
			static fn (): string => '2026-06-06T20:03:00Z'
		);
		$response         = $handler->handle(
			new OfflineRestRequestData(
				$this->pull_payload(),
				array(),
				array(),
				array(
					'authorization' => 'Bearer test-device-token',
				)
			)
		);

		$this->assert_same( 'ready', $response['status'] );
		$this->assert_same( 'inv-route-aware-01', $response['data']['domains']['inventory']['cursor'] );
		$this->assert_same( 'Bearer test-device-token', $provider_headers['authorization'] );
		$this->assert_true( $response['meta']['write_deferred'] );
	}

	public function test_handler_rejects_invalid_pull_payload_before_provider(): void {
		$called  = false;
		$handler = new OfflinePullRouteHandler(
			null,
			null,
			static function () use ( &$called ): array {
				$called = true;

				return array();
			},
			static fn (): string => '2026-06-06T20:00:00Z'
		);
		$response = $handler->handle(
			new OfflineRestRequestData( array(), array(), array(), array() )
		);

		$this->assert_same( 'invalid', $response['status'] );
		$this->assert_same( 400, $response['status_code'] );
		$this->assert_same( 'offline_pull_request_invalid', $response['code'] );
		$this->assert_true( in_array( 'device_id_required', $response['errors'], true ) );
		$this->assert_false( $called );
		$this->assert_true( $response['meta']['query_deferred'] );
	}

	public function test_handler_fails_closed_when_change_provider_fails(): void {
		$handler = new OfflinePullRouteHandler(
			null,
			null,
			static function (): array {
				throw new RuntimeException( 'pull unavailable' );
			},
			static fn (): string => '2026-06-06T20:00:00Z'
		);
		$response = $handler->handle(
			new OfflineRestRequestData( $this->pull_payload(), array(), array(), array() )
		);

		$this->assert_same( 'invalid', $response['status'] );
		$this->assert_same( 400, $response['status_code'] );
		$this->assert_same( 'offline_pull_change_provider_failed', $response['code'] );
		$this->assert_same( array( 'change_set_provider_failed' ), $response['errors'] );
		$this->assert_true( $response['meta']['write_deferred'] );
	}

	private function handler(): OfflinePullRouteHandler {
		return new OfflinePullRouteHandler(
			null,
			null,
			null,
			static fn (): string => '2026-06-06T20:00:00Z'
		);
	}

	/**
	 * @return array<string, mixed>
	 */
	private function pull_payload(): array {
		return array(
			'device_id'          => 'device-main-01',
			'domains'            => array( 'inventory' ),
			'cursors'            => array(
				'inventory' => 'inv-cursor-01',
			),
			'page_size'          => 50,
			'include_tombstones' => true,
			'schema_version'     => 1,
		);
	}
}
