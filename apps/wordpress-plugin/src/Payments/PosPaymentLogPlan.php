<?php
/**
 * Planned POS reconciliation and payment-provider log rows.
 *
 * @package TCGStorePlatform
 */

namespace TCGStorePlatform\Payments;

final class PosPaymentLogPlan {
	public const READY         = 'ready';
	public const PARTIAL_READY = 'partial_ready';
	public const FAILED        = 'failed';

	/**
	 * @param list<array<string, mixed>> $pos_sync_rows Row payloads for tcg_pos_sync_log.
	 * @param list<array<string, mixed>> $payment_provider_rows Row payloads for tcg_payment_provider_log.
	 * @param list<array<string, mixed>> $audit_events Audit-safe planning events.
	 * @param list<string> $errors Planning errors.
	 */
	private function __construct(
		private string $status,
		private string $code,
		private array $pos_sync_rows,
		private array $payment_provider_rows,
		private array $audit_events,
		private array $errors
	) {
	}

	/**
	 * @param list<array<string, mixed>> $pos_sync_rows Row payloads for tcg_pos_sync_log.
	 * @param list<array<string, mixed>> $payment_provider_rows Row payloads for tcg_payment_provider_log.
	 * @param list<array<string, mixed>> $audit_events Audit-safe planning events.
	 * @param list<string> $errors Planning errors.
	 */
	public static function ready(
		string $code,
		array $pos_sync_rows,
		array $payment_provider_rows,
		array $audit_events,
		array $errors = array()
	): self {
		return new self(
			array() === $errors ? self::READY : self::PARTIAL_READY,
			$code,
			$pos_sync_rows,
			$payment_provider_rows,
			$audit_events,
			$errors
		);
	}

	/**
	 * @param list<string> $errors Planning errors.
	 */
	public static function failed( string $code, array $errors ): self {
		return new self( self::FAILED, $code, array(), array(), array(), $errors );
	}

	public function status(): string {
		return $this->status;
	}

	public function code(): string {
		return $this->code;
	}

	/**
	 * @return list<array<string, mixed>>
	 */
	public function pos_sync_rows(): array {
		return $this->pos_sync_rows;
	}

	/**
	 * @return list<array<string, mixed>>
	 */
	public function payment_provider_rows(): array {
		return $this->payment_provider_rows;
	}

	/**
	 * @return list<array<string, mixed>>
	 */
	public function audit_events(): array {
		return $this->audit_events;
	}

	/**
	 * @return list<string>
	 */
	public function errors(): array {
		return $this->errors;
	}

	public function write_count(): int {
		return count( $this->pos_sync_rows ) + count( $this->payment_provider_rows );
	}
}
