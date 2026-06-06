<?php
/**
 * Offline REST request adapter tests.
 *
 * @package TCGStorePlatform
 */

namespace TCGStorePlatform\Tests\Unit;

use TCGStorePlatform\Api\V1\OfflineRestRequestAdapter;
use TCGStorePlatform\Tests\TestCase;

final class OfflineRestRequestAdapterTest extends TestCase {
	public function test_adapter_normalizes_array_fixture_requests(): void {
		$data = ( new OfflineRestRequestAdapter() )->from_request(
			array(
				'body'    => array(
					'device_id' => 'device-001',
				),
				'query'   => array(
					'page_size' => '25',
				),
				'route'   => array(
					'conflict_id' => 'conflict-001',
				),
				'headers' => array(
					'X_Idempotency_Key' => 'batch-001',
				),
			)
		);

		$this->assert_same( 'device-001', $data->body_params()['device_id'] );
		$this->assert_same( '25', $data->query_params()['page_size'] );
		$this->assert_same( 'conflict-001', $data->route_param( 'conflict_id' ) );
		$this->assert_same( 'batch-001', $data->idempotency_key() );
	}

	public function test_adapter_treats_unwrapped_array_as_body_payload(): void {
		$data = ( new OfflineRestRequestAdapter() )->from_request(
			array(
				'device_id'      => 'device-002',
				'schema_version' => 1,
				'headers'        => array(
					'Idempotency-Key' => 'pull-ignored-for-body',
				),
			)
		);

		$this->assert_same( 'device-002', $data->body_params()['device_id'] );
		$this->assert_same( 1, $data->body_params()['schema_version'] );
		$this->assert_false( array_key_exists( 'headers', $data->body_params() ) );
		$this->assert_same( 'pull-ignored-for-body', $data->idempotency_key() );
	}

	public function test_adapter_reads_wordpress_style_request_objects(): void {
		$request = new OfflineRestRequestAdapterFixture(
			array(
				'device_id' => 'device-003',
			),
			array(
				'include_resolved' => 'true',
			),
			array(
				'conflict_id' => 'conflict-003',
			),
			array(
				'X-Idempotency-Key' => array( 'resolve-003' ),
			)
		);

		$data = ( new OfflineRestRequestAdapter() )->from_request( $request );

		$this->assert_same( 'device-003', $data->body_params()['device_id'] );
		$this->assert_same( 'true', $data->query_params()['include_resolved'] );
		$this->assert_same( 'conflict-003', $data->route_param( 'conflict_id' ) );
		$this->assert_same( 'resolve-003', $data->idempotency_key() );
	}
}

final class OfflineRestRequestAdapterFixture {
	/**
	 * @param array<string, mixed> $json_params JSON body parameters.
	 * @param array<string, mixed> $query_params Query parameters.
	 * @param array<string, mixed> $url_params URL parameters.
	 * @param array<string, mixed> $headers Request headers.
	 */
	public function __construct(
		private array $json_params,
		private array $query_params,
		private array $url_params,
		private array $headers
	) {
	}

	/**
	 * @return array<string, mixed>
	 */
	public function get_json_params(): array {
		return $this->json_params;
	}

	/**
	 * @return array<string, mixed>
	 */
	public function get_query_params(): array {
		return $this->query_params;
	}

	/**
	 * @return array<string, mixed>
	 */
	public function get_url_params(): array {
		return $this->url_params;
	}

	/**
	 * @return array<string, mixed>
	 */
	public function get_headers(): array {
		return $this->headers;
	}

	public function get_header( string $header ): ?string {
		$header = strtolower( $header );

		foreach ( $this->headers as $name => $value ) {
			if ( strtolower( (string) $name ) !== $header ) {
				continue;
			}

			if ( is_array( $value ) ) {
				$value = reset( $value );
			}

			return is_string( $value ) ? $value : null;
		}

		return null;
	}
}
