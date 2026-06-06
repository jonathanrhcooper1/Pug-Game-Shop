<?php
/**
 * Manager override authorization decision.
 *
 * @package TCGStorePlatform
 */

namespace TCGStorePlatform\Overrides;

final class ManagerOverrideDecision {
	public function __construct(
		private bool $accepted,
		private string $code,
		private string $message,
		private bool $requires_override_row
	) {
	}

	public static function accepted( string $code, string $message, bool $requires_override_row ): self {
		return new self( true, $code, $message, $requires_override_row );
	}

	public static function rejected( string $code, string $message ): self {
		return new self( false, $code, $message, false );
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

	public function requires_override_row(): bool {
		return $this->requires_override_row;
	}
}
