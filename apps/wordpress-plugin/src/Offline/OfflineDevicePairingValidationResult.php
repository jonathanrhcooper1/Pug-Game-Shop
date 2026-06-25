<?php
/**
 * Offline device pairing validation result.
 *
 * @package TCGStorePlatform
 */

namespace TCGStorePlatform\Offline;

final class OfflineDevicePairingValidationResult {
	/**
	 * @param list<string> $errors Validation error codes.
	 */
	private function __construct(
		private ?OfflineDevicePairingRequest $request,
		private array $errors
	) {
	}

	public static function accepted( OfflineDevicePairingRequest $request ): self {
		return new self( $request, array() );
	}

	/**
	 * @param list<string> $errors Validation error codes.
	 */
	public static function rejected( array $errors ): self {
		return new self( null, $errors );
	}

	public function is_valid(): bool {
		return null !== $this->request && array() === $this->errors;
	}

	public function request(): ?OfflineDevicePairingRequest {
		return $this->request;
	}

	/**
	 * @return list<string>
	 */
	public function errors(): array {
		return $this->errors;
	}
}
