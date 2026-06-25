<?php
/**
 * Normalized offline REST request data.
 *
 * @package TCGStorePlatform
 */

namespace TCGStorePlatform\Api\V1;

final class OfflineRestRequestData {
	/**
	 * @param array<string, mixed>  $body_params Request body parameters.
	 * @param array<string, mixed>  $query_params Query string parameters.
	 * @param array<string, mixed>  $route_params Route/path parameters.
	 * @param array<string, string> $headers Normalized request headers.
	 */
	public function __construct(
		private array $body_params,
		private array $query_params,
		private array $route_params,
		private array $headers
	) {
	}

	/**
	 * @return array<string, mixed>
	 */
	public function body_params(): array {
		return $this->body_params;
	}

	/**
	 * @return array<string, mixed>
	 */
	public function query_params(): array {
		return $this->query_params;
	}

	/**
	 * @return array<string, mixed>
	 */
	public function route_params(): array {
		return $this->route_params;
	}

	/**
	 * @return array<string, string>
	 */
	public function headers(): array {
		return $this->headers;
	}

	public function route_param( string $name ): ?string {
		$value = $this->route_params[ $name ] ?? null;

		if ( null === $value || is_array( $value ) || is_object( $value ) ) {
			return null;
		}

		$value = trim( (string) $value );

		return '' === $value ? null : $value;
	}

	public function header( string $name ): ?string {
		$canonical = $this->canonical_header_name( $name );

		if ( ! array_key_exists( $canonical, $this->headers ) ) {
			return null;
		}

		$value = trim( $this->headers[ $canonical ] );

		return '' === $value ? null : $value;
	}

	public function idempotency_key(): ?string {
		foreach ( array( 'idempotency-key', 'x-idempotency-key', 'x-request-id' ) as $header ) {
			$value = $this->header( $header );

			if ( null !== $value ) {
				return $value;
			}
		}

		return null;
	}

	private function canonical_header_name( string $name ): string {
		return strtolower( str_replace( '_', '-', trim( $name ) ) );
	}
}
