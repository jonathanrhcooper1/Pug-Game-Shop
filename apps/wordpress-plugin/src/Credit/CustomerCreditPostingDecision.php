<?php
/**
 * Customer credit posting decision.
 *
 * @package TCGStorePlatform
 */

namespace TCGStorePlatform\Credit;

final class CustomerCreditPostingDecision {
	public function __construct(
		private bool $accepted,
		private string $code,
		private string $message,
		private string $entry_type,
		private string $signed_amount,
		private string $balance_before,
		private string $balance_after,
		private bool $manager_required
	) {
	}

	public static function accepted(
		string $entry_type,
		string $signed_amount,
		string $balance_before,
		string $balance_after,
		bool $manager_required
	): self {
		return new self(
			true,
			'accepted',
			'Customer credit ledger entry is valid.',
			$entry_type,
			$signed_amount,
			$balance_before,
			$balance_after,
			$manager_required
		);
	}

	public static function rejected( string $code, string $message, string $entry_type = '' ): self {
		return new self( false, $code, $message, $entry_type, '0.0000', '0.0000', '0.0000', false );
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

	public function entry_type(): string {
		return $this->entry_type;
	}

	public function signed_amount(): string {
		return $this->signed_amount;
	}

	public function balance_before(): string {
		return $this->balance_before;
	}

	public function balance_after(): string {
		return $this->balance_after;
	}

	public function manager_required(): bool {
		return $this->manager_required;
	}
}
