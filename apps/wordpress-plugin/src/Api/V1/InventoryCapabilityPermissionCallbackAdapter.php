<?php
/**
 * Capability-based permission callback for planned inventory routes.
 *
 * @package TCGStorePlatform
 */

namespace TCGStorePlatform\Api\V1;

use Throwable;

final class InventoryCapabilityPermissionCallbackAdapter {
	private string $permission;
	private string $capability;
	private mixed $capability_checker;

	/**
	 * @var array<string, mixed>|null
	 */
	private ?array $last_audit_payload = null;

	/**
	 * @param callable(string): bool|null $capability_checker Capability checker.
	 */
	public function __construct( string $permission, string $capability, ?callable $capability_checker = null ) {
		$this->permission         = trim( $permission );
		$this->capability         = trim( $capability );
		$this->capability_checker = $capability_checker;
	}

	public function __invoke( mixed $request = null ): bool {
		return $this->authorize( $request );
	}

	public function permission(): string {
		return $this->permission;
	}

	public function capability(): string {
		return $this->capability;
	}

	public function is_configured(): bool {
		return null !== $this->resolved_checker();
	}

	public function authorize( mixed $request = null ): bool {
		unset( $request );

		$checker = $this->resolved_checker();

		if ( null === $checker ) {
			$this->last_audit_payload = $this->audit_payload(
				'denied',
				array( 'capability_checker_not_configured' )
			);

			return false;
		}

		$errors = array();

		try {
			$authorized = '' !== $this->capability && true === call_user_func( $checker, $this->capability );
		} catch ( Throwable ) {
			$authorized = false;
			$errors[]   = 'capability_checker_failed';
		}

		if ( ! $authorized && array() === $errors ) {
			$errors[] = 'capability_denied';
		}

		$this->last_audit_payload = $this->audit_payload(
			$authorized ? 'authorized' : 'denied',
			$errors
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
	private function audit_payload( string $status, array $errors ): array {
		return array(
			'action'             => 'inventory_capability_permission_callback',
			'status'             => $status,
			'permission'         => $this->permission,
			'capability'         => $this->capability,
			'checker_configured' => $this->is_configured(),
			'errors'             => array_values( array_unique( $errors ) ),
		);
	}
}
