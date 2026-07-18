<?php
/**
 * Planned WooCommerce order-line metadata for serialized inventory.
 *
 * @package TCGStorePlatform
 */

namespace TCGStorePlatform\WooCommerce;

final class SerializedOrderLineMetadataPlan {
	/**
	 * @param array<string, int|string> $metadata Order-line metadata payload.
	 * @param list<string>              $errors Validation errors.
	 */
	private function __construct(
		private array $metadata,
		private array $errors
	) {
	}

	/**
	 * @param array<string, int|string> $metadata Order-line metadata payload.
	 */
	public static function ready( array $metadata ): self {
		return new self( $metadata, array() );
	}

	/**
	 * @param list<string> $errors Validation errors.
	 */
	public static function invalid( array $errors ): self {
		return new self( array(), $errors );
	}

	/**
	 * @return array<string, int|string>
	 */
	public function metadata(): array {
		return $this->metadata;
	}

	/**
	 * @return list<string>
	 */
	public function errors(): array {
		return $this->errors;
	}

	public function is_ready(): bool {
		return array() === $this->errors && array() !== $this->metadata;
	}

	public function has_errors(): bool {
		return array() !== $this->errors;
	}
}
