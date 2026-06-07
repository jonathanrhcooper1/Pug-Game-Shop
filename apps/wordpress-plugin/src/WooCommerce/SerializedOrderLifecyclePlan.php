<?php
/**
 * Planned WooCommerce order lifecycle work for serialized inventory lines.
 *
 * @package TCGStorePlatform
 */

namespace TCGStorePlatform\WooCommerce;

final class SerializedOrderLifecyclePlan {
	/**
	 * @param list<array<string, mixed>> $transitions Planned reservation/inventory transitions.
	 * @param list<array<string, mixed>> $skipped_line_items Non-serialized order lines skipped.
	 * @param list<array<string, mixed>> $errors Invalid serialized order lines.
	 */
	private function __construct(
		private string $action,
		private array $transitions,
		private array $skipped_line_items,
		private array $errors
	) {
	}

	/**
	 * @param list<array<string, mixed>> $transitions Planned reservation/inventory transitions.
	 * @param list<array<string, mixed>> $skipped_line_items Non-serialized order lines skipped.
	 * @param list<array<string, mixed>> $errors Invalid serialized order lines.
	 */
	public static function from_parts(
		string $action,
		array $transitions,
		array $skipped_line_items,
		array $errors
	): self {
		return new self( $action, $transitions, $skipped_line_items, $errors );
	}

	public function action(): string {
		return $this->action;
	}

	/**
	 * @return list<array<string, mixed>>
	 */
	public function transitions(): array {
		return $this->transitions;
	}

	/**
	 * @return list<array<string, mixed>>
	 */
	public function skipped_line_items(): array {
		return $this->skipped_line_items;
	}

	/**
	 * @return list<array<string, mixed>>
	 */
	public function errors(): array {
		return $this->errors;
	}

	public function transition_count(): int {
		return count( $this->transitions );
	}

	public function has_work(): bool {
		return array() !== $this->transitions;
	}
}
