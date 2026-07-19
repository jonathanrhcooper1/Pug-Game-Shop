<?php
/**
 * Planned expired reservation cleanup work.
 *
 * @package TCGStorePlatform
 */

namespace TCGStorePlatform\Reservations;

final class ReservationExpiryPlan {
	/**
	 * @param list<array<string, mixed>> $expired_releases Expired active reservations to release.
	 * @param list<array<string, mixed>> $skipped_rows Non-expired or inactive rows skipped.
	 * @param list<array<string, mixed>> $errors Invalid rows that could not be planned.
	 */
	private function __construct(
		private array $expired_releases,
		private array $skipped_rows,
		private array $errors
	) {
	}

	/**
	 * @param list<array<string, mixed>> $expired_releases Expired active reservations to release.
	 * @param list<array<string, mixed>> $skipped_rows Non-expired or inactive rows skipped.
	 * @param list<array<string, mixed>> $errors Invalid rows that could not be planned.
	 */
	public static function from_parts( array $expired_releases, array $skipped_rows, array $errors ): self {
		return new self( $expired_releases, $skipped_rows, $errors );
	}

	/**
	 * @return list<array<string, mixed>>
	 */
	public function expired_releases(): array {
		return $this->expired_releases;
	}

	/**
	 * @return list<array<string, mixed>>
	 */
	public function skipped_rows(): array {
		return $this->skipped_rows;
	}

	/**
	 * @return list<array<string, mixed>>
	 */
	public function errors(): array {
		return $this->errors;
	}

	public function release_count(): int {
		return count( $this->expired_releases );
	}

	public function has_work(): bool {
		return array() !== $this->expired_releases;
	}
}
