<?php
/**
 * Public-read permission callback for planned inventory search routes.
 *
 * @package TCGStorePlatform
 */

namespace TCGStorePlatform\Api\V1;

use Throwable;

final class InventoryPublicReadPermissionCallbackAdapter {
	private string $permission;
	private bool $public_reads_enabled;
	private string $fallback_capability;
	private mixed $capability_checker;
	private ?InventoryPublicReadRateLimitPolicy $rate_limit_policy;

	/**
	 * @var array<string, mixed>|null
	 */
	private ?array $last_audit_payload = null;

	/**
	 * @param callable(string): bool|null $capability_checker Capability checker.
	 */
	public function __construct(
		string $permission,
		bool $public_reads_enabled = false,
		?callable $capability_checker = null,
		string $fallback_capability = 'view_inventory',
		?InventoryPublicReadRateLimitPolicy $rate_limit_policy = null
	) {
		$this->permission           = trim( $permission );
		$this->public_reads_enabled = $public_reads_enabled;
		$this->capability_checker   = $capability_checker;
		$this->fallback_capability  = trim( $fallback_capability );
		$this->rate_limit_policy    = $rate_limit_policy;
	}

	public function __invoke( mixed $request = null ): bool {
		return $this->authorize( $request );
	}

	public function permission(): string {
		return $this->permission;
	}

	public function public_reads_enabled(): bool {
		return $this->public_reads_enabled;
	}

	public function fallback_capability(): string {
		return $this->fallback_capability;
	}

	public function public_rate_limiter_configured(): bool {
		return null !== $this->rate_limit_policy && $this->rate_limit_policy->is_configured();
	}

	public function is_configured(): bool {
		if ( $this->public_reads_enabled && $this->public_rate_limiter_configured() ) {
			return true;
		}

		return null !== $this->resolved_checker();
	}

	public function authorize( mixed $request = null ): bool {
		if ( $this->public_reads_enabled ) {
			$rate_limit = $this->rate_limit_result( $request );

			if ( true === ( $rate_limit['allowed'] ?? false ) ) {
				$this->last_audit_payload = $this->audit_payload(
					'authorized',
					'public_read_rate_limited',
					array(),
					$rate_limit
				);

				return true;
			}

			$fallback = $this->fallback_authorization( false );

			if ( true === $fallback['authorized'] ) {
				$this->last_audit_payload = $this->audit_payload(
					'authorized',
					'fallback_capability',
					array(),
					$rate_limit
				);

				return true;
			}

			$this->last_audit_payload = $this->audit_payload(
				'denied',
				'public_read_rate_limited',
				array_merge( $this->list_values( $rate_limit['errors'] ?? array() ), $fallback['errors'] ),
				$rate_limit
			);

			return false;
		}

		$fallback = $this->fallback_authorization( true );

		$this->last_audit_payload = $this->audit_payload(
			true === $fallback['authorized'] ? 'authorized' : 'denied',
			'fallback_capability',
			true === $fallback['authorized'] ? array() : $fallback['errors'],
			array()
		);

		return true === $fallback['authorized'];
	}

	/**
	 * @return array<string, mixed>
	 */
	public function last_audit_payload(): array {
		return $this->last_audit_payload ?? array();
	}

	private function resolved_checker(): ?callable {
		if ( is_callable( $this->capability_checker ) ) {
			return $this->capability_checker;
		}

		if ( function_exists( 'current_user_can' ) ) {
			return static fn ( string $capability ): bool => current_user_can( $capability );
		}

		return null;
	}

