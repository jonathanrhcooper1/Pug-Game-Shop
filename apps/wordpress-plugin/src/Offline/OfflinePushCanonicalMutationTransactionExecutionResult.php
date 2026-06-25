<?php
/**
 * Offline push canonical mutation transaction execution result.
 *
 * @package TCGStorePlatform
 */

namespace TCGStorePlatform\Offline;

final class OfflinePushCanonicalMutationTransactionExecutionResult {
	public const STATUS_BLOCKED  = 'blocked';
	public const STATUS_EXECUTED = 'executed';
	public const STATUS_REJECTED = 'rejected';

	/**
	 * @param list<array<string, mixed>> $mutation_results Per-mutation execution rows.
	 * @param list<string>              $block_reasons Execution block reasons.
	 * @param list<string>              $errors Execution errors.
	 * @param list<string>              $transaction_commands Transaction commands attempted.
	 * @param array<string, mixed>      $query_audit Canonical mutation SQL query audit.
	 * @param array<string, mixed>      $preflight_audit Transaction preflight audit.
	 */
	private function __construct(
		private string $status,
		private array $mutation_results,
		private array $block_reasons,
		private array $errors,
		private array $transaction_commands,
		private array $query_audit,
		private array $preflight_audit
	) {
	}

	/**
	 * @param list<string> $block_reasons Execution block reasons.
	 */
	public static function blocked(
		OfflinePushCanonicalMutationQueryBuildPlan $query_plan,
		OfflinePushCanonicalMutationTransactionPreflightResult $preflight_result,
		array $block_reasons
	): self {
		return new self(
			self::STATUS_BLOCKED,
			array(),
			array_values( array_unique( $block_reasons ) ),
			array(),
			array(),
			$query_plan->audit_payload(),
			$preflight_result->audit_payload()
		);
	}

	/**
	 * @param list<array<string, mixed>> $mutation_results Per-mutation execution rows.
	 * @param list<string>              $transaction_commands Transaction commands attempted.
	 */
	public static function executed(
		OfflinePushCanonicalMutationQueryBuildPlan $query_plan,
		OfflinePushCanonicalMutationTransactionPreflightResult $preflight_result,
		array $mutation_results,
		array $transaction_commands
	): self {
		return new self(
			self::STATUS_EXECUTED,
			array_values( $mutation_results ),
			array(),
			array(),
			array_values( $transaction_commands ),
			$query_plan->audit_payload(),
			$preflight_result->audit_payload()
		);
	}

	/**
	 * @param list<array<string, mixed>> $mutation_results Per-mutation execution rows.
	 * @param list<string>              $errors Execution errors.
	 * @param list<string>              $transaction_commands Transaction commands attempted.
	 */
	public static function rejected(
		OfflinePushCanonicalMutationQueryBuildPlan $query_plan,
		OfflinePushCanonicalMutationTransactionPreflightResult $preflight_result,
		array $errors,
		array $mutation_results = array(),
		array $transaction_commands = array()
	): self {
		return new self(
			self::STATUS_REJECTED,
			array_values( $mutation_results ),
			array(),
			array_values( array_unique( $errors ) ),
			array_values( $transaction_commands ),
			$query_plan->audit_payload(),
			$preflight_result->audit_payload()
		);
	}

	public function status(): string {
		return $this->status;
	}

	public function is_blocked(): bool {
		return self::STATUS_BLOCKED === $this->status;
	}

	public function is_executed(): bool {
		return self::STATUS_EXECUTED === $this->status;
	}

	public function is_rejected(): bool {
		return self::STATUS_REJECTED === $this->status;
	}

	public function rows_affected(): int {
		$rows = 0;

		foreach ( $this->mutation_results as $result ) {
			$rows += $this->non_negative_int( $result['rows_affected'] ?? 0 );
		}

		return $rows;
	}

	public function mutation_query_count(): int {
		return count( $this->mutation_results );
	}

	/**
	 * @return list<string>
	 */
	public function mutation_operation_ids(): array {
		$ids = array();

		foreach ( $this->mutation_results as $result ) {
			$operation_id = trim( (string) ( $result['client_operation_id'] ?? '' ) );

			if ( '' !== $operation_id ) {
				$ids[] = $operation_id;
			}
		}

		return array_values( array_unique( $ids ) );
	}

	/**
	 * @return list<array<string, mixed>>
	 */
	public function mutation_results(): array {
		return $this->mutation_results;
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

	/**
	 * @return list<string>
	 */
	public function transaction_commands(): array {
		return $this->transaction_commands;
	}

	/**
	 * @return array<string, mixed>
	 */
	public function audit_payload(): array {
		return array(
			'action'                                => 'offline_push_canonical_mutation_transaction_execution',
			'status'                                => $this->status,
			'is_blocked'                            => $this->is_blocked(),
			'is_executed'                           => $this->is_executed(),
			'is_rejected'                           => $this->is_rejected(),
			'mutation_query_count'                  => $this->mutation_query_count(),
			'mutation_operation_ids'                => $this->mutation_operation_ids(),
			'rows_affected'                         => $this->rows_affected(),
			'block_reasons'                         => $this->block_reasons,
			'errors'                                => $this->errors,
			'transaction_commands'                  => $this->transaction_commands,
			'mutation_results'                      => $this->mutation_results,
			'query'                                 => $this->query_audit,
			'preflight'                             => $this->preflight_audit,
			'inventory_write_execution_deferred'    => ! $this->is_executed(),
			'event_registration_write_deferred'     => true,
			'customer_credit_ledger_write_deferred' => true,
			'route_connected_writes_deferred'       => ! $this->is_executed(),
			'queue_replay_deferred'                 => true,
		);
	}

	private function non_negative_int( mixed $value ): int {
		if ( is_int( $value ) && 0 <= $value ) {
			return $value;
		}

		if ( is_string( $value ) && 1 === preg_match( '/^\d+$/', $value ) ) {
			return (int) $value;
		}

		return 0;
	}
}
