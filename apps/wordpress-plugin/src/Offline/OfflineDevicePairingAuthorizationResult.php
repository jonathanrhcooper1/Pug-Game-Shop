<?php
/**
 * Offline device pairing authorization result.
 *
 * @package TCGStorePlatform
 */

namespace TCGStorePlatform\Offline;

final class OfflineDevicePairingAuthorizationResult {
	/**
	 * @param list<string> $errors Authorization errors.
	 * @param array<string, mixed> $audit_payload Secret-free audit payload.
	 */
	private function __construct(
		private bool $authorized,
		private array $errors,
		private array $audit_payload
	) {
	}

	/**
	 * @param array<string, mixed> $audit_payload Secret-free audit payload.
	 */
	public static function authorized( array $audit_payload ): self {
		$audit_payload['status'] = 'authorized';
		$audit_payload['errors'] = array();

		return new self( true, array(), $audit_payload );
	}

	/**
	 * @param list<string> $errors Authorization errors.
	 * @param array<string, mixed> $audit_payload Secret-free audit payload.
	 */
	public static function denied( array $errors, array $audit_payload ): self {
		$errors                  = array_values( array_unique( $errors ) );
		$audit_payload['status'] = 'denied';
		$audit_payload['errors'] = $errors;

		return new self( false, $errors, $audit_payload );
	}

	public function is_authorized(): bool {
		return $this->authorized;
	}

	/**
	 * @return list<string>
	 */
	public function errors(): array {
		return $this->errors;
	}

	/**
	 * @return array<string, mixed>
	 */
	public function audit_payload(): array {
		return $this->audit_payload;
	}
}
