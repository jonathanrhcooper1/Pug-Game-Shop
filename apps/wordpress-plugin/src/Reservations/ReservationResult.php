<?php
/**
 * Exact inventory reservation result.
 *
 * @package TCGStorePlatform
 */

namespace TCGStorePlatform\Reservations;

final class ReservationResult {
	public function __construct(
		private bool $accepted,
		private string $code,
		private string $message,
		private bool $idempotent,
		private ?int $reservation_id
	) {
	}

	/**
	 * @param array<string, mixed> $reservation Reservation row.
	 */
	public static function reserved( array $reservation ): self {
		return new self(
			true,
			'reserved',
			'Inventory item was reserved.',
			false,
			isset( $reservation['reservation_id'] ) ? (int) $reservation['reservation_id'] : null
		);
	}

	/**
	 * @param array<string, mixed> $reservation Reservation row.
	 */
	public static function idempotent( array $reservation ): self {
		return new self(
			true,
			'idempotent_replay',
			'Inventory item was already reserved for this idempotency key.',
			true,
			isset( $reservation['reservation_id'] ) ? (int) $reservation['reservation_id'] : null
		);
	}

	/**
	 * @param array<string, mixed> $reservation Reservation row.
	 */
	public static function transitioned(
		string $code,
		string $message,
		array $reservation,
		bool $idempotent = false
	): self {
		return new self(
			true,
			$code,
			$message,
			$idempotent,
			isset( $reservation['reservation_id'] ) ? (int) $reservation['reservation_id'] : null
		);
	}

	public static function rejected( string $code, string $message ): self {
		return new self( false, $code, $message, false, null );
	}

	public function is_accepted(): bool {
		return $this->accepted;
	}

	public function code(): string {
		return $this->code;
	}

	public function message(): string {
		return $this->message;
	}

	public function is_idempotent(): bool {
		return $this->idempotent;
	}

	public function reservation_id(): ?int {
		return $this->reservation_id;
	}
}
