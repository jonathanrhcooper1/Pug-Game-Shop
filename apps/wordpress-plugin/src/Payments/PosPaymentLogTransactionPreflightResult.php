<?php
/**
 * POS/payment log transaction preflight result.
 *
 * @package TCGStorePlatform
 */

namespace TCGStorePlatform\Payments;

final class PosPaymentLogTransactionPreflightResult {
	public const STATUS_BLOCKED  = 'blocked';
	public const STATUS_READY    = 'ready';
	public const STATUS_REJECTED = 'rejected';

	/**
	 * @param list<array<string, mixed>> $log_preflights Per-log preflight results.
	 * @param list<string>              $block_reasons Preflight block reasons.
	 * @param list<string>              $errors Preflight errors.
	 * @param array<string, mixed>      $repository_audit Repository staging audit.
	 * @param array<string, mixed>      $execution_audit Execution gate audit.
	 */
	private function __construct(
		private string $status,
		private array $log_preflights,
		private array $block_reasons,
		private array $errors,
		private array $repository_audit,
		private array $execution_audit
	) {
	}

	/**
	 * @param list<array<string, mixed>> $log_preflights Per-log preflight results.
	 * @param list<string>              $block_reasons Preflight block reasons.
	 */
	public static function blocked(
		PosPaymentLogRepositoryResult $repository_result,
		PosPaymentLogRepositoryExecutionResult $execution_result,
		array $log_preflights,
		array $block_reasons
	): self {
		return new self(
			self::STATUS_BLOCKED,
			array_values( $log_preflights ),
			array_values( array_unique( $block_reasons ) ),
			array(),
			$repository_result->audit_payload(),
			$execution_result->audit_payload()
		);
	}

	/**
	 * @param list<array<string, mixed>> $log_preflights Per-log preflight results.
	 */
	public static function ready(
		PosPaymentLogRepositoryResult $repository_result,
		PosPaymentLogRepositoryExecutionResult $execution_result,
		array $log_preflights
	): self {
		return new self(
			self::STATUS_READY,
			array_values( $log_preflights ),
			array(),
			array(),
			$repository_result->audit_payload(),
			$execution_result->audit_payload()
		);
	}

	/**
	 * @param list<string> $errors Preflight errors.
	 */
	public static function rejected(
		PosPaymentLogRepositoryResult $repository_result,
		PosPaymentLogRepositoryExecutionResult $execution_result,
		array $errors
	): self {
		return new self(
			self::STATUS_REJECTED,
			array(),
			array(),
			array_values( array_unique( $errors ) ),
			$repository_result->audit_payload(),
			$execution_result->audit_payload()
		);
	}

	public function status(): string {
		return $this->status;
	}

	public function is_blocked(): bool {
		return self::STATUS_BLOCKED === $this->status;
	}

	public function is_ready(): bool {
		return self::STATUS_READY === $this->status;
	}

	public function is_rejected(): bool {
		return self::STATUS_REJECTED === $this->status;
	}

	/**
	 * @return list<array<string, mixed>>
	 */
	public function log_preflights(): array {
		return $this->log_preflights;
	}

	/**
	 * @return list<string>
	 */
	public function block_reasons(): array {
		return $this->block_reasons;
	}

	/**
	 * @return list<string>
	 */
	public function errors(): array {
		return $this->errors;
	}

	public function total_log_count(): int {
		return count( $this->log_preflights );
	}

	public function pos_sync_log_count(): int {
		return $this->count_by_log_type( 'pos_sync' );
	}

	public function payment_provider_log_count(): int {
		return $this->count_by_log_type( 'payment_provider' );
	}

	public function ready_log_count(): int {
		return $this->count_by_status( 'ready' );
	}

	public function blocked_log_count(): int {
		return $this->count_by_status( 'blocked' );
	}

	public function rows_affected(): int {
		return 0;
	}

	/**
	 * @return list<string>
	 */
	public function log_idempotency_keys(): array {
		$keys = array();

		foreach ( $this->log_preflights as $preflight ) {
			$key = trim( (string) ( $preflight['idempotency_key'] ?? '' ) );

			if ( '' !== $key ) {
				$keys[] = $key;
			}
		}

		return array_values( array_unique( $keys ) );
	}

	/**
	 * @return array<string, mixed>
	 */
	public function audit_payload(): array {
		return array(
			'action'                                    => 'pos_payment_log_transaction_preflight',
			'status'                                    => $this->status,
			'is_blocked'                                => $this->is_blocked(),
			'is_ready'                                  => $this->is_ready(),
			'is_rejected'                               => $this->is_rejected(),
			'total_log_count'                           => $this->total_log_count(),
			'pos_sync_log_count'                        => $this->pos_sync_log_count(),
			'payment_provider_log_count'                => $this->payment_provider_log_count(),
			'ready_log_count'                           => $this->ready_log_count(),
			'blocked_log_count'                         => $this->blocked_log_count(),
			'log_idempotency_keys'                      => $this->log_idempotency_keys(),
			'rows_affected'                             => $this->rows_affected(),
			'block_reasons'                             => $this->block_reasons,
			'errors'                                    => $this->errors,
			'log_preflights'                            => $this->log_preflights,
			'repository'                                => $this->repository_audit,
			'execution_gate'                            => $this->execution_audit,
			'transaction_execution_deferred'            => true,
			'pos_sync_write_execution_deferred'         => true,
			'payment_provider_write_execution_deferred' => true,
			'route_connected_writes_deferred'           => true,
			'provider_inventory_write_deferred'         => true,
			'payment_capture_execution_deferred'        => true,
			'production_capture_deferred'               => true,
		);
	}

	private function count_by_status( string $status ): int {
		$count = 0;

		foreach ( $this->log_preflights as $preflight ) {
			if ( $status === (string) ( $preflight['preflight_status'] ?? '' ) ) {
				++$count;
			}
		}

		return $count;
	}

	private function count_by_log_type( string $log_type ): int {
		$count = 0;

		foreach ( $this->log_preflights as $preflight ) {
			if ( $log_type === (string) ( $preflight['log_type'] ?? '' ) ) {
				++$count;
			}
		}

		return $count;
	}
}
