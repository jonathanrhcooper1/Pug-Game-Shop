<?php
/**
 * Customer credit ledger posting result.
 *
 * @package TCGStorePlatform
 */

namespace TCGStorePlatform\Credit;

final class CustomerCreditPostingResult {
	public function __construct(
		private bool $accepted,
		private string $code,
		private string $message,
		private bool $idempotent,
		private ?int $ledger_entry_id,
		private string $balance_after
	) {
	}

	/**
	 * @param array<string, mixed> $entry Ledger row.
	 */
	public static function posted( array $entry, CustomerCreditPostingDecision $decision ): self {
		return new self(
			true,
			'posted',
			'Customer credit ledger entry was posted.',
			false,
			isset( $entry['credit_ledger_id'] ) ? (int) $entry['credit_ledger_id'] : null,
			$decision->balance_after()
		);
	}

	/**
	 * @param array<string, mixed> $entry Ledger row.
	 */
	public static function idempotent( array $entry ): self {
		return new self(
			true,
			'idempotent_replay',
			'Customer credit ledger entry was already posted for this idempotency key.',
			true,
			isset( $entry['credit_ledger_id'] ) ? (int) $entry['credit_ledger_id'] : null,
			(string) ( $entry['balance_after'] ?? '0.0000' )
		);
	}

	public static function rejected( string $code, string $message ): self {
		return new self( false, $code, $message, false, null, '0.0000' );
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

	public function ledger_entry_id(): ?int {
		return $this->ledger_entry_id;
	}

	public function balance_after(): string {
		return $this->balance_after;
	}
}
