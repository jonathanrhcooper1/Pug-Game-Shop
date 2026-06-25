<?php
/**
 * Inventory intake validation result.
 *
 * @package TCGStorePlatform
 */

namespace TCGStorePlatform\Inventory;

final class InventoryIntakeValidationResult {
	/**
	 * @param list<string> $errors Validation error codes.
	 */
	private function __construct(
		private ?InventoryIntakeRequest $request,
		private array $errors
	) {
	}

	public static function accepted( InventoryIntakeRequest $request ): self {
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

	public function request(): ?InventoryIntakeRequest {
		return $this->request;
	}

	/**
	 * @return list<string>
	 */
	public function errors(): array {
		return $this->errors;
	}
}
