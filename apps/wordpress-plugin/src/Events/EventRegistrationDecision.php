<?php
/**
 * Event registration decision value.
 *
 * @package TCGStorePlatform
 */

namespace TCGStorePlatform\Events;

final class EventRegistrationDecision {
	private bool $accepted;
	private string $code;
	private string $status;
	private string $payment_status;
	private string $message;
	private bool $waitlist;

	public function __construct(
		bool $accepted,
		string $code,
		string $status,
		string $payment_status,
		string $message,
		bool $waitlist = false
	) {
		$this->accepted       = $accepted;
		$this->code           = $code;
		$this->status         = $status;
		$this->payment_status = $payment_status;
		$this->message        = $message;
		$this->waitlist       = $waitlist;
	}

	public static function accepted( string $status, string $payment_status, string $message, bool $waitlist = false ): self {
		return new self( true, 'accepted', $status, $payment_status, $message, $waitlist );
	}

	public static function rejected( string $code, string $message ): self {
		return new self( false, $code, EventRegistrationStatus::FAILED, EventPaymentStatus::NOT_REQUIRED, $message );
	}

	public function is_accepted(): bool {
		return $this->accepted;
	}

	public function code(): string {
		return $this->code;
	}

	public function status(): string {
		return $this->status;
	}

	public function payment_status(): string {
		return $this->payment_status;
	}

	public function message(): string {
		return $this->message;
	}

	public function is_waitlist(): bool {
		return $this->waitlist;
	}
}
