<?php
/**
 * Planned ScryDex sync page work.
 *
 * @package TCGStorePlatform
 */

namespace TCGStorePlatform\ScryDex;

final class ScryDexSyncPagePlan {
	public const SUCCESS         = 'success';
	public const PARTIAL_SUCCESS = 'partial_success';
	public const FAILED          = 'failed';

	/**
	 * @param list<array<string, mixed>> $reference_rows Normalized reference rows.
	 * @param list<array<string, mixed>> $price_rows Normalized price rows.
	 * @param list<array<string, mixed>> $variant_rows Normalized variant rows.
	 * @param list<array<string, mixed>> $price_point_rows Normalized provider price-point rows.
	 * @param list<array<string, mixed>> $errors Normalization or provider errors.
	 */
	private function __construct(
		private string $status,
		private array $reference_rows,
		private array $price_rows,
		private array $variant_rows,
		private array $price_point_rows,
		private array $errors,
		private ?ScryDexSyncCheckpoint $next_checkpoint,
		private bool $retryable,
		private ?string $error_code
	) {
	}

	/**
	 * @param list<array<string, mixed>> $reference_rows Normalized reference rows.
	 * @param list<array<string, mixed>> $price_rows Normalized price rows.
	 * @param list<array<string, mixed>> $variant_rows Normalized variant rows.
	 * @param list<array<string, mixed>> $price_point_rows Normalized provider price-point rows.
	 * @param list<array<string, mixed>> $errors Normalization errors.
	 */
	public static function planned(
		array $reference_rows,
		array $price_rows,
		array $errors,
		ScryDexSyncCheckpoint $next_checkpoint,
		array $variant_rows = array(),
		array $price_point_rows = array()
	): self {
		return new self(
			array() === $errors ? self::SUCCESS : self::PARTIAL_SUCCESS,
			$reference_rows,
			$price_rows,
			array_values( $variant_rows ),
			array_values( $price_point_rows ),
			$errors,
			$next_checkpoint,
			false,
			null
		);
	}

	public static function failed( string $error_code, bool $retryable ): self {
		return new self(
			self::FAILED,
			array(),
			array(),
			array(),
			array(),
			array(
				array(
					'errors' => array( $error_code ),
				),
			),
			null,
			$retryable,
			$error_code
		);
	}

	public function status(): string {
		return $this->status;
	}

	/**
	 * @return list<array<string, mixed>>
	 */
	public function reference_rows(): array {
		return $this->reference_rows;
	}

	/**
	 * @return list<array<string, mixed>>
	 */
	public function price_rows(): array {
		return $this->price_rows;
	}

	/**
	 * @return list<array<string, mixed>>
	 */
	public function variant_rows(): array {
		return $this->variant_rows;
	}

	/**
	 * @return list<array<string, mixed>>
	 */
	public function price_point_rows(): array {
		return $this->price_point_rows;
	}

	/**
	 * @return list<array<string, mixed>>
	 */
	public function errors(): array {
		return $this->errors;
	}

	public function next_checkpoint(): ?ScryDexSyncCheckpoint {
		return $this->next_checkpoint;
	}

	public function retryable(): bool {
		return $this->retryable;
	}

	public function error_code(): ?string {
		return $this->error_code;
	}
}
