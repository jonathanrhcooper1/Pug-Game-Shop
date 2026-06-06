<?php
/**
 * Exact inventory reservation request.
 *
 * @package TCGStorePlatform
 */

namespace TCGStorePlatform\Reservations;

final class ReservationRequest {
	/**
	 * @param array<string, mixed> $metadata Safe structured metadata.
	 */
	public function __construct(
		private int $inventory_id,
		private string $source,
		private string $owner_token_hash,
		private string $idempotency_key,
		private string $expires_at,
		private ?string $cart_id = null,
		private ?int $customer_id = null,
		private ?int $order_id = null,
		private string $price_snapshot = '0.0000',
		private string $currency = 'USD',
		private array $metadata = array()
	) {
		$this->source           = strtolower( trim( $source ) );
		$this->owner_token_hash = trim( $owner_token_hash );
		$this->idempotency_key  = trim( $idempotency_key );
		$this->expires_at       = trim( $expires_at );
		$this->cart_id          = null === $cart_id ? null : trim( $cart_id );
		$this->price_snapshot   = trim( $price_snapshot );
		$this->currency         = strtoupper( trim( $currency ) );
	}

	public function inventory_id(): int {
		return $this->inventory_id;
	}

	public function source(): string {
		return $this->source;
	}

	public function owner_token_hash(): string {
		return $this->owner_token_hash;
	}

	public function idempotency_key(): string {
		return $this->idempotency_key;
	}

	public function expires_at(): string {
		return $this->expires_at;
	}

	public function cart_id(): ?string {
		return $this->cart_id;
	}

	public function customer_id(): ?int {
		return $this->customer_id;
	}

	public function order_id(): ?int {
		return $this->order_id;
	}

	public function price_snapshot(): string {
		return $this->price_snapshot;
	}

	public function currency(): string {
		return $this->currency;
	}

	/**
	 * @return array<string, mixed>
	 */
	public function metadata(): array {
		return $this->metadata;
	}
}
