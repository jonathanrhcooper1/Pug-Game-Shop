<?php
/**
 * Planned ScryDex database persistence work.
 *
 * @package TCGStorePlatform
 */

namespace TCGStorePlatform\ScryDex;

final class ScryDexPersistencePlan {
	public const READY         = 'ready';
	public const PARTIAL_READY = 'partial_ready';
	public const FAILED        = 'failed';

	/**
	 * @param list<array<string, mixed>> $reference_inserts New reference-card rows.
	 * @param list<array<string, mixed>> $reference_updates Changed reference-card rows.
	 * @param list<string> $unchanged_reference_keys Provider keys with no reference-card changes.
	 * @param list<array<string, mixed>> $reference_variant_upserts Reference variant upsert rows.
	 * @param list<array<string, mixed>> $price_observations Current provider price observations.
	 * @param list<array<string, mixed>> $price_points Provider price-point rows.
	 * @param list<array<string, mixed>> $errors Page or persistence planning errors.
	 */
	private function __construct(
		private string $status,
		private array $reference_inserts,
		private array $reference_updates,
		private array $unchanged_reference_keys,
		private array $reference_variant_upserts,
		private array $price_observations,
		private array $price_points,
		private array $errors,
		private ?ScryDexSyncCheckpoint $next_checkpoint,
		private bool $retryable,
		private ?string $error_code
	) {
	}

	/**
	 * @param list<array<string, mixed>> $reference_inserts New reference-card rows.
	 * @param list<array<string, mixed>> $reference_updates Changed reference-card rows.
	 * @param list<string> $unchanged_reference_keys Provider keys with no reference-card changes.
	 * @param list<array<string, mixed>> $reference_variant_upserts Reference variant upsert rows.
	 * @param list<array<string, mixed>> $price_observations Current provider price observations.
	 * @param list<array<string, mixed>> $price_points Provider price-point rows.
	 * @param list<array<string, mixed>> $errors Page or persistence planning errors.
	 */
	public static function ready(
		array $reference_inserts,
		array $reference_updates,
		array $unchanged_reference_keys,
		array $reference_variant_upserts,
		array $price_observations,
		array $price_points,
		array $errors,
		?ScryDexSyncCheckpoint $next_checkpoint
	): self {
		return new self(
			array() === $errors ? self::READY : self::PARTIAL_READY,
			$reference_inserts,
			$reference_updates,
			$unchanged_reference_keys,
			array_values( $reference_variant_upserts ),
			$price_observations,
			array_values( $price_points ),
			$errors,
			$next_checkpoint,
			false,
			null
		);
	}

	/**
	 * @param list<array<string, mixed>> $errors Page or provider errors.
	 */
	public static function failed( string $error_code, bool $retryable, array $errors ): self {
		return new self(
			self::FAILED,
			array(),
			array(),
			array(),
			array(),
			array(),
			array(),
			$errors,
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
	public function reference_inserts(): array {
		return $this->reference_inserts;
	}

	/**
	 * @return list<array<string, mixed>>
	 */
	public function reference_updates(): array {
		return $this->reference_updates;
	}

	/**
	 * @return list<string>
	 */
	public function unchanged_reference_keys(): array {
		return $this->unchanged_reference_keys;
	}

	/**
	 * @return list<array<string, mixed>>
	 */
	public function reference_variant_upserts(): array {
		return $this->reference_variant_upserts;
	}

	/**
	 * @return list<array<string, mixed>>
	 */
	public function price_observations(): array {
		return $this->price_observations;
	}

	/**
	 * @return list<array<string, mixed>>
	 */
	public function price_points(): array {
		return $this->price_points;
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

	public function reference_write_count(): int {
		return count( $this->reference_inserts ) + count( $this->reference_updates );
	}

	public function reference_variant_write_count(): int {
		return count( $this->reference_variant_upserts );
	}

	public function price_point_write_count(): int {
		return count( $this->price_points );
	}
}
