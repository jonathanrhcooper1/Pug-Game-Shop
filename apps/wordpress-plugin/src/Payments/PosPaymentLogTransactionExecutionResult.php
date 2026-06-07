<?php
/**
 * POS/payment log staged transaction execution result.
 *
 * @package TCGStorePlatform
 */

namespace TCGStorePlatform\Payments;

final class PosPaymentLogTransactionExecutionResult {
	public const STATUS_COMMITTED   = 'committed';
	public const STATUS_REJECTED    = 'rejected';
	public const STATUS_ROLLED_BACK = 'rolled_back';

	/**
	 * @param list<string>         $errors Transaction execution errors.
	 * @param list<string>         $transaction_commands Transaction commands attempted.
	 * @param array<string, mixed> $query_audit SQL query audit.
	 * @param array<string, mixed> $preflight_audit Transaction preflight audit.
	 */
	private function __construct(
		private string $status,
		private array $errors,
		private array $transaction_commands,
		private array $query_audit,
		private array $preflight_audit,
		private ?PosPaymentLogExecutionRepositoryResult $repository_result
	) {
	}

	/**
	 * @param list<string> $transaction_commands Transaction commands attempted.
	 */
	public static function committed(
		PosPaymentLogQueryBuildPlan $query_plan,
		PosPaymentLogTransactionPreflightResult $preflight_result,
		PosPaymentLogExecutionRepositoryResult $repository_result,
		array $transaction_commands
	): self {
		return new self(
			self::STATUS_COMMITTED,
			array(),
			array_values( $transaction_commands ),
			$query_plan->audit_payload(),
			$preflight_result->audit_payload(),
			$repository_result
		);
	}

	/**
	 * @param list<string> $errors Transaction execution errors.
	 * @param list<string> $transaction_commands Transaction commands attempted.
	 */
	public static function rejected(
		PosPaymentLogQueryBuildPlan $query_plan,
		PosPaymentLogTransactionPreflightResult $preflight_result,
		array $errors,
		array $transaction_commands = array(),
		?PosPaymentLogExecutionRepositoryResult $repository_result = null
	): self {
		return new self(
			self::STATUS_REJECTED,
			array_values( array_unique( $errors ) ),
			array_values( $transaction_commands ),
			$query_plan->audit_payload(),
			$preflight_result->audit_payload(),
			$repository_result
		);
	}

	/**
	 * @param list<string> $errors Transaction execution errors.
	 * @param list<string> $transaction_commands Transaction commands attempted.
	 */
	public static function rolled_back(
		PosPaymentLogQueryBuildPlan $query_plan,
		PosPaymentLogTransactionPreflightResult $preflight_result,
		PosPaymentLogExecutionRepositoryResult $repository_result,
		array $errors,
		array $transaction_commands
	): self {
		return new self(
			self::STATUS_ROLLED_BACK,
			array_values( array_unique( $errors ) ),
			array_values( $transaction_commands ),
			$query_plan->audit_payload(),
			$preflight_result->audit_payload(),
			$repository_result
		);
	}

	public function status(): string {
		return $this->status;
	}

	public function is_committed(): bool {
		return self::STATUS_COMMITTED === $this->status;
	}

	public function is_rejected(): bool {
		return self::STATUS_REJECTED === $this->status;
	}

	public function is_rolled_back(): bool {
		return self::STATUS_ROLLED_BACK === $this->status;
	}

	public function rows_affected(): int {
		return $this->is_committed() && null !== $this->repository_result
			? $this->repository_result->rows_affected()
			: 0;
	}

	public function repository_rows_affected(): int {
		return null !== $this->repository_result ? $this->repository_result->rows_affected() : 0;
	}

	public function transaction_started(): bool {
		return in_array( 'START TRANSACTION', $this->transaction_commands, true );
	}

	public function transaction_committed(): bool {
		return $this->is_committed() && in_array( 'COMMIT', $this->transaction_commands, true );
	}

	public function transaction_rolled_back(): bool {
		return $this->is_rolled_back() && in_array( 'ROLLBACK', $this->transaction_commands, true );
	}

	/**
	 * @return list<string>
	 */
	public function transaction_commands(): array {
		return $this->transaction_commands;
	}

	/**
	 * @return list<string>
	 */
	public function errors(): array {
		return $this->errors;
	}

	/**
	 * @return list<string>
	 */
	public function log_idempotency_keys(): array {
		if ( null !== $this->repository_result ) {
			return $this->repository_result->log_idempotency_keys();
		}

		$keys = array();
		foreach ( $this->preflight_audit['log_preflights'] ?? array() as $preflight ) {
			$key = trim( (string) ( $preflight['idempotency_key'] ?? '' ) );

			if ( '' !== $key ) {
				$keys[] = $key;
			}
		}

		return array_values( array_unique( $keys ) );
	}

	/**
	 * @return array<string, mixed>|null
	 */
	public function repository_audit(): ?array {
		return null !== $this->repository_result ? $this->repository_result->audit_payload() : null;
	}

	/**
	 * @return array<string, mixed>
	 */
	public function audit_payload(): array {
		return array(
			'action'                             => 'pos_payment_log_transaction_executor',
			'status'                             => $this->status,
			'is_committed'                       => $this->is_committed(),
			'is_rejected'                        => $this->is_rejected(),
			'is_rolled_back'                     => $this->is_rolled_back(),
			'transaction_started'                => $this->transaction_started(),
			'transaction_committed'              => $this->transaction_committed(),
			'transaction_rolled_back'            => $this->transaction_rolled_back(),
			'transaction_commands'               => $this->transaction_commands,
			'rows_affected'                      => $this->rows_affected(),
			'repository_rows_affected'           => $this->repository_rows_affected(),
			'log_idempotency_keys'               => $this->log_idempotency_keys(),
			'query'                              => $this->query_audit,
			'preflight'                          => $this->preflight_audit,
			'repository'                         => $this->repository_audit(),
			'pos_payment_log_transaction_execution_deferred' => ! $this->transaction_started(),
			'route_connected_writes_deferred'    => true,
			'provider_inventory_write_deferred'  => true,
			'payment_capture_execution_deferred' => true,
			'production_capture_deferred'        => true,
			'errors'                             => $this->errors,
		);
	}
}