	/**
	 * @return array{authorized:bool,errors:list<string>}
	 */
	private function fallback_authorization( bool $include_public_disabled_error ): array {
		$checker = $this->resolved_checker();
		$errors  = $include_public_disabled_error ? array( 'public_reads_disabled' ) : array();

		if ( null === $checker ) {
			$errors[] = 'capability_checker_not_configured';

			return array(
				'authorized' => false,
				'errors'     => array_values( array_unique( $errors ) ),
			);
		}

		try {
			$authorized = '' !== $this->fallback_capability
				&& true === call_user_func( $checker, $this->fallback_capability );
		} catch ( Throwable ) {
			$authorized = false;
			$errors[]   = 'capability_checker_failed';
		}

		if ( ! $authorized && ! in_array( 'capability_checker_failed', $errors, true ) ) {
			$errors[] = 'capability_denied';
		}

		return array(
			'authorized' => $authorized,
			'errors'     => array_values( array_unique( $errors ) ),
		);
	}

	/**
	 * @return array<string, mixed>
	 */
	private function rate_limit_result( mixed $request ): array {
		if ( ! $this->public_rate_limiter_configured() || null === $this->rate_limit_policy ) {
			return array(
				'allowed'             => false,
				'configured'          => false,
				'bucket_hash'         => '',
				'limit'               => 0,
				'window_seconds'      => 0,
				'remaining'           => 0,
				'retry_after_seconds' => 0,
				'errors'              => array( 'public_rate_limiter_not_configured' ),
			);
		}

		return $this->rate_limit_policy->authorize( $this->bucket_from_request( $request ) );
	}

	private function bucket_from_request( mixed $request ): string {
		$candidates = array();

		if ( is_array( $request ) ) {
			$headers    = is_array( $request['headers'] ?? null ) ? $request['headers'] : array();
			$server     = is_array( $request['server'] ?? null ) ? $request['server'] : array();
			$candidates = array(
				$headers['x-forwarded-for'] ?? $headers['X-Forwarded-For'] ?? '',
				$headers['x-real-ip'] ?? $headers['X-Real-IP'] ?? '',
				$server['REMOTE_ADDR'] ?? '',
				$headers['user-agent'] ?? $headers['User-Agent'] ?? '',
			);
		}

		if ( is_object( $request ) && method_exists( $request, 'get_header' ) ) {
			$candidates = array(
				$request->get_header( 'x-forwarded-for' ),
				$request->get_header( 'x-real-ip' ),
				$request->get_header( 'user-agent' ),
			);
		}

		foreach ( $candidates as $candidate ) {
			$value = $this->first_header_value( $candidate );

			if ( '' !== $value ) {
				return $value;
			}
		}

		return 'anonymous';
	}

	private function first_header_value( mixed $value ): string {
		if ( is_array( $value ) ) {
			$value = reset( $value );
		}

		$parts = explode( ',', strtolower( trim( (string) $value ) ) );

		return trim( (string) ( $parts[0] ?? '' ) );
	}

	/**
	 * @return list<string>
	 */
	private function list_values( mixed $values ): array {
		if ( ! is_array( $values ) ) {
			return array();
		}

		return array_values(
			array_filter(
				array_map(
					static fn ( mixed $value ): string => ( is_array( $value ) || is_object( $value ) )
						? ''
						: trim( (string) $value ),
					$values
				),
				static fn ( string $value ): bool => '' !== $value
			)
		);
	}

	/**
	 * @param list<string> $errors Authorization errors.
	 * @param array<string, mixed> $rate_limit Rate-limit audit data.
	 * @return array<string, mixed>
	 */
	private function audit_payload(
		string $status,
		string $strategy,
		array $errors,
		array $rate_limit
	): array {
		return array(
			'action'                         => 'inventory_public_read_permission_callback',
			'status'                         => $status,
			'permission'                     => $this->permission,
			'strategy'                       => $strategy,
			'public_reads_enabled'           => $this->public_reads_enabled,
			'fallback_capability'            => $this->fallback_capability,
			'checker_configured'             => null !== $this->resolved_checker(),
			'public_rate_limiter_configured' => $this->public_rate_limiter_configured(),
			'public_rate_limit'              => $rate_limit,
			'route_registration_gated'       => true,
			'errors'                         => array_values( array_unique( $errors ) ),
		);
	}
}
