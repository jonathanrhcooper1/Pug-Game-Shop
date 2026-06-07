<?php
/**
 * Buylist submission intake request.
 *
 * @package TCGStorePlatform
 */

namespace TCGStorePlatform\Buylist;

final class BuylistSubmissionIntakeRequest {
	/**
	 * @param list<array<string, mixed>> $items Normalized item payloads.
	 */
	public function __construct(
		private string $source,
		private string $idempotency_key,
		private string $currency,
		private string $customer_phone,
		private string $customer_first_name,
		private string $customer_last_name,
		private string $customer_email,
		private ?int $customer_id,
		private ?int $location_id,
		private string $device_id,
		private string $owner_token_hash,
		private ?int $actor_user_id,
		private array $items
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

	public function customer_phone(): string {
		return $this->customer_phone;
	}

	public function customer_first_name(): string {
		return $this->customer_first_name;
	}

	public function customer_last_name(): string {
		return $this->customer_last_name;
	}

	public function customer_email(): string {
		return $this->customer_email;
	}

	public function customer_id(): ?int {
		return $this->customer_id;
	}

	public function location_id(): ?int {
		return $this->location_id;
	}

	public function device_id(): string {
		return $this->device_id;
	}

	public function owner_token_hash(): string {
		return $this->owner_token_hash;
	}

	public function actor_user_id(): ?int {
		return $this->actor_user_id;
	}

	/**
	 * @return list<array<string, mixed>>
	 */
	public function items(): array {
		return $this->items;
	}
}
