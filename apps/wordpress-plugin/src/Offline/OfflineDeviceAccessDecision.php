<?php
/**
 * Offline device access decision.
 *
 * @package TCGStorePlatform
 */

namespace TCGStorePlatform\Offline;

final class OfflineDeviceAccessDecision {
	/**
	 * @param array<string, mixed> $context Accepted device context.
	 * @param list<string>         $errors Rejection errors.
	 */
	private function __construct(
		private array $context,
		private array $errors
	) {
	}

	/**
	 * @param array<string, mixed> $context Accepted device context.
	 */
	public static function accepted( array $context ): self {
		return new self( $context, array() );
	}

	/**
	 * @param list<string> $errors Rejection errors.
	 */
	public static function rejected( array $errors ): self {
		return new self( array(), $errors );
	}

	public function is_allowed(): bool {
		return array() !== $this->context && array() === $this->errors;
	}

	/**
	 * @return array<string, mixed>
	 */
	public function context(): array {
		return $this->context;
	}

	/**
	 * @return list<string>
	 */
	public function errors(): array {
		return $this->errors;
	}
}
