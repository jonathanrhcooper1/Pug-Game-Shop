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
	 * @param list<array<string, mixed>> $variants Reference variant row shapes.
	 */
	private function __construct(
		private bool $valid,
		private array $errors,
		private array $card,
		private ?array $price,
		private array $variants
	) {
	}

	/**
	 * @param array<string, mixed> $card Reference card row shape.
	 * @param array<string, mixed>|null $price Current price row shape.
	 * @param list<array<string, mixed>> $variants Reference variant row shapes.
	 */
	public static function valid( array $card, ?array $price, array $variants = array() ): self {
		return new self( true, array(), $card, $price, array_values( $variants ) );
	}

	/**
	 * @param list<string> $errors Normalization error codes.
	 */
	public static function invalid( array $errors ): self {
		return new self( false, $errors, array(), null, array() );
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
	 * @return list<array<string, mixed>>
	 */
	public function variants(): array {
		return $this->variants;
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
			'variants' => $this->variants,
		);
	}
}
