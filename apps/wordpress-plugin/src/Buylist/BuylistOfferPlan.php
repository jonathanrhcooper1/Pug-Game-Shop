<?php
/**
 * Planned buylist offer payloads.
 *
 * @package TCGStorePlatform
 */

namespace TCGStorePlatform\Buylist;

final class BuylistOfferPlan {
	/**
	 * @param array<string, mixed>        $offer_payload Planned submission-level offer payload.
	 * @param list<array<string, mixed>> $item_offers Planned item offer payloads.
	 * @param list<array<string, mixed>> $approval_requests Planned manager approval requests.
	 * @param list<string>               $errors Validation errors.
	 */
	private function __construct(
		private array $offer_payload,
		private array $item_offers,
		private array $approval_requests,
		private array $errors
	) {
	}

	/**
	 * @param array<string, mixed>        $offer_payload Planned submission-level offer payload.
	 * @param list<array<string, mixed>> $item_offers Planned item offer payloads.
	 * @param list<array<string, mixed>> $approval_requests Planned manager approval requests.
	 * @param list<string>               $errors Validation errors.
	 */
	public static function from_parts(
		array $offer_payload,
		array $item_offers,
		array $approval_requests,
		array $errors
	): self {
		return new self( $offer_payload, $item_offers, $approval_requests, $errors );
	}

	/**
	 * @return array<string, mixed>
	 */
	public function offer_payload(): array {
		return $this->offer_payload;
	}

	/**
	 * @return list<array<string, mixed>>
	 */
	public function item_offers(): array {
		return $this->item_offers;
	}

	/**
	 * @return list<array<string, mixed>>
	 */
	public function approval_requests(): array {
		return $this->approval_requests;
	}

	/**
	 * @return list<string>
	 */
	public function errors(): array {
		return $this->errors;
	}

	public function can_offer(): bool {
		return array() === $this->errors && array() !== $this->offer_payload;
	}

	public function requires_manager_approval(): bool {
		return array() !== $this->approval_requests;
	}
}
