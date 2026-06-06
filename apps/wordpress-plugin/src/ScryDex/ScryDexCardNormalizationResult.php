<?php
/**
 * Normalized ScryDex card mapping result.
 *
 * @package TCGStorePlatform
 */

namespace TCGStorePlatform\ScryDex;

final class ScryDexCardNormalizationResult {
	/**
	 * @param list<string> $errors Normalization error codes.
	 * @param array<string, mixed> $card Reference card row shape.
	 * @param array<string, mixed>|null $price Current price row shape.
	 */
	private function __construct(
		private bool $valid,
		private array $errors,
		private array $card,
		private ?array $price
	) {
	}

	/**
	 * @param array<string, mixed> $card Reference card row shape.
	 * @param array<string, mixed>|null $price Current price row shape.
	 */
	public static function valid( array $card, ?array $price ): self {
		return new self( true, array(), $card, $price );
	}

	/**
	 * @param list<string> $errors Normalization error codes.
	 */
	public static function invalid( array $errors ): self {
		return new self( false, $errors, array(), null );
	}

	public function is_valid(): bool {
		return $this->valid;
	}

	/**
	 * @return list<string>
	 */
	public function errors(): array {
		return $this->errors;
	}

	/**
	 * @return array<string, mixed>
	 */
	public function card(): array {
		return $this->card;
	}

	/**
	 * @return array<string, mixed>|null
	 */
	public function price(): ?array {
		return $this->price;
	}

	/**
	 * @return array<string, mixed>
	 */
	public function to_array(): array {
		return array(
			'valid'  => $this->valid,
			'errors' => $this->errors,
			'card'   => $this->card,
			'price'  => $this->price,
		);
	}
}
