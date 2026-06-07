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
		string $fallback_capability = 'view_inventory'
	) {
		$this->permission           = trim( $permission );
		$this->public_reads_enabled = $public_reads_enabled;
		$this->capability_checker   = $capability_checker;
		$this->fallback_capability  = trim( $fallback_capability );
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

	public function is_configured(): bool {
		return $this->public_reads_enabled || null !== $this->resolved_checker();
	}

	public function authorize( mixed $request = null ): bool {
		unset( $request );

		if ( $this->public_reads_enabled ) {
			$this->last_audit_payload = $this->audit_payload( 'authorized', 'public_read', array() );

			return true;
		}

		$checker = $this->resolved_checker();

		if ( null === $checker ) {
			$this->last_audit_payload = $this->audit_payload(
				'denied',
				'fallback_capability',
				array( 'public_reads_disabled', 'capability_checker_not_configured' )
			);

			return false;
		}

		$errors = array( 'public_reads_disabled' );

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

		$this->last_audit_payload = $this->audit_payload(
			$authorized ? 'authorized' : 'denied',
			'fallback_capability',
			$authorized ? array() : $errors
		);

		return $authorized;
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
	 * @param list<string> $errors Authorization errors.
	 * @return array<string, mixed>
	 */
	private function audit_payload( string $status, string $strategy, array $errors ): array {
		return array(
			'action'                   => 'inventory_public_read_permission_callback',
			'status'                   => $status,
			'permission'               => $this->permission,
			'strategy'                 => $strategy,
			'public_reads_enabled'     => $this->public_reads_enabled,
			'fallback_capability'      => $this->fallback_capability,
			'checker_configured'       => null !== $this->resolved_checker(),
			'route_registration_gated' => true,
			'errors'                   => array_values( array_unique( $errors ) ),
		);
	}
}
