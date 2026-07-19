<?php
/**
 * Normalized inventory intake request.
 *
 * @package TCGStorePlatform
 */

namespace TCGStorePlatform\Inventory;

final class InventoryIntakeRequest {
	/**
	 * @param array<string, mixed> $item_fields Normalized inventory item fields.
	 */
	public function __construct(
		private string $source,
		private string $idempotency_key,
		private string $currency,
		private ?int $actor_user_id,
		private array $item_fields,
		private bool $woocommerce_projection_deferred,
		private bool $label_print_deferred
	) {
	}

	public function source(): string {
		return $this->source;
	}

	public function idempotency_key(): string {
		return $this->idempotency_key;
	}

	public function currency(): string {
		return $this->currency;
	}

	public function actor_user_id(): ?int {
		return $this->actor_user_id;
	}

	/**
	 * @return array<string, mixed>
	 */
	public function item_fields(): array {
		return $this->item_fields;
	}

	public function woocommerce_projection_deferred(): bool {
		return $this->woocommerce_projection_deferred;
	}

	public function label_print_deferred(): bool {
		return $this->label_print_deferred;
	}
}
