<?php
/**
 * Offline push payload validation result.
 *
 * @package TCGStorePlatform
 */

namespace TCGStorePlatform\Offline;

final class OfflinePushPayloadValidationResult {
	/**
	 * @param list<string> $errors Validation error codes.
	 */
	private function __construct(
		private ?OfflinePushPayload $payload,
		private array $errors
	) {
	}

	public static function accepted( OfflinePushPayload $payload ): self {
		return new self( $payload, array() );
	}

	/**
	 * @param list<string> $errors Validation error codes.
	 */
	public static function rejected( array $errors ): self {
		return new self( null, $errors );
	}

	public function is_valid(): bool {
		return null !== $this->payload && array() === $this->errors;
	}

	public function payload(): ?OfflinePushPayload {
		return $this->payload;
	}

	/**
	 * @return list<string>
	 */
	public function errors(): array {
		return $this->errors;
	}
}
