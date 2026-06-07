<?php
/**
 * Offline REST request adapter.
 *
 * @package TCGStorePlatform
 */

namespace TCGStorePlatform\Api\V1;

final class OfflineRestRequestAdapter {
	public function from_request( mixed $request ): OfflineRestRequestData {
		return new OfflineRestRequestData(
			$this->body_params( $request ),
			$this->query_params( $request ),
			$this->route_params( $request ),
			$this->headers( $request )
		);
	}

	/**
	 * @return array<string, mixed>
	 */
	private function body_params( mixed $request ): array {
		if ( is_array( $request ) ) {
			foreach ( array( 'body', 'json', 'params' ) as $key ) {
				if ( isset( $request[ $key ] ) && is_array( $request[ $key ] ) ) {
					return $request[ $key ];
				}
			}

			return $this->unwrapped_array_body( $request );
		}

		foreach ( array( 'get_json_params', 'get_body_params' ) as $method ) {
			if ( is_object( $request ) && method_exists( $request, $method ) ) {
				$params = $request->{$method}();

				if ( is_array( $params ) && array() !== $params ) {
					return $params;
				}
			}
		}

		return array();
	}

	/**
	 * @return array<string, mixed>
	 */
	private function query_params( mixed $request ): array {
		if ( is_array( $request ) ) {
			return isset( $request['query'] ) && is_array( $request['query'] ) ? $request['query'] : array();
		}

		if ( is_object( $request ) && method_exists( $request, 'get_query_params' ) ) {
			$params = $request->get_query_params();

			return is_array( $params ) ? $params : array();
		}

		return array();
	}

	/**
	 * @return array<string, mixed>
	 */
	private function route_params( mixed $request ): array {
		if ( is_array( $request ) ) {
			return isset( $request['route'] ) && is_array( $request['route'] ) ? $request['route'] : array();
		}

		foreach ( array( 'get_url_params', 'get_route_params' ) as $method ) {
			if ( is_object( $request ) && method_exists( $request, $method ) ) {
				$params = $request->{$method}();

				if ( is_array( $params ) ) {
					return $params;
				}
			}
		}

		return array();
	}

	/**
	 * @return array<string, string>
	 */
	private function headers( mixed $request ): array {
		$headers = array();

		if ( is_array( $request ) && isset( $request['headers'] ) && is_array( $request['headers'] ) ) {
			return $this->normalize_headers( $request['headers'] );
		}

		if ( is_object( $request ) && method_exists( $request, 'get_headers' ) ) {
			$raw_headers = $request->get_headers();

			if ( is_array( $raw_headers ) ) {
				$headers = $this->normalize_headers( $raw_headers );
			}
		}

		if ( is_object( $request ) && method_exists( $request, 'get_header' ) ) {
			foreach ( array( 'idempotency-key', 'x-idempotency-key', 'x-request-id' ) as $header ) {
				$value = $request->get_header( $header );

				if ( null !== $value && '' !== trim( (string) $value ) ) {
					$headers[ $this->canonical_header_name( $header ) ] = trim( (string) $value );
				}
			}
		}

		return $headers;
	}

	/**
	 * @param array<string, mixed> $request Request fixture.
	 * @return array<string, mixed>
	 */
	private function unwrapped_array_body( array $request ): array {
		$body = $request;

		foreach ( array( 'headers', 'query', 'route' ) as $control_key ) {
			unset( $body[ $control_key ] );
		}

		return $body;
	}

	/**
	 * @param array<string, mixed> $headers Request headers.
	 * @return array<string, string>
	 */
	private function normalize_headers( array $headers ): array {
		$normalized = array();

		foreach ( $headers as $name => $value ) {
			$header_name  = $this->canonical_header_name( (string) $name );
			$header_value = $this->header_value( $value );

			if ( '' === $header_name || null === $header_value ) {
				continue;
			}

			$normalized[ $header_name ] = $header_value;
		}

		return $normalized;
	}

	private function header_value( mixed $value ): ?string {
		if ( is_array( $value ) ) {
			$value = reset( $value );
		}

		if ( null === $value || is_array( $value ) || is_object( $value ) ) {
			return null;
		}

		$value = trim( (string) $value );

		return '' === $value ? null : $value;
	}

	private function canonical_header_name( string $name ): string {
		return strtolower( str_replace( '_', '-', trim( $name ) ) );
	}
}
