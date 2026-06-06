<?php
/**
 * Planned REST permission callback adapter for registered offline devices.
 *
 * @package TCGStorePlatform
 */

namespace TCGStorePlatform\Offline;

final class OfflineRegisteredDevicePermissionCallbackAdapter {
	private OfflineRegisteredDevicePermissionResolver $resolver;
	private string $required_scope;
	private mixed $server_time_provider;
	private ?OfflineRegisteredDevicePermissionResolution $last_resolution = null;

	/**
	 * @param callable(): string|null $server_time_provider Optional UTC clock.
	 */
	public function __construct(
		OfflineRegisteredDevicePermissionResolver $resolver,
		string $required_scope,
		?callable $server_time_provider = null
	) {
		$this->resolver             = $resolver;
		$this->required_scope       = strtolower( trim( $required_scope ) );
		$this->server_time_provider = $server_time_provider;
	}

	public function __invoke( mixed $request ): bool {
		$this->last_resolution = $this->authorize( $request );

		return $this->last_resolution->is_authorized();
	}

	public function authorize( mixed $request ): OfflineRegisteredDevicePermissionResolution {
		$this->last_resolution = $this->resolver->resolve_and_apply_session_update(
			$this->headers_from_request( $request ),
			$this->required_scope,
			$this->server_time_utc()
		);

		return $this->last_resolution;
	}

	public function last_resolution(): ?OfflineRegisteredDevicePermissionResolution {
		return $this->last_resolution;
	}

	/**
	 * @return array<string, mixed>
	 */
	private function headers_from_request( mixed $request ): array {
		if ( is_array( $request ) ) {
			return $this->headers_from_array( $request );
		}

		if ( is_object( $request ) && method_exists( $request, 'get_headers' ) ) {
			$headers = $request->get_headers();

			if ( is_array( $headers ) ) {
				return $headers;
			}
		}

		if ( is_object( $request ) && method_exists( $request, 'get_header' ) ) {
			return $this->headers_from_get_header( $request );
		}

		return array();
	}

	/**
	 * @param array<string, mixed> $request Request or header array.
	 * @return array<string, mixed>
	 */
	private function headers_from_array( array $request ): array {
		if ( isset( $request['headers'] ) && is_array( $request['headers'] ) ) {
			return $request['headers'];
		}

		return $request;
	}

	/**
	 * @return array<string, mixed>
	 */
	private function headers_from_get_header( object $request ): array {
		$headers = array();

		foreach ( array( 'authorization', 'http_authorization' ) as $header_name ) {
			$value = $request->get_header( $header_name );

			if ( '' !== trim( (string) $value ) ) {
				$headers[ $header_name ] = $value;
			}
		}

		return $headers;
	}

	private function server_time_utc(): string {
		if ( is_callable( $this->server_time_provider ) ) {
			return trim( (string) call_user_func( $this->server_time_provider ) );
		}

		return gmdate( 'Y-m-d\TH:i:s\Z' );
	}
}
