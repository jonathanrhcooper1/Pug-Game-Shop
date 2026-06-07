<?php
/**
 * Customer credit ledger posting request.
 *
 * @package TCGStorePlatform
 */

namespace TCGStorePlatform\Credit;

final class CustomerCreditPostingRequest {
	/**
	 * @param array<string, mixed> $metadata Safe structured metadata.
	 */
	public function __construct(
		private int $customer_id,
		private string $entry_type,
		private string $amount,
		private string $idempotency_key,
		private string $currency = 'USD',
		private ?int $actor_user_id = null,
		private ?int $manager_user_id = null,
		private ?int $order_id = null,
		private ?int $buylist_submission_id = null,
		private ?int $location_id = null,
		private string $offline_operation_id = '',
		private string $reason = '',
		private array $metadata = array()
	) {
		$this->currency             = strtoupper( trim( $currency ) );
		$this->idempotency_key      = trim( $idempotency_key );
		$this->offline_operation_id = trim( $offline_operation_id );
		$this->reason               = trim( $reason );
	}

	public function customer_id(): int {
		return $this->customer_id;
	}

	public function entry_type(): string {
		return $this->entry_type;
	}

	public function amount(): string {
		return $this->amount;
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

	public function manager_user_id(): ?int {
		return $this->manager_user_id;
	}

	public function order_id(): ?int {
		return $this->order_id;
	}

	public function buylist_submission_id(): ?int {
		return $this->buylist_submission_id;
	}

	public function location_id(): ?int {
		return $this->location_id;
	}

	public function offline_operation_id(): string {
		return $this->offline_operation_id;
	}

	public function reason(): string {
		return $this->reason;
	}

	/**
	 * @return array<string, mixed>
	 */
	public function metadata(): array {
		return $this->metadata;
	}

	public function has_manager_approval(): bool {
		return null !== $this->manager_user_id && $this->manager_user_id > 0;
	}
}
